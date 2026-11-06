from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List
from app.database.connection import get_db
from app.auth.auth import get_current_user
from app.models.db_models import (
    User,
    Participant,
    Assessment,
    InterventionRecommendation,
    AuditLog,
    RiskLevel,
    RiskTrajectory,
    UserRole,
)
from app.schemas.schemas import AssessmentCreate, AssessmentOut, ReviewRequest, SimulationRequest
from app.config import settings
import logging
import csv
import json
from pathlib import Path

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/assessments", tags=["Assessments"])


def log_action(db, user_id, action, resource_type=None, resource_id=None, details=None):
    log = AuditLog(
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        details=details or {},
        status="success",
    )
    db.add(log)
    db.commit()


def participant_to_features(p: Participant) -> dict:
    return {
        "gender": p.gender,
        "race": p.race,
        "age": p.age or 30,
        "prior_arrests": p.prior_arrests or 0,
        "prior_felonies": p.prior_felonies or 0,
        "age_first_arrest": p.age_first_arrest or 18,
        "arrest_frequency": p.arrest_frequency or 0.0,
        "sanctions_count": p.sanctions_count or 0,
        "incentives_count": p.incentives_count or 0,
        "risk_assessment_score": p.risk_assessment_score or 5.0,
        "trauma_score": p.trauma_score or 0.0,
        "ace_score": p.ace_score or 0,
        "monthly_income": p.monthly_income or 1500.0,
        "num_dependents": p.num_dependents or 0,
        "employment_status": p.employment_status or "Unknown",
        "education_level": p.education_level or "High School",
        "housing_status": p.housing_status or "Stable",
        "marital_status": p.marital_status or "Single",
        "substance_use_frequency": p.substance_use_frequency or "Never",
        "program_attendances": p.program_attendances or 0,
        "program_unexcused_absences": p.program_unexcused_absences or 0,
        "percent_days_employed": p.percent_days_employed or 0.0,
        "drug_tests_positive_count": p.drug_tests_positive_count or 0,
    }


