"""
Production ML Pipeline for Drug Court Decision Support System
============================================================
Handles inference for:
1. Stage 1 (Admission Baseline): CatBoost Intake Champion (champion_intake_model.pkl)
2. Stage 2 (Dynamic Supervision): CatBoost Dynamic Champion (champion_dynamic_model.pkl)
3. Fallback: Legacy Random Forest / Scikit-learn pipelines
"""

import os
import json
import logging
from pathlib import Path
from typing import Dict, Any, Tuple
import numpy as np
import pandas as pd
import joblib

logger = logging.getLogger(__name__)

# Feature definitions for legacy model compatibility
NUMERIC_FEATURES = [
    "age",
    "prior_arrests",
    "prior_felonies",
    "age_first_arrest",
    "arrest_frequency",
    "sanctions_count",
    "incentives_count",
    "risk_assessment_score",
    "trauma_score",
    "ace_score",
    "monthly_income",
    "num_dependents",
]

CATEGORICAL_FEATURES = [
    "employment_status",
    "education_level",
    "housing_status",
    "marital_status",
    "substance_use_frequency",
]

PROTECTED_ATTRIBUTES = ["race", "ethnicity", "gender"]
ALL_FEATURES = NUMERIC_FEATURES + CATEGORICAL_FEATURES
TARGET = "recidivism_3yr"

BACKEND_DIR = Path(__file__).resolve().parent.parent.parent
MODEL_DIR = BACKEND_DIR / "models"
ML_PIPELINE_DIR = BACKEND_DIR.parent / "ml_pipeline"
DATA_DIR = BACKEND_DIR / "data"

INTAKE_MODEL_PATHS = [
    MODEL_DIR / "champion_intake_model.pkl",
    BACKEND_DIR.parent / "models" / "champion_intake_model.pkl",
    ML_PIPELINE_DIR / "champion_intake_model.pkl",
    ML_PIPELINE_DIR / "champion_model.pkl"
]

DYNAMIC_MODEL_PATHS = [
    MODEL_DIR / "champion_dynamic_model.pkl",
    BACKEND_DIR.parent / "models" / "champion_dynamic_model.pkl",
    ML_PIPELINE_DIR / "champion_dynamic_model.pkl",
    MODEL_DIR / "counterfactual_simulation_model.pkl",
    ML_PIPELINE_DIR / "saved_models" / "counterfactual_simulation_model.pkl"
]


def get_model_path(model_name: str) -> str:
    return str(MODEL_DIR / f"{model_name}.pkl")


def load_champion_bundle(stage: str = "dynamic"):
    """Load the trained production champion bundle."""
    paths = DYNAMIC_MODEL_PATHS if stage.lower() == "dynamic" else INTAKE_MODEL_PATHS
    for p in paths:
        if p.exists():
            try:
                bundle = joblib.load(p)
                return bundle
            except Exception as e:
                logger.warning(f"Failed loading {p}: {e}")
    return None


