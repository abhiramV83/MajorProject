"""
Synthetic Demo Data Generator
--------------------------------
Generates 1000+ synthetic participant records for demonstration purposes.

DISCLAIMER: This is SYNTHETIC data only. It does NOT represent any real individuals
or real drug court participants. The statistical relationships are designed to create
a realistic-seeming dataset for ML demonstration — they do NOT represent validated
causal relationships between these variables and recidivism.

The paper's actual dataset contained 35,711 participants from 80+ Oklahoma drug courts
with 66 variables. This synthetic data is a simplified approximation for prototype purposes.
"""

import numpy as np
import pandas as pd
import json
import os
import sys
import random
from datetime import datetime, timedelta

np.random.seed(42)
random.seed(42)

N = 1200  # number of synthetic participants

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
os.makedirs(DATA_DIR, exist_ok=True)


def generate_synthetic_data():
    print(f"Generating {N} synthetic participant records...")

    # Demographics (stored but NOT used as model features per fairness design)
    genders = np.random.choice(
        ["Male", "Female", "Non-binary/Other"], N, p=[0.68, 0.30, 0.02]
    )
    races = np.random.choice(
        [
            "White",
            "Black/African American",
            "Hispanic/Latino",
            "Native American",
            "Other",
        ],
        N,
        p=[0.55, 0.25, 0.12, 0.05, 0.03],
    )
    ethnicities = np.random.choice(["Non-Hispanic", "Hispanic"], N, p=[0.88, 0.12])
    marital_statuses = np.random.choice(
        ["Single", "Married", "Divorced", "Separated", "Widowed"],
        N,
        p=[0.48, 0.18, 0.22, 0.09, 0.03],
    )

    # Age distribution (20-65)
    ages = np.random.normal(34, 10, N).clip(18, 65).astype(int)

    # Socioeconomic features
    employment_statuses = np.random.choice(
        [
            "Employed Full-Time",
            "Employed Part-Time",
            "Unemployed",
            "Disabled",
            "Student",
        ],
        N,
        p=[0.22, 0.18, 0.48, 0.08, 0.04],
    )

    # Income correlated with employment
    monthly_income = (
        np.where(
            employment_statuses == "Employed Full-Time",
            np.random.normal(2800, 700, N),
            np.where(
                employment_statuses == "Employed Part-Time",
                np.random.normal(1200, 400, N),
                np.random.normal(600, 300, N),
            ),
        )
        .clip(0, 8000)
        .round(2)
    )

    education_levels = np.random.choice(
        [
            "Less than High School",
            "High School/GED",
            "Some College",
            "Associate's",
            "Bachelor's",
            "Graduate",
        ],
        N,
        p=[0.28, 0.38, 0.22, 0.07, 0.04, 0.01],
    )
    num_dependents = np.random.choice(
        [0, 1, 2, 3, 4, 5], N, p=[0.38, 0.25, 0.20, 0.10, 0.05, 0.02]
    )
    housing_statuses = np.random.choice(
        [
            "Stable Housing",
            "Unstable Housing",
            "Homeless",
            "Transitional Housing",
            "With Family",
        ],
        N,
        p=[0.38, 0.22, 0.12, 0.15, 0.13],
    )
    child_support = np.random.choice([True, False], N, p=[0.28, 0.72])

    # Criminal history
    prior_arrests = np.random.negative_binomial(2, 0.4, N).clip(0, 25)
    prior_felonies = (
        np.floor(prior_arrests * np.random.uniform(0.1, 0.4, N)).astype(int).clip(0, 15)
    )
    age_first_arrest = np.random.normal(19, 4, N).clip(10, 40).astype(int)
    arrest_frequency = (
        (prior_arrests / np.maximum(ages - age_first_arrest, 1)).round(2).clip(0, 5)
    )

    # Program metrics
    # Participants with more sanctions tend to have more arrests
    sanctions_count = (
        (prior_arrests * np.random.uniform(0.3, 0.8, N)).astype(int).clip(0, 20)
    )
    incentives_count = np.random.negative_binomial(3, 0.4, N).clip(0, 30)
    risk_assessment_score = (
        (
            3
            + prior_arrests * 0.4
            + prior_felonies * 0.5
            + (housing_statuses == "Homeless") * 1.5
            + (employment_statuses == "Unemployed") * 0.8
            + np.random.normal(0, 1, N)
        )
        .clip(1, 10)
        .round(1)
    )

    # Behavioral indicators
    substance_use_freq = np.random.choice(
        ["Never", "Rarely", "Monthly", "Weekly", "Daily"],
        N,
        p=[0.08, 0.12, 0.20, 0.35, 0.25],
    )
    trauma_score = np.random.exponential(3, N).clip(0, 15).round(1)
    ace_score = np.random.choice(
        range(11),
        N,
        p=[0.12, 0.14, 0.14, 0.13, 0.11, 0.10, 0.09, 0.07, 0.05, 0.03, 0.02],
    )

    # -------------------------------------------------------
    # Synthetic target: 3-year recidivism
    # DISCLAIMER: These weights are ARBITRARY for demo purposes.
    # They do not represent validated causal relationships.
    # -------------------------------------------------------
    logit = (
        -2.5
        + prior_arrests * 0.15
        + prior_felonies * 0.20
        + arrest_frequency * 0.40
        + sanctions_count * 0.12
        + (employment_statuses == "Unemployed") * 0.60
        + (housing_statuses == "Homeless") * 0.80
        + (housing_statuses == "Unstable Housing") * 0.40
        + (substance_use_freq == "Daily") * 0.90
        + (substance_use_freq == "Weekly") * 0.50
        + trauma_score * 0.05
        + ace_score * 0.08
        + risk_assessment_score * 0.20
        - incentives_count * 0.05
        - (employment_statuses == "Employed Full-Time") * 0.50
        - (housing_statuses == "Stable Housing") * 0.40
        - monthly_income / 3000 * 0.30
        + np.random.normal(0, 0.8, N)
    )

    prob = 1 / (1 + np.exp(-logit))
    recidivism_3yr = (np.random.uniform(0, 1, N) < prob).astype(int)

    print(f"Recidivism rate: {recidivism_3yr.mean():.1%}")
    print(f"Class distribution: 0={sum(recidivism_3yr==0)}, 1={sum(recidivism_3yr==1)}")

    # Create DataFrame
    df = pd.DataFrame(
        {
            "participant_id": [f"DC-{100000+i:06d}" for i in range(N)],
            "first_name": [f"Demo{i}" for i in range(N)],
            "last_name": [f"Participant{i}" for i in range(N)],
            # Demographics (excluded from model training)
            "gender": genders,
            "race": races,
            "ethnicity": ethnicities,
            "marital_status": marital_statuses,
            "age": ages,
            # Socioeconomic
            "employment_status": employment_statuses,
            "monthly_income": monthly_income,
            "education_level": education_levels,
            "num_dependents": num_dependents,
            "housing_status": housing_statuses,
            "child_support": child_support,
            # Criminal history
            "prior_arrests": prior_arrests,
            "prior_felonies": prior_felonies,
            "age_first_arrest": age_first_arrest,
            "arrest_frequency": arrest_frequency,
            # Program metrics
            "sanctions_count": sanctions_count,
            "incentives_count": incentives_count,
            "risk_assessment_score": risk_assessment_score,
            # Behavioral
            "substance_use_frequency": substance_use_freq,
            "trauma_score": trauma_score,
            "ace_score": ace_score,
            # Target (SYNTHETIC)
            "recidivism_3yr": recidivism_3yr,
            # Program dates (synthetic)
            "program_status": np.random.choice(
                ["Active", "Graduated", "Terminated", "Pending"],
                N,
                p=[0.65, 0.15, 0.12, 0.08],
            ),
        }
    )

    output_path = os.path.join(DATA_DIR, "synthetic_participants.csv")
    df.to_csv(output_path, index=False)
    print(f"Saved {len(df)} records to {output_path}")
    return df


