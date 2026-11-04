import pandas as pd
import numpy as np
import os
import joblib

from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_predict
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    classification_report,
    confusion_matrix,
)

from xgboost import XGBClassifier
import lightgbm as lgb
import catboost as cb
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

print("\nCategorical columns:", len(categorical_features))
print("Numerical columns:", len(numerical_features))


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
# 8. ENSEMBLE BLEND MODEL (STACKING 3 BOOSTERS)
# ============================================================

print("\n================================")
print("BUILDING BASE BOOSTERS PIPELINES")
print("================================")

xgb_base = Pipeline(
    steps=[
        ("preprocessor", preprocessor),
        ("classifier", XGBClassifier(n_estimators=100, learning_rate=0.1, max_depth=5, eval_metric="logloss", random_state=42)),
    ]
)

lgb_base = Pipeline(
    steps=[
        ("preprocessor", preprocessor),
        ("classifier", lgb.LGBMClassifier(n_estimators=100, learning_rate=0.1, random_state=42, verbose=-1)),
    ]
)

cat_base = Pipeline(
    steps=[
        ("preprocessor", preprocessor),
        ("classifier", cb.CatBoostClassifier(iterations=100, learning_rate=0.1, depth=6, verbose=0, random_state=42)),
    ]
)

print("\nGenerating 5-Fold Stratified Out-Of-Fold predictions on training set...")
cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

oof_xgb = cross_val_predict(xgb_base, X_train, y_train, cv=cv, method="predict_proba")[:, 1]
oof_lgb = cross_val_predict(lgb_base, X_train, y_train, cv=cv, method="predict_proba")[:, 1]
oof_cat = cross_val_predict(cat_base, X_train, y_train, cv=cv, method="predict_proba")[:, 1]

X_meta_train = np.column_stack([oof_xgb, oof_lgb, oof_cat])

print("Out-of-fold meta features shape:", X_meta_train.shape)

# Fit Logistic Regression Meta-Model
meta_model = LogisticRegression(random_state=42)
meta_model.fit(X_meta_train, y_train)
print(f"Meta-model coefficients (XGB, LGBM, CatBoost): {meta_model.coef_[0]}")
print(f"Meta-model intercept: {meta_model.intercept_[0]:.4f}")

# Fit base models on full training set
print("\nFitting base models on full training set...")
xgb_base.fit(X_train, y_train)
lgb_base.fit(X_train, y_train)
cat_base.fit(X_train, y_train)
print("Base models fitted successfully!")

# Generate test predictions
test_xgb_prob = xgb_base.predict_proba(X_test)[:, 1]
test_lgb_prob = lgb_base.predict_proba(X_test)[:, 1]
test_cat_prob = cat_base.predict_proba(X_test)[:, 1]

X_meta_test = np.column_stack([test_xgb_prob, test_lgb_prob, test_cat_prob])

y_prob = meta_model.predict_proba(X_meta_test)[:, 1]
y_pred = meta_model.predict(X_meta_test)


# ============================================================
# EVALUATION METRICS
# ============================================================

accuracy = accuracy_score(y_test, y_pred)
precision = precision_score(y_test, y_pred)
recall = recall_score(y_test, y_pred)
f1 = f1_score(y_test, y_pred)
roc_auc = roc_auc_score(y_test, y_prob)

print("\n================================")
print("ENSEMBLE BLEND PERFORMANCE")
print("================================")
print(f"Accuracy:  {accuracy:.4f}")
print(f"Precision: {precision:.4f}")
print(f"Recall:    {recall:.4f}")
print(f"F1-Score:  {f1:.4f}")
print(f"ROC-AUC:   {roc_auc:.4f}")

print("\nClassification Report:")
print(classification_report(y_test, y_pred, target_names=["No Recidivism", "Recidivism"]))

print("\nConfusion Matrix:")
print(confusion_matrix(y_test, y_pred))

print("\nFirst 10 Predicted Recidivism Probabilities:")
for i in range(10):
    print(f"Person {i+1}: {y_prob[i] * 100:.2f}% (XGB: {test_xgb_prob[i]*100:.1f}%, LGB: {test_lgb_prob[i]*100:.1f}%, CAT: {test_cat_prob[i]*100:.1f}%)")


# ============================================================
# SHAP EXPLAINABILITY (AVERAGE OF 3 BASE TREE BOOSTERS)
# ============================================================

print("\n================================")
print("SHAP EXPLAINABILITY")
print("================================")

preprocessor_fitted = xgb_base.named_steps["preprocessor"]
X_test_transformed = preprocessor_fitted.transform(X_test)
if hasattr(X_test_transformed, "toarray"):
    X_test_transformed = X_test_transformed.toarray()
X_test_transformed = X_test_transformed.astype(float)
feature_names = preprocessor_fitted.get_feature_names_out()

sample_dense = X_test_transformed[:10]

# 1. XGBoost TreeExplainer
explainer_xgb = shap.TreeExplainer(xgb_base.named_steps["classifier"])
shap_xgb = explainer_xgb.shap_values(sample_dense)
if isinstance(shap_xgb, list):
    shap_xgb = shap_xgb[1]
elif len(shap_xgb.shape) == 3:
    shap_xgb = shap_xgb[:, :, 1]
mean_xgb = np.abs(shap_xgb).mean(axis=0)

# 2. LightGBM TreeExplainer
explainer_lgb = shap.TreeExplainer(lgb_base.named_steps["classifier"])
shap_lgb = explainer_lgb.shap_values(sample_dense)
if isinstance(shap_lgb, list):
    shap_lgb = shap_lgb[1]
elif len(shap_lgb.shape) == 3:
    shap_lgb = shap_lgb[:, :, 1]
mean_lgb = np.abs(shap_lgb).mean(axis=0)

# 3. CatBoost TreeExplainer
explainer_cat = shap.TreeExplainer(cat_base.named_steps["classifier"])
shap_cat = explainer_cat.shap_values(sample_dense)
if isinstance(shap_cat, list):
    shap_cat = shap_cat[1]
elif len(shap_cat.shape) == 3:
    shap_cat = shap_cat[:, :, 1]
mean_cat = np.abs(shap_cat).mean(axis=0)

# Average importance across all 3 boosters
mean_shap = (mean_xgb + mean_lgb + mean_cat) / 3.0

importance_df = pd.DataFrame({"Feature": feature_names, "Importance": mean_shap})
importance_df = importance_df.sort_values(by="Importance", ascending=False)

print("\nTop 15 Important Features (Average across XGBoost, LightGBM, CatBoost):")
print(importance_df.head(15).to_string(index=False))

print("\nNote: SHAP values are computed via TreeExplainer for each base booster and averaged across all three models as an approximation, since SHAP doesn't have a native stacking explainer.")


# ============================================================
# SAVE BASELINE MODEL
# ============================================================

model_dir = os.path.join(SCRIPT_DIR, "saved_models")
os.makedirs(model_dir, exist_ok=True)

baseline_path = os.path.join(model_dir, "ensemble_baseline_model.pkl")

# Save all three base pipelines + meta model as dict
joblib.dump(
    {
        "xgb": xgb_base,
        "lgbm": lgb_base,
        "catboost": cat_base,
        "meta": meta_model,
    },
    baseline_path,
)

print("\n================================")
print("MODELS SAVED")
print("================================")
print(f"Baseline ensemble model:   {baseline_path}")
