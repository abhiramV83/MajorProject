"""
SHAP Explainability Module
---------------------------
Generates local (participant-specific) and global SHAP explanations.
All explanations use SHAP TreeExplainer for Random Forest / Gradient Boosting.
"""

import numpy as np
import pandas as pd

# pyrefly: ignore [missing-import]
import shap
import joblib
import json
import os
import logging
from typing import List, Dict, Any
from app.ml.pipeline import (
    ALL_FEATURES,
    NUMERIC_FEATURES,
    CATEGORICAL_FEATURES,
    get_model_path,
    MODEL_DIR,
)

logger = logging.getLogger(__name__)

FEATURE_DESCRIPTIONS = {
    "age": "Participant's current age",
    "prior_arrests": "Total number of prior arrests",
    "prior_felonies": "Number of prior felony convictions",
    "age_first_arrest": "Age at first recorded arrest",
    "arrest_frequency": "Average arrests per year",
    "sanctions_count": "Number of program sanctions received",
    "incentives_count": "Number of program incentives received",
    "risk_assessment_score": "Standardized risk assessment instrument score",
    "trauma_score": "Trauma screening score",
    "ace_score": "Adverse Childhood Experiences (ACE) score",
    "monthly_income": "Reported monthly income",
    "num_dependents": "Number of financial dependents",
    "employment_status": "Current employment status",
    "education_level": "Highest education level attained",
    "housing_status": "Current housing situation",
    "marital_status": "Current marital status",
    "substance_use_frequency": "Self-reported substance use frequency",
}


def compute_shap_values(
    participant_data: dict, model_name: str = "random_forest"
) -> Dict[str, Any]:
    """Compute SHAP values for a single participant."""
    pipeline = joblib.load(get_model_path(model_name))

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

    X_transformed = preprocessor.transform(X)

    # Build feature names
    feature_names = NUMERIC_FEATURES.copy()
    try:
        ohe = preprocessor.named_transformers_["cat"].named_steps["onehot"]
        cat_names = ohe.get_feature_names_out(CATEGORICAL_FEATURES).tolist()
        feature_names += cat_names
    except Exception:
        pass

    # Use TreeExplainer for tree-based models
    model_type = type(classifier).__name__
    if model_type in ("RandomForestClassifier", "GradientBoostingClassifier"):
        try:
            explainer = shap.TreeExplainer(classifier)
            shap_vals = explainer.shap_values(X_transformed)
            # Handle different SHAP output formats
            if isinstance(shap_vals, list):
                # Old format: list of arrays per class
                shap_array = (
                    np.array(shap_vals[1][0])
                    if len(shap_vals) > 1
                    else np.array(shap_vals[0][0])
                )
            elif hasattr(shap_vals, "values"):
                # New Explanation object format
                v = shap_vals.values
                if v.ndim == 3:
                    shap_array = v[0, :, 1]  # sample 0, all features, class 1
                elif v.ndim == 2:
                    shap_array = v[0]
                else:
                    shap_array = v
            else:
                shap_array = (
                    np.array(shap_vals)[0]
                    if np.array(shap_vals).ndim > 1
                    else np.array(shap_vals)
                )
        except Exception as e:
            logger.warning(
                f"TreeExplainer failed ({e}), using feature importances fallback"
            )
            importances = classifier.feature_importances_
            # Convert importances to pseudo-SHAP (centered around 0)
            pred_prob = float(classifier.predict_proba(X_transformed)[0][1])
            shap_array = importances * (pred_prob - 0.5) * 2
    else:
        # Linear approximation for MLP to avoid slow KernelExplainer
        try:
            proba = float(classifier.predict_proba(X_transformed)[0][1])
            # Use permutation-based importance estimate
            baseline_proba = proba
            shap_array = np.zeros(X_transformed.shape[1])
            for i in range(min(X_transformed.shape[1], 20)):
                X_perm = X_transformed.copy()
                X_perm[0, i] = 0
                perm_proba = float(classifier.predict_proba(X_perm)[0][1])
                shap_array[i] = baseline_proba - perm_proba
        except Exception:
            shap_array = np.zeros(len(feature_names))

    # Map back to original feature names where possible
    # Aggregate OHE features back to original categorical features
    shap_by_feature = {}

    # Numeric features 1:1 mapping
    for i, fname in enumerate(NUMERIC_FEATURES):
        shap_by_feature[fname] = float(shap_array[i])

    # Categorical features: sum OHE components
    num_offset = len(NUMERIC_FEATURES)
    for cat_feat in CATEGORICAL_FEATURES:
        try:
            ohe = preprocessor.named_transformers_["cat"].named_steps["onehot"]
            all_cat_names = ohe.get_feature_names_out(CATEGORICAL_FEATURES).tolist()
            relevant_indices = [
                num_offset + j
                for j, n in enumerate(all_cat_names)
                if n.startswith(cat_feat + "_")
            ]
            if relevant_indices:
                shap_by_feature[cat_feat] = float(
                    sum(shap_array[idx] for idx in relevant_indices)
                )
        except Exception:
            shap_by_feature[cat_feat] = 0.0

    # Sort by absolute SHAP value
    sorted_features = sorted(
        shap_by_feature.items(), key=lambda x: abs(x[1]), reverse=True
    )

    top_features = []
    for feat, shap_val in sorted_features[:10]:
        val = participant_data.get(feat, "N/A")
        top_features.append(
            {
                "feature": feat,
                "value": val,
                "shap_value": round(shap_val, 4),
                "direction": "increases risk" if shap_val > 0 else "decreases risk",
                "description": FEATURE_DESCRIPTIONS.get(
                    feat, feat.replace("_", " ").title()
                ),
            }
        )

    return {
        "top_features": top_features,
        "all_shap_values": shap_by_feature,
        "model_name": model_name,
        "feature_count": len(shap_by_feature),
    }


def get_global_importance(model_name: str = "random_forest") -> List[Dict]:
    """Get global feature importance from saved training results."""
    results_path = os.path.join(MODEL_DIR, "training_results.json")
    if os.path.exists(results_path):
        with open(results_path) as f:
            data = json.load(f)
        return data.get("global_importance", [])

    # Fallback: compute from model
    try:
        pipeline = joblib.load(get_model_path(model_name))
        clf = pipeline.named_steps["classifier"]
        preprocessor = pipeline.named_steps["preprocessor"]

        feature_names = NUMERIC_FEATURES.copy()
        try:
            ohe = preprocessor.named_transformers_["cat"].named_steps["onehot"]
            cat_names = ohe.get_feature_names_out(CATEGORICAL_FEATURES).tolist()
            feature_names += cat_names
        except Exception:
            pass

        importances = clf.feature_importances_
        result = sorted(
            [
                {"feature": f, "importance": float(i)}
                for f, i in zip(feature_names, importances)
            ],
            key=lambda x: x["importance"],
            reverse=True,
        )[:15]
        return result
    except Exception as e:
        logger.warning(f"Could not compute global importance: {e}")
        return []
