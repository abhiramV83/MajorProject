"""Train and use the validation-selected CatBoost release-risk model."""

from pathlib import Path

import joblib
import pandas as pd
from catboost import CatBoostClassifier
from sklearn.metrics import accuracy_score, roc_auc_score


HERE = Path(__file__).resolve().parent
DATA_PATH = HERE / "nijdataset.xlsx"
MODEL_PATH = HERE / "champion_model.pkl"
TARGET = "Recidivism_Within_3years"
THRESHOLD = 0.515
ALIASES = {
    "_v1": "Prior_Arrest_Episodes_PPViolationCharges",
    "_v2": "Prior_Conviction_Episodes_PPViolationCharges",
    "_v3": "Prior_Conviction_Episodes_DomesticViolenceCharges",
    "_v4": "Prior_Conviction_Episodes_GunCharges",
}
FEATURES = [
    "Gender", "Race", "Age_at_Release", "Residence_PUMA",
    "Gang_Affiliated", "Supervision_Risk_Score_First",
    "Supervision_Level_First", "Education_Level", "Dependents",
    "Prison_Offense", "Prison_Years", "Prior_Arrest_Episodes_Felony",
    "Prior_Arrest_Episodes_Misd", "Prior_Arrest_Episodes_Violent",
    "Prior_Arrest_Episodes_Property", "Prior_Arrest_Episodes_Drug",
    "Prior_Arrest_Episodes_DVCharges", "Prior_Arrest_Episodes_GunCharges",
    "Prior_Conviction_Episodes_Felony", "Prior_Conviction_Episodes_Misd",
    "Prior_Conviction_Episodes_Viol", "Prior_Conviction_Episodes_Prop",
    "Prior_Conviction_Episodes_Drug", "Prior_Revocations_Parole",
    "Prior_Revocations_Probation", "Condition_MH_SA", "Condition_Cog_Ed",
    "Condition_Other",
]


def prepare_features(raw: pd.DataFrame) -> pd.DataFrame:
    """Apply the same row-wise feature preparation used in the comparison notebook."""
    required = FEATURES + list(ALIASES)
    missing = sorted(set(required) - set(raw.columns))
    if missing:
        raise ValueError(f"Missing input columns: {missing}")

    features = raw[required].rename(columns=ALIASES).copy()
    features["Supervision_Risk_Score_First"] = pd.to_numeric(
        features["Supervision_Risk_Score_First"], errors="coerce"
    )
    ordered_counts = [
        column for column in features
        if column.startswith(("Prior_Arrest_Episodes_", "Prior_Conviction_Episodes_"))
        and not features[column].isin(["Yes", "No"]).all()
    ]
    for column in [*ordered_counts, "Dependents"]:
        features[column] = pd.to_numeric(
            features[column].astype(str).str.extract(r"^(\d+)", expand=False),
            errors="coerce",
        )
    features["Age_at_Release"] = pd.to_numeric(
        features["Age_at_Release"].str.extract(r"^(\d+)", expand=False),
        errors="coerce",
    )
    features["Prison_Years"] = features["Prison_Years"].map({
        "Less than 1 year": 0, "1-2 years": 1,
        "Greater than 2 to 3 years": 2, "More than 3 years": 3,
    })
    features["Education_Level"] = features["Education_Level"].map({
        "Less than HS diploma": 0, "High School Diploma": 1,
        "At least some college": 2,
    })
    features["Residence_PUMA"] = features["Residence_PUMA"].astype(str)
    for prefix, label in [
        ("Prior_Arrest_Episodes_", "arrest_history"),
        ("Prior_Conviction_Episodes_", "conviction_history"),
    ]:
        counts = features[
            [column for column in ordered_counts if column.startswith(prefix)]
        ]
        features[f"{label}_breadth"] = counts.gt(0).sum(axis=1)
        features[f"{label}_max"] = counts.max(axis=1)
        features[f"{label}_score"] = counts.sum(axis=1, min_count=1)

    categorical = list(features.select_dtypes(exclude="number").columns)
    for column in categorical:
        features[column] = (
            features[column].astype("string").str.strip().fillna("Missing").astype(str)
        )
    age_group = features["Age_at_Release"].astype(str)
    for column in ("Residence_PUMA", "Prison_Offense", "Supervision_Level_First"):
        features[f"{column}_by_age"] = features[column] + "|" + age_group
    return features


def predict(raw: pd.DataFrame, path: Path = MODEL_PATH) -> pd.DataFrame:
    """Return risk probabilities and binary predictions for raw workbook-style rows."""
    bundle = joblib.load(path)
    probabilities = bundle["model"].predict_proba(prepare_features(raw))[:, 1]
    return pd.DataFrame({
        "risk_probability": probabilities,
        "predicted_recidivism": probabilities >= bundle["threshold"],
    }, index=raw.index)


def train() -> None:
    pkl_path = HERE / "nijdataset.pkl"
    if pkl_path.exists():
        raw = pd.read_pickle(pkl_path)
    else:
        raw = pd.read_excel(DATA_PATH)
    features = prepare_features(raw)
    labels = raw[TARGET].map({"No": 0, "Yes": 1})
    development = raw["Training_Sample"].eq(1)
    categorical = tuple(features.select_dtypes(exclude="number").columns)
    model = CatBoostClassifier(
        cat_features=categorical, depth=5, iterations=700, l2_leaf_reg=10,
        learning_rate=0.035, bootstrap_type="Bayesian", bagging_temperature=0.8,
        random_seed=42, thread_count=2, allow_writing_files=False, verbose=False,
    )
    model.fit(features.loc[development], labels.loc[development])
    probabilities = model.predict_proba(features.loc[~development])[:, 1]
    accuracy = accuracy_score(labels.loc[~development], probabilities >= THRESHOLD)
    auc = roc_auc_score(labels.loc[~development], probabilities)
    joblib.dump({"model": model, "threshold": THRESHOLD, "features": FEATURES,
                 "aliases": ALIASES}, MODEL_PATH)
    print(f"Saved {MODEL_PATH}")
    print(f"Holdout accuracy: {accuracy:.4%}; ROC-AUC: {auc:.4f}")


if __name__ == "__main__":
    train()
