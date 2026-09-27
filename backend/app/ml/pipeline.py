"""
ML Pipeline for Drug Court Decision Support System
--------------------------------------------------
Uses synthetic/demo data. All results are clearly labeled as synthetic demonstrations.
The paper's reported metrics (85.7% accuracy, 86.9% recall, 0.928 AUC) belong to
the original research experiment and are NOT reproduced here.
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.neural_network import MLPClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.pipeline import Pipeline
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import OneHotEncoder
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    confusion_matrix,
    roc_curve,
    precision_recall_curve,
)
import joblib
import json
import os
import logging

logger = logging.getLogger(__name__)

# Feature definitions matching the paper's categories
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

# Protected attributes - EXCLUDED from model training per fairness design
PROTECTED_ATTRIBUTES = ["race", "ethnicity", "gender"]

ALL_FEATURES = NUMERIC_FEATURES + CATEGORICAL_FEATURES
TARGET = "recidivism_3yr"

MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "models")
DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "data")


def get_model_path(model_name: str) -> str:
    os.makedirs(MODEL_DIR, exist_ok=True)
    return os.path.join(MODEL_DIR, f"{model_name}.pkl")


def build_preprocessor():
    """Build sklearn preprocessing pipeline."""
    numeric_transformer = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
        ]
    )

    categorical_transformer = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="constant", fill_value="unknown")),
            ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
        ]
    )

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", numeric_transformer, NUMERIC_FEATURES),
            ("cat", categorical_transformer, CATEGORICAL_FEATURES),
        ]
    )
    return preprocessor


def train_all_models(data_path: str = None):
    """Train Random Forest, Gradient Boosting, and MLP models."""
    if data_path is None:
        data_path = os.path.join(DATA_DIR, "synthetic_participants.csv")

    if not os.path.exists(data_path):
        raise FileNotFoundError(
            f"Training data not found at {data_path}. Run generate_demo_data.py first."
        )

    df = pd.read_csv(data_path)
    logger.info(f"Loaded {len(df)} training records.")

    X = df[ALL_FEATURES].copy()
    y = df[TARGET].copy()

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    preprocessor = build_preprocessor()

    models = {
        "random_forest": RandomForestClassifier(
            n_estimators=200,
            max_depth=10,
            class_weight="balanced",
            random_state=42,
            n_jobs=-1,
        ),
        "gradient_boosting": GradientBoostingClassifier(
            n_estimators=150, max_depth=5, learning_rate=0.1, random_state=42
        ),
        "mlp": MLPClassifier(
            hidden_layer_sizes=(128, 64, 32),
            activation="relu",
            max_iter=300,
            random_state=42,
            early_stopping=True,
            validation_fraction=0.1,
        ),
    }

    results = {}

    for model_name, clf in models.items():
        logger.info(f"Training {model_name}...")
        pipeline = Pipeline(steps=[("preprocessor", preprocessor), ("classifier", clf)])
        pipeline.fit(X_train, y_train)

        y_pred = pipeline.predict(X_test)
        y_prob = pipeline.predict_proba(X_test)[:, 1]

        cm = confusion_matrix(y_test, y_pred)
        fpr, tpr, _ = roc_curve(y_test, y_prob)
        prec_curve, rec_curve, _ = precision_recall_curve(y_test, y_prob)

        metrics = {
            "accuracy": float(accuracy_score(y_test, y_pred)),
            "precision": float(precision_score(y_test, y_pred, zero_division=0)),
            "recall": float(recall_score(y_test, y_pred, zero_division=0)),
            "f1": float(f1_score(y_test, y_pred, zero_division=0)),
            "roc_auc": float(roc_auc_score(y_test, y_prob)),
            "confusion_matrix": cm.tolist(),
            "roc_curve": {"fpr": fpr.tolist()[:50], "tpr": tpr.tolist()[:50]},
            "pr_curve": {
                "precision": prec_curve.tolist()[:50],
                "recall": rec_curve.tolist()[:50],
            },
            "training_samples": len(X_train),
            "test_samples": len(X_test),
        }

        results[model_name] = metrics
        logger.info(
            f"{model_name} - Accuracy: {metrics['accuracy']:.3f}, AUC: {metrics['roc_auc']:.3f}"
        )

        joblib.dump(pipeline, get_model_path(model_name))
        logger.info(f"Saved {model_name} to {get_model_path(model_name)}")

    # Save global feature importance for Random Forest
    rf_pipeline = joblib.load(get_model_path("random_forest"))
    rf_clf = rf_pipeline.named_steps["classifier"]
    prep = rf_pipeline.named_steps["preprocessor"]

    feature_names = NUMERIC_FEATURES.copy()
    try:
        ohe = prep.named_transformers_["cat"].named_steps["onehot"]
        cat_names = ohe.get_feature_names_out(CATEGORICAL_FEATURES).tolist()
        feature_names += cat_names
    except Exception:
        pass

    importances = rf_clf.feature_importances_
    global_importance = sorted(
        [
            {"feature": f, "importance": float(i)}
            for f, i in zip(feature_names, importances)
        ],
        key=lambda x: x["importance"],
        reverse=True,
    )[:15]

    results_path = os.path.join(MODEL_DIR, "training_results.json")
    with open(results_path, "w") as f:
        json.dump(
            {"models": results, "global_importance": global_importance}, f, indent=2
        )

    logger.info("All models trained successfully.")
    return results


def load_model(model_name: str = "random_forest"):
    """Load a trained model pipeline."""
    path = get_model_path(model_name)
    if not os.path.exists(path):
        raise FileNotFoundError(
            f"Model '{model_name}' not found. Please train models first."
        )
    return joblib.load(path)


def predict(participant_data: dict, model_name: str = "random_forest") -> dict:
    """Generate prediction for a single participant."""
    pipeline = load_model(model_name)

    df = pd.DataFrame([participant_data])

    # Fill defaults for missing features
    for col in NUMERIC_FEATURES:
        if col not in df.columns:
            df[col] = np.nan
    for col in CATEGORICAL_FEATURES:
        if col not in df.columns:
            df[col] = "unknown"

    X = df[ALL_FEATURES]
    prob = float(pipeline.predict_proba(X)[0][1])
    pred = int(pipeline.predict(X)[0])

    if prob <= 0.33:
        risk_level = "LOW"
    elif prob <= 0.66:
        risk_level = "MEDIUM"
    else:
        risk_level = "HIGH"

    return {
        "probability": prob,
        "prediction": pred,
        "risk_level": risk_level,
        "model_name": model_name,
    }


def get_training_results() -> dict:
    """Load saved training results."""
    results_path = os.path.join(MODEL_DIR, "training_results.json")
    if not os.path.exists(results_path):
        return None
    with open(results_path) as f:
        return json.load(f)