@router.post("", response_model=AssessmentOut)
def create_assessment(
    body: AssessmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    participant = (
        db.query(Participant).filter(Participant.id == body.participant_id).first()
    )
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")

    assessment = Assessment(
        participant_id=participant.id,
        assessor_id=current_user.id,
        assessment_date=datetime.utcnow(),
    )
    db.add(assessment)
    db.commit()
    db.refresh(assessment)

    log_action(
        db,
        current_user.id,
        "ASSESSMENT_CREATED",
        "assessment",
        str(assessment.id),
        {"participant_id": participant.id},
    )
    return assessment


@router.post("/{assessment_id}/predict", response_model=AssessmentOut)
def run_prediction(
    assessment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    participant = (
        db.query(Participant)
        .filter(Participant.id == assessment.participant_id)
        .first()
    )
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")

    features = participant_to_features(participant)
    prior_assessment = (
        db.query(Assessment)
        .filter(Assessment.participant_id == assessment.participant_id,
                Assessment.id != assessment.id,
                Assessment.recidivism_probability.isnot(None))
        .order_by(Assessment.assessment_date.desc(), Assessment.id.desc())
        .first()
    )

    # Run ML prediction
    try:
        from app.ml.pipeline import predict

        result = predict(features, model_name=(
            "catboost_dynamic_champion" if prior_assessment else "catboost_intake_champion"
        ))
    except FileNotFoundError:
        raise HTTPException(
            status_code=503,
            detail="Model has not been trained yet. Please run the training script first.",
        )
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        raise HTTPException(
            status_code=500, detail="Unable to generate assessment. Please try again."
        )
    expected_model = "catboost_dynamic_champion" if prior_assessment else "catboost_intake_champion"
    if result["model_name"] != expected_model:
        raise HTTPException(status_code=503, detail="The required champion model is unavailable")

    # Run SHAP
    try:
        from app.xai.shap_explainer import compute_shap_values

        shap_result = compute_shap_values(features, model_name=expected_model)
        top_features = shap_result.get("top_features", [])
        shap_values = shap_result.get("all_shap_values", {})
    except Exception as e:
        logger.warning(f"SHAP computation failed: {e}")
        top_features = []
        shap_values = {}

    # Run GenAI / rule-based recommendations
    try:
        from app.ai.genai_service import generate_recommendations

        recs, source = generate_recommendations(
            features, top_features, result,
            openai_api_key=settings.OPENAI_API_KEY,
            groq_api_key=settings.GROQ_API_KEY,
            groq_model=settings.GROQ_MODEL,
            openai_model=settings.OPENAI_MODEL,
        )
    except Exception as e:
        logger.error(f"Recommendation generation error: {e}")
        recs, source = [], "rule_based"

    # Update assessment
    assessment.recidivism_probability = result["probability"]
    assessment.risk_level = RiskLevel(result["risk_level"])
    assessment.model_version = f"{result['model_name']}_v1"
    assessment.model_confidence = result["probability"]
    assessment.shap_values = shap_values
    assessment.top_features = top_features
    assessment.narrative_generated_by = source
    assessment.narrative = (
        f"The {'dynamic' if prior_assessment else 'intake'} assessment estimates a "
        f"{result['probability'] * 100:.1f}% probability of recorded recidivism within three years. "
        f"Risk tier: {result['risk_level']}. "
        + " ".join(
            f"{rec.get('title', 'Intervention')}: {rec.get('why_relevant', '')} "
            f"{rec.get('suggested_action', '')}" for rec in recs[:3]
        )
    )
    assessment.assessment_stage = "DYNAMIC" if prior_assessment else "INTAKE"
    assessment.delta_risk = (
        result["probability"] - prior_assessment.recidivism_probability
        if prior_assessment else 0.0
    )
    assessment.trajectory_flag = (
        "IMPROVING" if assessment.delta_risk < -0.05 else
        "ALERT" if assessment.delta_risk > 0.05 else
        "STABLE" if prior_assessment else "BASELINE"
    )
    trajectory = db.query(RiskTrajectory).filter(
        RiskTrajectory.assessment_id == assessment.id
    ).first()
    if trajectory is None:
        trajectory = RiskTrajectory(participant_id=participant.id, assessment_id=assessment.id)
        db.add(trajectory)
    trajectory.model_stage = assessment.assessment_stage
    trajectory.risk_probability = result["probability"]
    trajectory.risk_level = result["risk_level"]
    trajectory.delta_risk = assessment.delta_risk
    trajectory.trajectory_flag = assessment.trajectory_flag
    participant.current_risk_probability = result["probability"]
    participant.current_risk_level = result["risk_level"]
    # Replace recommendations when an assessment is predicted again.
    db.query(InterventionRecommendation).filter(
        InterventionRecommendation.assessment_id == assessment.id
    ).delete(synchronize_session=False)
    for i, rec in enumerate(recs):
        intervention = InterventionRecommendation(
            assessment_id=assessment.id,
            title=rec.get("title", "Intervention"),
            why_relevant=rec.get("why_relevant", ""),
            suggested_action=rec.get("suggested_action", ""),
            priority=i + 1,
            generated_by=source,
        )
        db.add(intervention)
    db.commit()
    db.refresh(assessment)

    log_action(
        db,
        current_user.id,
        "PREDICTION_GENERATED",
        "assessment",
        str(assessment_id),
        {"risk_level": result["risk_level"], "probability": result["probability"]},
    )
    log_action(db, current_user.id, "SHAP_GENERATED", "assessment", str(assessment_id))
    log_action(
        db,
        current_user.id,
        "RECOMMENDATION_GENERATED",
        "assessment",
        str(assessment_id),
        {"source": source},
    )

    return assessment


@router.post("/{assessment_id}/simulate")
def simulate_assessment(
    assessment_id: int,
    body: SimulationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if assessment is None:
        raise HTTPException(status_code=404, detail="Assessment not found")
    participant = db.query(Participant).filter(Participant.id == assessment.participant_id).first()
    if participant is None:
        raise HTTPException(status_code=404, detail="Participant not found")
    if assessment.recidivism_probability is None:
        raise HTTPException(status_code=409, detail="Run the assessment prediction first")
    if assessment.assessment_stage != "DYNAMIC":
        raise HTTPException(status_code=409, detail="Simulation requires a dynamic assessment")
    if not body.model_dump(exclude_none=True):
        raise HTTPException(status_code=422, detail="Provide at least one scenario change")

    from app.ml.pipeline import predict
    features = participant_to_features(participant)
    baseline = predict(features, model_name="catboost_dynamic_champion")
    changes = body.model_dump(exclude_none=True)
    for name in ("program_attendances", "program_unexcused_absences", "percent_days_employed", "jobs_per_year"):
        if name in changes:
            features[name] = changes[name]
    if body.drug_tests_clean is True:
        features["drug_tests_positive_count"] = 0
    simulated = predict(features, model_name="catboost_dynamic_champion")
    if baseline["model_name"] != "catboost_dynamic_champion" or simulated["model_name"] != baseline["model_name"]:
        raise HTTPException(status_code=503, detail="Dynamic model is unavailable")
    delta = round(simulated["probability"] - baseline["probability"], 4)
    risk = simulated["probability"]
    level = "LOW" if risk < 0.35 else "HIGH" if risk > 0.65 else "MEDIUM"
    recommendation = (
        f"The modeled scenario changes predicted recidivism probability by {delta * 100:+.1f} percentage points. "
        "This is an association, not a proven intervention effect."
    )
    result = {
        "baseline_risk": baseline["probability"], "simulated_risk": risk,
        "delta_risk": delta, "simulated_risk_level": level,
        "recommendation": recommendation,
    }
    existing = assessment.simulated_scenarios or []
    scenarios = [existing] if isinstance(existing, dict) else list(existing)
    scenarios.append({"inputs": changes, **result, "created_at": datetime.utcnow().isoformat()})
    assessment.simulated_scenarios = scenarios
    db.add(AuditLog(user_id=current_user.id, action="SIMULATION_EXECUTED",
                    resource_type="assessment", resource_id=str(assessment.id),
                    details={"inputs": changes, **result}, status="success"))
    db.commit()
    log_path = Path(__file__).resolve().parents[2] / "logs" / "decision_log.csv"
    log_path.parent.mkdir(parents=True, exist_ok=True)
    with log_path.open("a", newline="", encoding="utf-8") as stream:
        writer = csv.writer(stream)
        if stream.tell() == 0:
            writer.writerow(["timestamp", "participant_id", "current_risk_pct", "recommended_scenario",
                             "simulated_risk_pct", "risk_change_pp", "practitioner_decision", "review_notes"])
        writer.writerow([
            datetime.utcnow().isoformat(), participant.participant_id,
            f"{baseline['probability'] * 100:.2f}%",
            f"Assessment {assessment.id}: {json.dumps(changes, sort_keys=True)}",
            f"{risk * 100:.2f}%", f"{delta * 100:+.2f} pp", "SIMULATED",
            "Research prototype; no clinical effect established",
        ])
    return result


@router.get("/participant/{participant_id}", response_model=List[AssessmentOut])
def get_participant_assessments(
    participant_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Assessment)
        .filter(Assessment.participant_id == participant_id)
        .order_by(Assessment.assessment_date.desc())
        .all()
    )


@router.get("/{assessment_id}", response_model=AssessmentOut)
def get_assessment(
    assessment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    return assessment


@router.post("/{assessment_id}/review", response_model=AssessmentOut)
def submit_review(
    assessment_id: int,
    body: ReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in (UserRole.JUDGE, UserRole.CASE_MANAGER, UserRole.ADMIN):
        raise HTTPException(
            status_code=403,
            detail="Forbidden: Only Presiding Judges, Case Managers, or Administrators may record official judicial reviews.",
        )

    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")

    assessment.reviewer_decision = body.decision
    assessment.reviewer_notes = body.notes
    assessment.reviewed_at = datetime.utcnow()
    assessment.reviewed_by = current_user.id
    db.commit()
    db.refresh(assessment)

    log_action(
        db,
        current_user.id,
        "REVIEW_SUBMITTED",
        "assessment",
        str(assessment_id),
        {"decision": body.decision},
    )
    return assessment


@router.get("/{assessment_id}/shap")
def get_shap(
    assessment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    return {
        "top_features": assessment.top_features or [],
        "all_shap_values": assessment.shap_values or {},
    }
