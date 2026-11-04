import pandas as pd
import numpy as np
import os
import joblib

from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    classification_report,
    confusion_matrix,
)

from interpret.glassbox import ExplainableBoostingClassifier

# ============================================================
# 1. LOAD DATASET
# ============================================================

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(SCRIPT_DIR, "nijdataset.xlsx") if os.path.exists(os.path.join(SCRIPT_DIR, "nijdataset.xlsx")) else "nijdataset.xlsx"

df = pd.read_excel(DATA_PATH)

print("Dataset shape:")
print(df.shape)


# ============================================================
# 2. FEATURES AND TARGET
# ============================================================

target = "Recidivism_Within_3years"

features = [
    "Gender",
    "Race",
    "Age_at_Release",
    "Residence_PUMA",
    "Gang_Affiliated",
    "Supervision_Risk_Score_First",
    "Supervision_Level_First",
    "Education_Level",
    "Dependents",
    "Prison_Offense",
    "Prison_Years",
    "Prior_Arrest_Episodes_Felony",
    "Prior_Arrest_Episodes_Misd",
    "Prior_Arrest_Episodes_Violent",
    "Prior_Arrest_Episodes_Property",
    "Prior_Arrest_Episodes_Drug",
    "Prior_Arrest_Episodes_DVCharges",
    "Prior_Arrest_Episodes_GunCharges",
    "Prior_Conviction_Episodes_Felony",
    "Prior_Conviction_Episodes_Misd",
    "Prior_Conviction_Episodes_Viol",
    "Prior_Conviction_Episodes_Prop",
    "Prior_Conviction_Episodes_Drug",
    "Prior_Revocations_Parole",
    "Prior_Revocations_Probation",
    "Condition_MH_SA",
    "Condition_Cog_Ed",
    "Condition_Other",
]

X = df[features].copy()
y = df[target].copy()


# ============================================================
# 3. CONVERT TARGET TO 0 AND 1
# ============================================================

y = y.map({"No": 0, "Yes": 1})

print("\nTarget distribution:")
print(y.value_counts())


# ============================================================
# 4. DEFINE CATEGORICAL AND NUMERICAL COLUMNS
# ============================================================

categorical_features = [
    "Gender",
    "Race",
    "Age_at_Release",
    "Gang_Affiliated",
    "Supervision_Level_First",
    "Education_Level",
    "Dependents",
    "Prison_Offense",
    "Prison_Years",
    "Prior_Arrest_Episodes_Felony",
    "Prior_Arrest_Episodes_Misd",
    "Prior_Arrest_Episodes_Violent",
    "Prior_Arrest_Episodes_Property",
    "Prior_Arrest_Episodes_Drug",
    "Prior_Arrest_Episodes_DVCharges",
    "Prior_Arrest_Episodes_GunCharges",
    "Prior_Conviction_Episodes_Felony",
    "Prior_Conviction_Episodes_Misd",
    "Prior_Conviction_Episodes_Viol",
    "Prior_Conviction_Episodes_Prop",
    "Prior_Conviction_Episodes_Drug",
    "Prior_Revocations_Parole",
    "Prior_Revocations_Probation",
    "Condition_MH_SA",
    "Condition_Cog_Ed",
    "Condition_Other",
]

numerical_features = ["Residence_PUMA", "Supervision_Risk_Score_First"]


# ============================================================
# 5. CLEAN DATA TYPES
# ============================================================

for column in categorical_features:
    X[column] = X[column].fillna("Missing").astype(str)

for column in numerical_features:
    X[column] = pd.to_numeric(X[column], errors="coerce")

print("\nCategorical columns:")
print(categorical_features)

print("\nNumerical columns:")
print(numerical_features)


# ============================================================
# 6. PREPROCESSING
# ============================================================

categorical_transformer = Pipeline(
    steps=[
        ("imputer", SimpleImputer(strategy="most_frequent")),
        ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
    ]
)

numerical_transformer = Pipeline(steps=[("imputer", SimpleImputer(strategy="median"))])

preprocessor = ColumnTransformer(
    transformers=[
        ("categorical", categorical_transformer, categorical_features),
        ("numerical", numerical_transformer, numerical_features),
    ]
)


# ============================================================
# 7. TRAIN / TEST SPLIT
# ============================================================

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