def map_participant_to_model_row(p_dict: Dict[str, Any], is_dynamic: bool = True) -> pd.DataFrame:
    """
    Transforms database participant attributes into model-ready features.
    Maps snake_case and database columns to CatBoost expected columns.
    """
    row = {
        "Gender": p_dict.get("gender") or "Missing",
        "Race": p_dict.get("race") or "Missing",
        "Age_at_Release": str(p_dict.get("age", 30)),
        "Residence_PUMA": str(p_dict.get("residence_puma", "1")),
        "Gang_Affiliated": "Yes" if p_dict.get("gang_affiliated") else "No",
        "Supervision_Risk_Score_First": float(p_dict.get("risk_assessment_score", 5.0) or 5.0),
        "Supervision_Level_First": p_dict.get("supervision_level", "Medium"),
        "Education_Level": p_dict.get("education_level", "High School Diploma"),
        "Dependents": str(p_dict.get("num_dependents", 0)),
        "Prison_Offense": p_dict.get("prison_offense", "Drug"),
        "Prison_Years": p_dict.get("prison_years", "1-2 years"),
        "Prior_Arrest_Episodes_Felony": str(p_dict.get("prior_felonies", 0)),
        "Prior_Arrest_Episodes_Misd": str(p_dict.get("prior_misdemeanors", 1)),
        "Prior_Arrest_Episodes_Violent": str(p_dict.get("prior_violent_arrests", 0)),
        "Prior_Arrest_Episodes_Property": str(p_dict.get("prior_property_arrests", 0)),
        "Prior_Arrest_Episodes_Drug": str(p_dict.get("prior_drug_arrests", 1)),
        "Prior_Arrest_Episodes_PPViolationCharges": str(p_dict.get("sanctions_count", 0)),
        "Prior_Arrest_Episodes_DVCharges": "0",
        "Prior_Arrest_Episodes_GunCharges": "0",
        "Prior_Conviction_Episodes_Felony": str(p_dict.get("prior_felonies", 0)),
        "Prior_Conviction_Episodes_Misd": "0",
        "Prior_Conviction_Episodes_Viol": "0",
        "Prior_Conviction_Episodes_Prop": "0",
        "Prior_Conviction_Episodes_Drug": str(p_dict.get("prior_drug_convictions", 0)),
        "Prior_Conviction_Episodes_PPViolationCharges": "0",
        "Prior_Conviction_Episodes_DomesticViolenceCharges": "0",
        "Prior_Conviction_Episodes_GunCharges": "0",
        "Prior_Revocations_Parole": "0",
        "Prior_Revocations_Probation": "0",
        "Condition_MH_SA": "Yes" if "substance" in str(p_dict.get("substance_use_frequency", "")).lower() else "No",
        "Condition_Cog_Ed": "Yes" if (p_dict.get("trauma_score", 0) or 0) > 3 else "No",
        "Condition_Other": "No",
    }

    if is_dynamic:
        # Dynamic supervision additions
        row["Program_Attendances"] = int(p_dict.get("program_attendances", 0) or 0)
        row["Program_UnexcusedAbsences"] = int(p_dict.get("program_unexcused_absences", 0) or 0)
        row["Percent_Days_Employed"] = float(p_dict.get("percent_days_employed", 0.0) or 0.0)
        row["Jobs_Per_Year"] = float(p_dict.get("jobs_per_year", 1.0) or 1.0)

        pos_drugs = int(p_dict.get("drug_tests_positive_count", 0) or 0)
        row["DrugTests_THC_Positive"] = pos_drugs
        row["DrugTests_Cocaine_Positive"] = 0
        row["DrugTests_Meth_Positive"] = 0
        row["DrugTests_Other_Positive"] = 0

        # Behavioral and compliance features
        row["Violations_ElectronicMonitoring"] = "false"
        row["Violations_Instruction"] = "false"
        row["Violations_FailToReport"] = "true" if (p_dict.get("sanctions_count", 0) or 0) > 2 else "false"
        row["Violations_MoveWithoutPermission"] = "false"
        row["Delinquency_Reports"] = str(p_dict.get("sanctions_count", 0) or 0)
        row["Residence_Changes"] = "0"
        row["Avg_Days_per_DrugTest"] = 14.0
        row["Employment_Exempt"] = "false"

    return pd.DataFrame([row])


def prepare_model_features(participant_data: dict, bundle: dict, is_dynamic: bool) -> pd.DataFrame:
    """Recreate the feature engineering used by the saved champion models."""
    frame = map_participant_to_model_row(participant_data, is_dynamic=is_dynamic)
    for column in frame.columns:
        if column.startswith(("Prior_Arrest_", "Prior_Conviction_")) and not frame[column].isin(["Yes", "No"]).all():
            frame[column] = pd.to_numeric(
                frame[column].astype(str).str.extract(r"^(\d+)", expand=False), errors="coerce"
            ).fillna(0)
        elif column in ("Dependents", "Program_Attendances", "Program_UnexcusedAbsences", "Residence_Changes", "Delinquency_Reports"):
            frame[column] = pd.to_numeric(
                frame[column].astype(str).str.extract(r"^(\d+)", expand=False), errors="coerce"
            ).fillna(0)
    frame["Age_num"] = pd.to_numeric(
        frame["Age_at_Release"].astype(str).str.extract(r"^(\d+)", expand=False), errors="coerce"
    ).fillna(30)
    frame["Prison_Years_num"] = frame["Prison_Years"].map({
        "Less than 1 year": 0, "1-2 years": 1,
        "Greater than 2 to 3 years": 2, "More than 3 years": 3,
    }).fillna(1)
    frame["Education_num"] = frame["Education_Level"].map({
        "Less than HS diploma": 0, "High School Diploma": 1, "At least some college": 2,
    }).fillna(1)
    arrests = [column for column in frame if column.startswith("Prior_Arrest_Episodes_")
               and pd.api.types.is_numeric_dtype(frame[column])]
    convictions = [column for column in frame if column.startswith("Prior_Conviction_Episodes_")
                   and pd.api.types.is_numeric_dtype(frame[column])]
    frame["total_arrest_episodes"] = frame[arrests].sum(axis=1)
    frame["max_arrest_episode"] = frame[arrests].max(axis=1)
    frame["violent_arrest_ratio"] = frame["Prior_Arrest_Episodes_Violent"] / (frame["total_arrest_episodes"] + 1e-5)
    frame["drug_arrest_ratio"] = frame["Prior_Arrest_Episodes_Drug"] / (frame["total_arrest_episodes"] + 1e-5)
    frame["total_conviction_episodes"] = frame[convictions].sum(axis=1)
    frame["conviction_to_arrest_ratio"] = frame["total_conviction_episodes"] / (frame["total_arrest_episodes"] + 1e-5)
    if is_dynamic:
        drug_columns = ["DrugTests_THC_Positive", "DrugTests_Cocaine_Positive", "DrugTests_Meth_Positive", "DrugTests_Other_Positive"]
        frame[drug_columns] = frame[drug_columns].apply(pd.to_numeric, errors="coerce").fillna(0)
        frame["total_positive_drug_tests"] = frame[drug_columns].sum(axis=1)
        frame["has_positive_drug_test"] = (frame["total_positive_drug_tests"] > 0).astype(int)
        frame["program_absence_rate"] = frame["Program_UnexcusedAbsences"] / (
            frame["Program_Attendances"] + frame["Program_UnexcusedAbsences"] + 1e-5
        )
    frame = frame.reindex(columns=bundle["features"])
    for column in bundle.get("cat_features", []):
        frame[column] = frame[column].fillna("Missing").astype(str)
    for column in frame.columns.difference(bundle.get("cat_features", [])):
        frame[column] = pd.to_numeric(frame[column], errors="coerce").fillna(0)
    return frame


