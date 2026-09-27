from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.connection import get_db
from app.auth.auth import get_current_user
from app.models.db_models import User, ModelVersion
from app.schemas.schemas import ModelPerformanceOut
from typing import List
import json, os

router = APIRouter(prefix="/api/model", tags=["Model"])
MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "models")


@router.get("/performance")
def get_performance(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    results_path = os.path.join(MODEL_DIR, "training_results.json")
    if not os.path.exists(results_path):
        return {
            "status": "not_trained",
            "message": "Models have not been trained yet. Run the training script to generate results.",
            "models": {},
        }
    with open(results_path) as f:
        data = json.load(f)
    return {
        "status": "trained",
        "disclaimer": "These metrics are based on SYNTHETIC demonstration data and do not represent real-world performance.",
        "models": data.get("models", {}),
        "global_importance": data.get("global_importance", []),
    }


@router.get("/global-explanations")
def get_global_explanations(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    try:
        from app.xai.shap_explainer import get_global_importance

        importance = get_global_importance()
        return {
            "global_importance": importance,
            "disclaimer": "Global feature importance based on synthetic demonstration data.",
        }
    except Exception as e:
        return {"global_importance": [], "error": str(e)}


@router.get("/fairness")
def get_fairness(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    """
    Fairness analysis across demographic subgroups.
    Uses synthetic data — results are illustrative, not validated.
    Protected attributes (race, gender, ethnicity) are EXCLUDED from model training.
    Subgroup analysis is performed post-hoc for auditing purposes only.
    """
    import pandas as pd
    import numpy as np

    data_path = os.path.join(
        os.path.dirname(__file__),
        "..",
        "..",
        "..",
        "data",
        "synthetic_participants.csv",
    )
    model_path = os.path.join(MODEL_DIR, "random_forest.pkl")

    if not os.path.exists(data_path) or not os.path.exists(model_path):
        return {
            "status": "not_available",
            "message": "Fairness analysis requires trained models and synthetic dataset.",
            "subgroup_results": {},
        }

    try:
        import joblib
        from sklearn.metrics import (
            accuracy_score,
            recall_score,
            precision_score,
            f1_score,
        )
        from app.ml.pipeline import ALL_FEATURES

        df = pd.read_csv(data_path)
        pipeline = joblib.load(model_path)

        X = df[ALL_FEATURES]
        y = df["recidivism_3yr"]
        y_pred = pipeline.predict(X)
        y_prob = pipeline.predict_proba(X)[:, 1]

        fairness_results = {}

        for attr in ["gender", "race", "ethnicity"]:
            if attr not in df.columns:
                continue
            groups = df[attr].value_counts()
            attr_results = []
            for group_val, count in groups.items():
                if count < 30:
                    attr_results.append(
                        {
                            "group": str(group_val),
                            "count": int(count),
                            "note": "Insufficient sample size for reliable comparison (n < 30)",
                        }
                    )
                    continue
                mask = df[attr] == group_val
                y_g = y[mask]
                yp_g = y_pred[mask]
                yprob_g = y_prob[mask]

                tn = int(((y_g == 0) & (yp_g == 0)).sum())
                fp = int(((y_g == 0) & (yp_g == 1)).sum())
                fn = int(((y_g == 1) & (yp_g == 0)).sum())
                tp = int(((y_g == 1) & (yp_g == 1)).sum())

                attr_results.append(
                    {
                        "group": str(group_val),
                        "count": int(count),
                        "accuracy": round(float(accuracy_score(y_g, yp_g)), 3),
                        "recall": round(
                            float(recall_score(y_g, yp_g, zero_division=0)), 3
                        ),
                        "precision": round(
                            float(precision_score(y_g, yp_g, zero_division=0)), 3
                        ),
                        "f1": round(float(f1_score(y_g, yp_g, zero_division=0)), 3),
                        "fpr": round(fp / (fp + tn) if (fp + tn) > 0 else 0, 3),
                        "fnr": round(fn / (fn + tp) if (fn + tp) > 0 else 0, 3),
                    }
                )
            fairness_results[attr] = attr_results

        return {
            "status": "available",
            "disclaimer": (
                "Protected attributes (race, gender, ethnicity) are EXCLUDED from model training. "
                "Subgroup analysis shown here is post-hoc for auditing purposes. "
                "All results based on SYNTHETIC data — not operationally validated."
            ),
            "excluded_from_training": ["race", "gender", "ethnicity"],
            "subgroup_results": fairness_results,
        }

    except Exception as e:
        return {"status": "error", "message": str(e), "subgroup_results": {}}


@router.get("/version")
def get_version(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    results_path = os.path.join(MODEL_DIR, "training_results.json")
    trained = os.path.exists(results_path)
    return {
        "active_model": "random_forest_v1",
        "trained": trained,
        "models_available": ["random_forest", "gradient_boosting", "mlp"],
        "disclaimer": "Synthetic demonstration system",
    }