print("\nTraining data:", X_train.shape)
print("Testing data:", X_test.shape)


# ============================================================
# 8. EBM MODEL (EXPLAINABLE BOOSTING MACHINE)
# ============================================================

# Pre-fit preprocessor to pass feature names into EBM classifier
preprocessor.fit(X_train)
feature_names = list(preprocessor.get_feature_names_out())

ebm_classifier = ExplainableBoostingClassifier(feature_names=feature_names, random_state=42)

model = Pipeline(
    steps=[
        ("preprocessor", preprocessor),
        ("classifier", ebm_classifier),
    ]
)


# ============================================================
# 9. TRAIN MODEL
# ============================================================

print("\nTraining Explainable Boosting Machine (EBM)...")
model.fit(X_train, y_train)
print("Training completed!")


# ============================================================
# 10. PREDICTION
# ============================================================

y_pred = model.predict(X_test)
y_prob = model.predict_proba(X_test)[:, 1]


# ============================================================
# 11. ACCURACY & METRICS
# ============================================================

accuracy = accuracy_score(y_test, y_pred)
precision = precision_score(y_test, y_pred)
recall = recall_score(y_test, y_pred)
f1 = f1_score(y_test, y_pred)
roc_auc = roc_auc_score(y_test, y_prob)

print("\n================================")
print("EBM MODEL PERFORMANCE")
print("================================")
print(f"Accuracy:  {accuracy:.4f}")
print(f"Precision: {precision:.4f}")
print(f"Recall:    {recall:.4f}")
print(f"F1-Score:  {f1:.4f}")
print(f"ROC-AUC:   {roc_auc:.4f}")


# ============================================================
# 12. CLASSIFICATION REPORT
# ============================================================

print("\nClassification Report:")
print(classification_report(y_test, y_pred, target_names=["No Recidivism", "Recidivism"]))


# ============================================================
# 13. CONFUSION MATRIX
# ============================================================

print("\nConfusion Matrix:")
print(confusion_matrix(y_test, y_pred))

print("\nFirst 10 Predicted Recidivism Probabilities:")
for i in range(10):
    print(f"Person {i+1}: {y_prob[i] * 100:.2f}%")


# ============================================================
# NATIVE EBM EXPLAINABILITY (GLOBAL + LOCAL)
# ============================================================

print("\n================================")
print("EBM NATIVE EXPLAINABILITY")
print("================================")

fitted_ebm = model.named_steps["classifier"]
preprocessor_fitted = model.named_steps["preprocessor"]

X_test_transformed = preprocessor_fitted.transform(X_test)
if hasattr(X_test_transformed, "toarray"):
    X_test_transformed = X_test_transformed.toarray()
X_test_transformed = X_test_transformed.astype(float)

# 1. Global Explanation (Top 15 Feature Importances)
global_explanation = fitted_ebm.explain_global()
global_data = global_explanation.data()

importance_df = pd.DataFrame(
    {
        "Feature": global_data["names"],
        "Importance": global_data["scores"],
    }
)
importance_df = importance_df.sort_values(by="Importance", ascending=False)

print("\nTop 15 Important Features (EBM Native Global Importance):")
print(importance_df.head(15).to_string(index=False))

# 2. Local Explanations (First 10 Individuals)
print("\nLocal Explanations for First 10 Individuals:")
local_explanation = fitted_ebm.explain_local(X_test_transformed[:10])

for i in range(10):
    person_data = local_explanation.data(i)
    scores = np.array(person_data["scores"])
    names = person_data["names"]
    
    # Sort features by absolute contribution to this person's prediction
    top_indices = np.argsort(np.abs(scores))[::-1][:3]
    top_factors = [f"{names[idx]}: {scores[idx]:+.3f}" for idx in top_indices]
    
    print(f"Person {i+1}: {y_prob[i] * 100:.2f}% | Top Factors: [{', '.join(top_factors)}]")


# ============================================================
# SAVE BASELINE MODEL
# ============================================================

model_dir = os.path.join(SCRIPT_DIR, "saved_models")
os.makedirs(model_dir, exist_ok=True)

baseline_path = os.path.join(model_dir, "ebm_baseline_model.pkl")

joblib.dump(model, baseline_path)

print("\n================================")
print("MODELS SAVED")
print("================================")
print(f"Baseline model:   {baseline_path}")
