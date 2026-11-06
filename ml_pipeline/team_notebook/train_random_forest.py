"""Train the team notebook's baseline random forest on the shared holdout split."""

from pathlib import Path
import sys

import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.metrics import accuracy_score, roc_auc_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

PIPELINE_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PIPELINE_DIR))
from champion_model import FEATURES  # noqa: E402

NUMERIC = ["Residence_PUMA", "Supervision_Risk_Score_First"]
CATEGORICAL = [column for column in FEATURES if column not in NUMERIC]
MODEL_PATH = Path(__file__).with_name("random_forest_model.pkl")


def train() -> None:
    data = pd.read_excel(PIPELINE_DIR / "nijdataset.xlsx")
    features = data[FEATURES].copy()
    for column in CATEGORICAL:
        features[column] = features[column].fillna("Missing").astype(str)
    for column in NUMERIC:
        features[column] = pd.to_numeric(features[column], errors="coerce")

    labels = data["Recidivism_Within_3years"].map({"No": 0, "Yes": 1})
    development = data["Training_Sample"].eq(1)
    preprocessor = ColumnTransformer([
        ("categorical", Pipeline([
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
        ]), CATEGORICAL),
        ("numerical", SimpleImputer(strategy="median"), NUMERIC),
    ])
    model = Pipeline([
        ("preprocessor", preprocessor),
        ("classifier", RandomForestClassifier(
            n_estimators=100, random_state=42, n_jobs=2,
        )),
    ])
    model.fit(features.loc[development], labels.loc[development])

    probabilities = model.predict_proba(features.loc[~development])[:, 1]
    accuracy = accuracy_score(labels.loc[~development], probabilities >= 0.5)
    auc = roc_auc_score(labels.loc[~development], probabilities)
    joblib.dump({"model": model, "features": FEATURES, "threshold": 0.5}, MODEL_PATH)
    print(f"Saved {MODEL_PATH}")
    print(f"Holdout accuracy: {accuracy:.4%}; ROC-AUC: {auc:.4f}")


if __name__ == "__main__":
    train()
