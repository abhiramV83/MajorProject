"""
Database Participant Seeder
----------------------------
Loads synthetic participants from CSV into PostgreSQL database.
Run AFTER generate_demo_data.py and database setup.
"""

import sys, os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))
os.chdir(os.path.join(os.path.dirname(__file__), ".."))

import pandas as pd
from backend.app.database.connection import SessionLocal, engine
from backend.app.models.db_models import Base, Participant
from datetime import datetime, timedelta
import random


def seed_participants():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        existing = db.query(Participant).count()
        if existing > 0:
            print(f"Database already has {existing} participants. Skipping seed.")
            return

        csv_path = os.path.join(
            os.path.dirname(__file__), "..", "data", "synthetic_participants.csv"
        )
        df = pd.read_csv(csv_path)

        # Load first 100 participants into DB for demo
        count = 0
        for _, row in df.head(100).iterrows():
            p = Participant(
                participant_id=str(row["participant_id"]),
                first_name=str(row["first_name"]),
                last_name=str(row["last_name"]),
                age=int(row["age"]) if pd.notna(row["age"]) else None,
                gender=str(row["gender"]) if pd.notna(row["gender"]) else None,
                race=str(row["race"]) if pd.notna(row["race"]) else None,
                ethnicity=str(row["ethnicity"]) if pd.notna(row["ethnicity"]) else None,
                marital_status=(
                    str(row["marital_status"])
                    if pd.notna(row["marital_status"])
                    else None
                ),
                employment_status=(
                    str(row["employment_status"])
                    if pd.notna(row["employment_status"])
                    else None
                ),
                monthly_income=(
                    float(row["monthly_income"])
                    if pd.notna(row["monthly_income"])
                    else None
                ),
                education_level=(
                    str(row["education_level"])
                    if pd.notna(row["education_level"])
                    else None
                ),
                num_dependents=(
                    int(row["num_dependents"]) if pd.notna(row["num_dependents"]) else 0
                ),
                housing_status=(
                    str(row["housing_status"])
                    if pd.notna(row["housing_status"])
                    else None
                ),
                child_support=(
                    bool(row["child_support"])
                    if pd.notna(row["child_support"])
                    else False
                ),
                prior_arrests=(
                    int(row["prior_arrests"]) if pd.notna(row["prior_arrests"]) else 0
                ),
                prior_felonies=(
                    int(row["prior_felonies"]) if pd.notna(row["prior_felonies"]) else 0
                ),
                age_first_arrest=(
                    int(row["age_first_arrest"])
                    if pd.notna(row["age_first_arrest"])
                    else None
                ),
                arrest_frequency=(
                    float(row["arrest_frequency"])
                    if pd.notna(row["arrest_frequency"])
                    else 0.0
                ),
                sanctions_count=(
                    int(row["sanctions_count"])
                    if pd.notna(row["sanctions_count"])
                    else 0
                ),
                incentives_count=(
                    int(row["incentives_count"])
                    if pd.notna(row["incentives_count"])
                    else 0
                ),
                risk_assessment_score=(
                    float(row["risk_assessment_score"])
                    if pd.notna(row["risk_assessment_score"])
                    else None
                ),
                substance_use_frequency=(
                    str(row["substance_use_frequency"])
                    if pd.notna(row["substance_use_frequency"])
                    else None
                ),
                trauma_score=(
                    float(row["trauma_score"]) if pd.notna(row["trauma_score"]) else 0.0
                ),
                ace_score=int(row["ace_score"]) if pd.notna(row["ace_score"]) else 0,
                program_status=(
                    str(row["program_status"])
                    if pd.notna(row["program_status"])
                    else "Active"
                ),
                enrollment_date=datetime.utcnow()
                - timedelta(days=random.randint(30, 730)),
            )
            db.add(p)
            count += 1

        db.commit()
        print(f"Successfully seeded {count} participants into the database.")
    except Exception as e:
        print(f"Error seeding participants: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_participants()
