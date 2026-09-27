from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
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
)
from app.schemas.schemas import AssessmentCreate, AssessmentOut, ReviewRequest
from app.config import settings
import logging

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

    # Run ML prediction
    try:
        from app.ml.pipeline import predict

        result = predict(features)
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

    # Run SHAP
    try:
        from app.xai.shap_explainer import compute_shap_values

        shap_result = compute_shap_values(features)
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
            features, top_features, result, openai_api_key=settings.OPENAI_API_KEY
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
    db.commit()

    # Save recommendations
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


@router.post("/{assessment_id}/review", response_model=AssessmentOut)
def submit_review(
    assessment_id: int,
    body: ReviewRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
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
