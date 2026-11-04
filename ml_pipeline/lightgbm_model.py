import pandas as pd
import os
import joblib

from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer

import lightgbm as lgb
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import shap

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
# 8. LIGHTGBM MODEL
# ============================================================

model = Pipeline(
    steps=[
        ("preprocessor", preprocessor),
        ("classifier", lgb.LGBMClassifier(n_estimators=100, learning_rate=0.1, random_state=42, verbose=-1)),
    ]
)


# ============================================================
# 9. TRAIN MODEL
# ============================================================

print("\nTraining LightGBM...")
model.fit(X_train, y_train)
print("Training completed!")


# ============================================================
# 10. PREDICTION
# ============================================================

y_pred = model.predict(X_test)


# ============================================================
# 11. ACCURACY
# ============================================================

accuracy = accuracy_score(y_test, y_pred)
print("\nAccuracy:", accuracy)


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

y_prob = model.predict_proba(X_test)[:, 1]

print("\nFirst 10 Predicted Recidivism Probabilities:")
for i in range(10):
    print(f"Person {i+1}: {y_prob[i] * 100:.2f}%")


# ============================================================
# SHAP EXPLAINABILITY (TreeExplainer)
# ============================================================

preprocessor_fitted = model.named_steps["preprocessor"]
lgb_clf = model.named_steps["classifier"]

X_test_transformed = preprocessor_fitted.transform(X_test)
if hasattr(X_test_transformed, "toarray"):
    X_test_transformed = X_test_transformed.toarray()
X_test_transformed = X_test_transformed.astype(float)

feature_names = preprocessor_fitted.get_feature_names_out()

explainer = shap.TreeExplainer(lgb_clf)
shap_values = explainer.shap_values(X_test_transformed[:10])

print("\nSHAP calculation completed!")
print("Number of transformed features:", len(feature_names))

if isinstance(shap_values, list):
    shap_for_recidivism = shap_values[1]
elif len(shap_values.shape) == 3:
    shap_for_recidivism = shap_values[:, :, 1]
else:
    shap_for_recidivism = shap_values

mean_shap = abs(shap_for_recidivism).mean(axis=0)

importance_df = pd.DataFrame({"Feature": feature_names, "Importance": mean_shap})
importance_df = importance_df.sort_values(by="Importance", ascending=False)

print("\nTop 15 Important Features:")
print(importance_df.head(15).to_string(index=False))


# ============================================================
# SAVE BASELINE MODEL
# ============================================================

model_dir = os.path.join(SCRIPT_DIR, "saved_models")
os.makedirs(model_dir, exist_ok=True)

baseline_path = os.path.join(model_dir, "lightgbm_baseline_model.pkl")

joblib.dump(model, baseline_path)

print("\n================================")
print("MODELS SAVED")
print("================================")
print(f"Baseline model:   {baseline_path}")

