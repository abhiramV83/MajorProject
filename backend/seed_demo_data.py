"""Seed repeatable demonstration cases. Run from backend with python seed_demo_data.py."""

from datetime import datetime, timedelta
import json
import secrets
from pathlib import Path

from app.auth.auth import get_password_hash
from app.config import settings
from app.database.connection import Base, SessionLocal, schema_engine
from app.models.db_models import Assessment, Participant, RiskLevel, RiskTrajectory, User, UserRole


def seed() -> None:
    Base.metadata.create_all(bind=schema_engine)
    db = SessionLocal()
    try:
        accounts = [
            ("judge@drugcourt.gov", "Hon. Patricia Vance", "judge123", UserRole.JUDGE),
            ("casemanager@drugcourt.gov", "Michael Henderson, MSW", "case123", UserRole.CASE_MANAGER),
            ("admin@drugcourt.gov", "System Administrator", "admin123", UserRole.ADMIN),
        ]
        users = {}
        for email, name, password, role in accounts:
            user = db.query(User).filter(User.email == email).first()
            if user is None:
                user = User(email=email, full_name=name, hashed_password=get_password_hash(password), role=role)
                db.add(user)
                db.flush()
            else:
                user.full_name = name
                user.hashed_password = get_password_hash(password)
                user.role = role
                db.flush()
            users[email] = user

        cases = [
            ("DC-109284", "John", "Carter", 90, [(58.2, "MEDIUM", "BASELINE"), (38.5, "MEDIUM", "IMPROVING")], 24, 0, 0.85, 0),
            ("DC-204918", "Marcus", "Vance", 60, [(46.0, "MEDIUM", "BASELINE"), (68.4, "HIGH", "ALERT")], 4, 4, 0.15, 2),
            ("DC-301827", "Elena", "Rodriguez", 0, [(51.0, "MEDIUM", "BASELINE")], 0, 0, 0.0, 0),
        ]
        for identifier, first, last, days, checkpoints, attendance, absence, employed, positive in cases:
            participant = db.query(Participant).filter(Participant.participant_id == identifier).first()
            if participant is None:
                participant = Participant(
                    participant_id=identifier, first_name=first, last_name=last,
                    enrollment_date=datetime.utcnow() - timedelta(days=days),
                    program_attendances=attendance, program_unexcused_absences=absence,
                    percent_days_employed=employed, drug_tests_positive_count=positive,
                )
                db.add(participant)
                db.flush()
            for index, (percent, tier, flag) in enumerate(checkpoints):
                assessment = (db.query(Assessment)
                              .filter(Assessment.participant_id == participant.id,
                                      Assessment.model_version == f"demo_{index}").first())
                if assessment is not None:
                    continue
                probability = percent / 100
                prior = checkpoints[index - 1][0] / 100 if index else probability
                date = participant.enrollment_date + timedelta(days=30 * index)
                assessment = Assessment(
                    participant_id=participant.id, assessor_id=users["casemanager@drugcourt.gov"].id,
                    assessment_date=date, assessment_stage="DYNAMIC" if index else "INTAKE",
                    recidivism_probability=probability, risk_level=RiskLevel(tier),
                    delta_risk=round(probability - prior, 4), trajectory_flag=flag,
                    model_version=f"demo_{index}", narrative="Demonstration assessment with predefined risk values.",
                )
                db.add(assessment)
                db.flush()
                db.add(RiskTrajectory(
                    participant_id=participant.id, assessment_id=assessment.id,
                    model_stage=assessment.assessment_stage, risk_probability=probability,
                    risk_level=tier, delta_risk=assessment.delta_risk,
                    trajectory_flag=flag, recorded_at=date,
                ))
        db.commit()
        print("Demo users, participants, assessments, and trajectories are ready.")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