def predict(participant_data: dict, model_name: str = "catboost_dynamic_champion") -> dict:
    """
    Main prediction router.
    Supports:
    - catboost_dynamic_champion (Stage 2: 75.02% Acc / 0.820 AUC)
    - catboost_intake_champion (Stage 1: 68.57% Acc / 0.736 AUC)
    - random_forest (Legacy fallback)
    """
    is_dynamic = "intake" not in model_name.lower()
    stage = "dynamic" if is_dynamic else "intake"

    bundle = load_champion_bundle(stage)
    if bundle and "model" in bundle:
        try:
            model = bundle["model"]
            threshold = bundle.get("threshold", 0.50)
            features_df = prepare_model_features(participant_data, bundle, is_dynamic)

            # Predict probability
            prob = float(model.predict_proba(features_df)[0, 1])
            pred = int(prob >= threshold)

            if prob <= 0.35:
                risk_level = "LOW"
            elif prob <= 0.65:
                risk_level = "MEDIUM"
            else:
                risk_level = "HIGH"

            return {
                "probability": round(prob, 4),
                "prediction": pred,
                "risk_level": risk_level,
                "model_name": f"catboost_{stage}_champion",
                "threshold": threshold,
                "confidence": round(abs(prob - 0.5) * 2, 3),
                "features_used": features_df.to_dict(orient="records")[0]
            }
        except Exception as e:
            logger.error(f"Champion inference failed: {e}. Falling back to scikit-learn.")

    # Legacy Scikit-learn fallback
    rf_path = MODEL_DIR / "random_forest.pkl"
    if rf_path.exists():
        pipeline = joblib.load(rf_path)
        df = pd.DataFrame([participant_data])
        for col in NUMERIC_FEATURES:
            if col not in df.columns:
                df[col] = np.nan
        for col in CATEGORICAL_FEATURES:
            if col not in df.columns:
                df[col] = "unknown"
        X = df[ALL_FEATURES]
        prob = float(pipeline.predict_proba(X)[0][1])
        pred = int(pipeline.predict(X)[0])
        return {
            "probability": round(prob, 4),
            "prediction": pred,
            "risk_level": "HIGH" if prob >= 0.66 else ("MEDIUM" if prob >= 0.33 else "LOW"),
            "model_name": "random_forest_baseline",
            "threshold": 0.5,
            "confidence": round(abs(prob - 0.5) * 2, 3)
        }

    # Deterministic heuristic fallback if no model files exist
    risk_score = float(participant_data.get("risk_assessment_score", 5.0) or 5.0)
    sanctions = int(participant_data.get("sanctions_count", 0) or 0)
    prob = min(0.95, max(0.05, (risk_score / 10.0) * 0.7 + (sanctions * 0.05)))
    return {
        "probability": round(prob, 4),
        "prediction": int(prob >= 0.5),
        "risk_level": "HIGH" if prob >= 0.65 else ("MEDIUM" if prob >= 0.40 else "LOW"),
        "model_name": "clinical_heuristic_baseline",
        "threshold": 0.5,
        "confidence": 0.8
    }