def generate_feature_dictionary():
    feature_dict = [
        {
            "feature_name": "age",
            "description": "Participant's current age in years",
            "data_type": "integer",
            "category": "demographics",
            "allowed_values": "18-65",
            "used_in_model": True,
        },
        {
            "feature_name": "gender",
            "description": "Participant's gender identity",
            "data_type": "categorical",
            "category": "demographics",
            "allowed_values": ["Male", "Female", "Non-binary/Other"],
            "used_in_model": False,
            "note": "EXCLUDED from model training — retained for subgroup fairness auditing only",
        },
        {
            "feature_name": "race",
            "description": "Participant's self-reported race",
            "data_type": "categorical",
            "category": "demographics",
            "allowed_values": [
                "White",
                "Black/African American",
                "Hispanic/Latino",
                "Native American",
                "Other",
            ],
            "used_in_model": False,
            "note": "EXCLUDED from model training — retained for subgroup fairness auditing only",
        },
        {
            "feature_name": "ethnicity",
            "description": "Participant's ethnicity",
            "data_type": "categorical",
            "category": "demographics",
            "allowed_values": ["Non-Hispanic", "Hispanic"],
            "used_in_model": False,
            "note": "EXCLUDED from model training — retained for subgroup fairness auditing only",
        },
        {
            "feature_name": "marital_status",
            "description": "Participant's current marital/relationship status",
            "data_type": "categorical",
            "category": "demographics",
            "allowed_values": ["Single", "Married", "Divorced", "Separated", "Widowed"],
            "used_in_model": True,
        },
        {
            "feature_name": "employment_status",
            "description": "Participant's current employment status",
            "data_type": "categorical",
            "category": "socioeconomic",
            "allowed_values": [
                "Employed Full-Time",
                "Employed Part-Time",
                "Unemployed",
                "Disabled",
                "Student",
            ],
            "used_in_model": True,
        },
        {
            "feature_name": "monthly_income",
            "description": "Participant's reported monthly income in USD",
            "data_type": "float",
            "category": "socioeconomic",
            "allowed_values": "0-8000+",
            "used_in_model": True,
        },
        {
            "feature_name": "education_level",
            "description": "Highest education level attained",
            "data_type": "categorical",
            "category": "socioeconomic",
            "allowed_values": [
                "Less than High School",
                "High School/GED",
                "Some College",
                "Associate's",
                "Bachelor's",
                "Graduate",
            ],
            "used_in_model": True,
        },
        {
            "feature_name": "num_dependents",
            "description": "Number of financial dependents",
            "data_type": "integer",
            "category": "socioeconomic",
            "allowed_values": "0-10+",
            "used_in_model": True,
        },
        {
            "feature_name": "housing_status",
            "description": "Current housing situation",
            "data_type": "categorical",
            "category": "socioeconomic",
            "allowed_values": [
                "Stable Housing",
                "Unstable Housing",
                "Homeless",
                "Transitional Housing",
                "With Family",
            ],
            "used_in_model": True,
        },
        {
            "feature_name": "child_support",
            "description": "Whether participant has active child support obligations",
            "data_type": "boolean",
            "category": "socioeconomic",
            "allowed_values": [True, False],
            "used_in_model": False,
        },
        {
            "feature_name": "prior_arrests",
            "description": "Total number of prior arrests",
            "data_type": "integer",
            "category": "criminal_history",
            "allowed_values": "0-25+",
            "used_in_model": True,
        },
        {
            "feature_name": "prior_felonies",
            "description": "Number of prior felony convictions",
            "data_type": "integer",
            "category": "criminal_history",
            "allowed_values": "0-15+",
            "used_in_model": True,
        },
        {
            "feature_name": "age_first_arrest",
            "description": "Age at first recorded arrest",
            "data_type": "integer",
            "category": "criminal_history",
            "allowed_values": "10-40",
            "used_in_model": True,
        },
        {
            "feature_name": "arrest_frequency",
            "description": "Average number of arrests per year since first arrest",
            "data_type": "float",
            "category": "criminal_history",
            "allowed_values": "0-5+",
            "used_in_model": True,
        },
        {
            "feature_name": "sanctions_count",
            "description": "Number of program sanctions received to date",
            "data_type": "integer",
            "category": "program_metrics",
            "allowed_values": "0-20+",
            "used_in_model": True,
        },
        {
            "feature_name": "incentives_count",
            "description": "Number of program incentives received to date",
            "data_type": "integer",
            "category": "program_metrics",
            "allowed_values": "0-30+",
            "used_in_model": True,
        },
        {
            "feature_name": "risk_assessment_score",
            "description": "Standardized risk assessment instrument score (1-10)",
            "data_type": "float",
            "category": "program_metrics",
            "allowed_values": "1-10",
            "used_in_model": True,
        },
        {
            "feature_name": "substance_use_frequency",
            "description": "Self-reported substance use frequency",
            "data_type": "categorical",
            "category": "behavioral",
            "allowed_values": ["Never", "Rarely", "Monthly", "Weekly", "Daily"],
            "used_in_model": True,
        },
        {
            "feature_name": "trauma_score",
            "description": "Trauma screening instrument score",
            "data_type": "float",
            "category": "behavioral",
            "allowed_values": "0-15+",
            "used_in_model": True,
        },
        {
            "feature_name": "ace_score",
            "description": "Adverse Childhood Experiences (ACE) questionnaire score",
            "data_type": "integer",
            "category": "behavioral",
            "allowed_values": "0-10",
            "used_in_model": True,
        },
        {
            "feature_name": "recidivism_3yr",
            "description": "Target variable: Whether participant was re-arrested within 3 years (SYNTHETIC LABEL)",
            "data_type": "binary",
            "category": "target",
            "allowed_values": [0, 1],
            "note": "SYNTHETIC target variable — does NOT represent real outcomes",
        },
    ]

    output_path = os.path.join(DATA_DIR, "feature_dictionary.json")
    with open(output_path, "w") as f:
        json.dump(feature_dict, f, indent=2)
    print(f"Feature dictionary saved to {output_path}")


if __name__ == "__main__":
    generate_synthetic_data()
    generate_feature_dictionary()
    print("\nDone! Next step: run scripts/train_models.py to train the ML models.")
