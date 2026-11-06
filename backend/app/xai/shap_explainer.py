"""
SHAP Explainability Module for Drug Court DSS
=============================================
Generates local (participant-specific) and global SHAP explanations.
Supports:
1. Native CatBoost TreeSHAP (champion models)
2. Scikit-learn TreeExplainer (Random Forest / GBT fallback)
"""

import os
import logging
from pathlib import Path
from typing import List, Dict, Any
import numpy as np
import pandas as pd
import shap
import joblib
from catboost import Pool

from app.ml.pipeline import (
    load_champion_bundle,
    map_participant_to_model_row,
    prepare_model_features,
    get_model_path,
    MODEL_DIR,
    ALL_FEATURES,
    NUMERIC_FEATURES,
    CATEGORICAL_FEATURES,
)

logger = logging.getLogger(__name__)

FEATURE_DESCRIPTIONS = {
    "Program_Attendances": "Attendance in mandated treatment and counseling sessions",
    "Program_UnexcusedAbsences": "Unexcused absences from scheduled court/treatment dates",
    "Percent_Days_Employed": "Proportion of days with verified legitimate employment",
    "Jobs_Per_Year": "Employment stability and job turnover frequency",
    "DrugTests_THC_Positive": "Positive drug screens for cannabis / THC",
    "DrugTests_Cocaine_Positive": "Positive drug screens for cocaine",
    "DrugTests_Meth_Positive": "Positive drug screens for methamphetamine",
    "Supervision_Risk_Score_First": "Standardized risk assessment intake instrument score",
    "Prior_Arrest_Episodes_Felony": "Count of prior felony arrest episodes",
    "Prior_Arrest_Episodes_Drug": "Count of prior drug-related arrest charges",
    "Prior_Arrest_Episodes_PPViolationCharges": "Prior probation/parole violation charges",
    "Age_at_Release": "Age of participant at admission/release",
    "sanctions_count": "Number of judicial program sanctions received",
    "incentives_count": "Number of program positive incentives received",
    "risk_assessment_score": "Standardized risk assessment instrument score",
    "trauma_score": "Trauma screening score",
    "ace_score": "Adverse Childhood Experiences (ACE) score",
    "employment_status": "Current employment status",
    "education_level": "Highest education level attained",
    "substance_use_frequency": "Self-reported substance use frequency",
}


def compute_shap_values(
    participant_data: dict, model_name: str = "catboost_dynamic_champion"
) -> Dict[str, Any]:
    """Compute SHAP values for a single participant."""
    is_dynamic = "intake" not in model_name.lower()
    stage = "dynamic" if is_dynamic else "intake"

    # Try CatBoost Champion Model first
    bundle = load_champion_bundle(stage)
    if bundle and "model" in bundle:
        try:
            model = bundle["model"]
            features_df = prepare_model_features(participant_data, bundle, is_dynamic)
            cat_features = bundle.get("cat_features", [])

            # Native CatBoost TreeSHAP calculation
            pool = Pool(features_df, cat_features=cat_features)
            shap_matrix = model.get_feature_importance(pool, type="ShapValues")
            
            # The last column in CatBoost ShapValues is the base/expected value
            shap_values = shap_matrix[0, :-1]
            base_value = float(shap_matrix[0, -1])
            col_names = list(features_df.columns)

            all_shap = {}
            for col, val in zip(col_names, shap_values):
                all_shap[col] = round(float(val), 4)

            # Extract top 8 driving factors
            sorted_indices = np.argsort(np.abs(shap_values))[::-1]
            top_features = []
            for idx in sorted_indices[:8]:
                feat_name = col_names[idx]
                val = float(shap_values[idx])
                top_features.append({
                    "feature": feat_name,
                    "name": feat_name,
                    "shap_value": round(val, 4),
                    "impact": "Increases Risk" if val > 0 else "Decreases Risk",
                    "description": FEATURE_DESCRIPTIONS.get(feat_name, f"Influence of {feat_name}"),
                    "raw_value": (
                        features_df[feat_name].iloc[0].item()
                        if isinstance(features_df[feat_name].iloc[0], np.generic)
                        else features_df[feat_name].iloc[0]
                    )
                })

            return {
                "top_features": top_features,
                "all_shap_values": all_shap,
                "base_value": round(base_value, 4),
                "model_used": f"catboost_{stage}_champion"
            }
        except Exception as e:
            logger.warning(f"CatBoost TreeSHAP calculation error: {e}. Trying fallback.")

    # Scikit-learn fallback (Random Forest)
    try:
        pipeline = joblib.load(get_model_path("random_forest"))
        df = pd.DataFrame([participant_data])
        for col in NUMERIC_FEATURES:
            if col not in df.columns:
                df[col] = np.nan
        for col in CATEGORICAL_FEATURES:
            if col not in df.columns:
                df[col] = "unknown"

        X = df[ALL_FEATURES]
        preprocessor = pipeline.named_steps["preprocessor"]
        classifier = pipeline.named_steps["classifier"]
        X_trans = preprocessor.transform(X)

        explainer = shap.TreeExplainer(classifier)
        shap_vals = explainer.shap_values(X_trans)
        shap_array = shap_vals[1][0] if isinstance(shap_vals, list) else shap_vals[0]

        top_features = []
        for feat, val in zip(NUMERIC_FEATURES, shap_array[:len(NUMERIC_FEATURES)]):
            top_features.append({
                "feature": feat,
                "name": feat,
                "shap_value": round(float(val), 4),
                "impact": "Increases Risk" if val > 0 else "Decreases Risk",
                "description": FEATURE_DESCRIPTIONS.get(feat, feat)
            })

        top_features = sorted(top_features, key=lambda x: abs(x["shap_value"]), reverse=True)[:6]
        return {
            "top_features": top_features,
            "all_shap_values": {f["feature"]: f["shap_value"] for f in top_features},
            "base_value": 0.5,
            "model_used": "random_forest_fallback"
        }
    except Exception as e:
        logger.error(f"Fallback SHAP failed: {e}")
        return {"top_features": [], "all_shap_values": {}, "base_value": 0.5, "model_used": "heuristic"}
