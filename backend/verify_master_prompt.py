"""End-to-end Neon/Groq verification with temporary synthetic records."""

import csv
import json
import secrets
import urllib.request
from pathlib import Path
from uuid import uuid4

from app.auth.auth import get_password_hash
from app.database.connection import SessionLocal
from app.models.db_models import (
    Assessment,
    AuditLog,
    InterventionRecommendation,
    Participant,
    RiskTrajectory,
    User,
    UserRole,
)


BASE_URL = "http://127.0.0.1:8000/api"
DECISION_LOG = Path(__file__).resolve().parent / "logs" / "decision_log.csv"


def request(method, path, *, token=None, body=None, pdf=False):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    payload = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE_URL + path, data=payload, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=180) as response:
        return response.read() if pdf else json.load(response)


def main():
    email = f"master-prompt-{uuid4().hex}@example.invalid"
    password = secrets.token_urlsafe(24)
    user_id = participant_id = None
    assessment_ids = []
    try:
        with SessionLocal() as db:
            user = User(email=email, full_name="Synthetic Verification Judge",
                        hashed_password=get_password_hash(password), role=UserRole.JUDGE)
            db.add(user)
            db.commit()
            user_id = user.id

        login = request("POST", "/auth/login", body={"email": email, "password": password})
        token = login["access_token"]
        print("JWT login: passed", flush=True)

        participant = request("POST", "/participants", token=token, body={
            "first_name": "Synthetic", "last_name": "Verification",
            "age": 31, "gender": "Female", "race": "Other",
            "prior_arrests": 2, "prior_felonies": 1,
            "risk_assessment_score": 5.0,
        })
        participant_id = participant["id"]
        intake = request("POST", "/assessments", token=token, body={"participant_id": participant_id})
        assessment_ids.append(intake["id"])
        intake = request("POST", f"/assessments/{intake['id']}/predict", token=token)
        assert intake["assessment_stage"] == "INTAKE" and intake["trajectory_flag"] == "BASELINE"
        assert "catboost_intake_champion" in intake["model_version"]
        print(f"Intake prediction: passed; source={intake['narrative_generated_by']}", flush=True)

        request("PUT", f"/participants/{participant_id}", token=token, body={
            "program_attendances": 8,
            "program_unexcused_absences": 2,
            "percent_days_employed": 0.4,
            "drug_tests_positive_count": 1,
        })
        dynamic = request("POST", "/assessments", token=token, body={"participant_id": participant_id})
        assessment_ids.append(dynamic["id"])
        dynamic = request("POST", f"/assessments/{dynamic['id']}/predict", token=token)
        assert dynamic["assessment_stage"] == "DYNAMIC"
        assert "catboost_dynamic_champion" in dynamic["model_version"]
        print(f"Dynamic prediction: passed; source={dynamic['narrative_generated_by']}", flush=True)

        trajectory = request("GET", f"/participants/{participant_id}/trajectory", token=token)
        assert len(trajectory) == 2 and trajectory[0]["trajectory_flag"] == "BASELINE"
        assert trajectory[1]["assessment_id"] == dynamic["id"]
        print("Longitudinal trajectory: passed (2 points)", flush=True)

        scenario = request("POST", f"/assessments/{dynamic['id']}/simulate", token=token, body={
            "program_attendances": 24,
            "program_unexcused_absences": 0,
            "percent_days_employed": 0.85,
            "drug_tests_clean": True,
        })
        assert 0 <= scenario["simulated_risk"] <= 1
        assert abs(scenario["simulated_risk"] - scenario["baseline_risk"] - scenario["delta_risk"]) < 0.0002
        with SessionLocal() as db:
            saved = db.query(Assessment).filter_by(id=dynamic["id"]).one()
            assert len(saved.simulated_scenarios) == 1
            assert db.query(AuditLog).filter_by(action="SIMULATION_EXECUTED", resource_id=str(dynamic["id"])).count() == 1
        with DECISION_LOG.open(newline="", encoding="utf-8") as stream:
            assert any(row.get("recommended_scenario", "").startswith(f"Assessment {dynamic['id']}:")
                       for row in csv.DictReader(stream))
        print("Counterfactual simulation, database audit, CSV log: passed", flush=True)

        review = request("POST", f"/assessments/{dynamic['id']}/review", token=token,
                         body={"decision": "TEST REVIEW", "notes": "Synthetic verification only"})
        assert review["reviewer_decision"] == "TEST REVIEW"
        pdf = request("GET", f"/reports/{dynamic['id']}/pdf", token=token, pdf=True)
        assert pdf.startswith(b"%PDF") and len(pdf) > 1000
        print(f"Judicial review and PDF: passed ({len(pdf)} bytes)", flush=True)
    finally:
        with SessionLocal() as db:
            if assessment_ids:
                db.query(InterventionRecommendation).filter(
                    InterventionRecommendation.assessment_id.in_(assessment_ids)).delete(synchronize_session=False)
                db.query(RiskTrajectory).filter(
                    RiskTrajectory.assessment_id.in_(assessment_ids)).delete(synchronize_session=False)
                db.query(Assessment).filter(Assessment.id.in_(assessment_ids)).delete(synchronize_session=False)
            if participant_id is not None:
                db.query(Participant).filter_by(id=participant_id).delete()
            if user_id is not None:
                db.query(AuditLog).filter_by(user_id=user_id).delete()
                db.query(User).filter_by(id=user_id).delete()
            db.commit()
        if assessment_ids and DECISION_LOG.exists():
            with DECISION_LOG.open(newline="", encoding="utf-8") as stream:
                rows = list(csv.reader(stream))
            if rows:
                prefixes = tuple(f"Assessment {i}:" for i in assessment_ids)
                kept = [rows[0]] + [row for row in rows[1:] if len(row) < 4 or not row[3].startswith(prefixes)]
                with DECISION_LOG.open("w", newline="", encoding="utf-8") as stream:
                    csv.writer(stream).writerows(kept)
        print("Temporary verification records removed", flush=True)


if __name__ == "__main__":
    main()
