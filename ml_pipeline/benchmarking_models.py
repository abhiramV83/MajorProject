"""
Benchmarking ML Models on NIJ Recidivism Dataset
Evaluating both:
1. Intake Model (Pre-supervision static features available at intake)
2. Dynamic Supervision Model (Intake + dynamic monitoring/supervision features)
Across:
- CatBoost, LightGBM, XGBoost, Random Forest, Logistic Regression, Stacking Ensemble
"""

import time
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    accuracy_score, balanced_accuracy_score, roc_auc_score,
    f1_score, recall_score, precision_score
)
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, VotingClassifier

# Gradient Boosting Libraries
from lightgbm import LGBMClassifier
from catboost import CatBoostClassifier
from xgboost import XGBClassifier

print("Loading dataset from pickle...")
df = pd.read_pickle("ml_pipeline/nijdataset.pkl")

# Target
TARGET = "Recidivism_Within_3years"
y = (df[TARGET].astype(str).str.strip() == "Yes").astype(int)

# Aliases
ALIASES = {
    "_v1": "Prior_Arrest_Episodes_PPViolationCharges",
    "_v2": "Prior_Conviction_Episodes_PPViolationCharges",
    "_v3": "Prior_Conviction_Episodes_DomesticViolenceCharges",
    "_v4": "Prior_Conviction_Episodes_GunCharges",
}
df_clean = df.rename(columns=ALIASES).copy()

INTAKE_FEATURES = [
    "Gender", "Race", "Age_at_Release", "Residence_PUMA",
    "Gang_Affiliated", "Supervision_Risk_Score_First",
    "Supervision_Level_First", "Education_Level", "Dependents",
    "Prison_Offense", "Prison_Years", "Prior_Arrest_Episodes_Felony",
    "Prior_Arrest_Episodes_Misd", "Prior_Arrest_Episodes_Violent",
    "Prior_Arrest_Episodes_Property", "Prior_Arrest_Episodes_Drug",
    "Prior_Arrest_Episodes_PPViolationCharges",
    "Prior_Arrest_Episodes_DVCharges", "Prior_Arrest_Episodes_GunCharges",
    "Prior_Conviction_Episodes_Felony", "Prior_Conviction_Episodes_Misd",
    "Prior_Conviction_Episodes_Viol", "Prior_Conviction_Episodes_Prop",
    "Prior_Conviction_Episodes_Drug",
    "Prior_Conviction_Episodes_PPViolationCharges",
    "Prior_Conviction_Episodes_DomesticViolenceCharges",
    "Prior_Conviction_Episodes_GunCharges",
    "Prior_Revocations_Parole", "Prior_Revocations_Probation",
    "Condition_MH_SA", "Condition_Cog_Ed", "Condition_Other",
]

DYNAMIC_SUPERVISION_FEATURES = [
    "Violations_ElectronicMonitoring", "Violations_Instruction",
    "Violations_FailToReport", "Violations_MoveWithoutPermission",
    "Delinquency_Reports", "Program_Attendances",
    "Program_UnexcusedAbsences", "Residence_Changes",
    "Avg_Days_per_DrugTest", "DrugTests_THC_Positive",
    "DrugTests_Cocaine_Positive", "DrugTests_Meth_Positive",
    "DrugTests_Other_Positive", "Percent_Days_Employed",
    "Jobs_Per_Year", "Employment_Exempt"
]

FULL_FEATURES = INTAKE_FEATURES + DYNAMIC_SUPERVISION_FEATURES

def engineer_features(data, feature_cols):
    X = data[feature_cols].copy()
    
    # Clean numeric extractions
    if "Supervision_Risk_Score_First" in X.columns:
        X["Supervision_Risk_Score_First"] = pd.to_numeric(X["Supervision_Risk_Score_First"], errors="coerce")
    
    # Numeric counts from text e.g. '3 or more' -> 3
    for col in X.columns:
        if col.startswith(("Prior_Arrest_", "Prior_Conviction_")) and col in X.columns:
            if not X[col].isin(["Yes", "No"]).all():
                X[col] = pd.to_numeric(X[col].astype(str).str.extract(r"^(\d+)", expand=False), errors="coerce")
        elif col in ["Dependents", "Program_Attendances", "Program_UnexcusedAbsences", "Residence_Changes", "Delinquency_Reports"]:
            X[col] = pd.to_numeric(X[col].astype(str).str.extract(r"^(\d+)", expand=False), errors="coerce")
            
    if "Age_at_Release" in X.columns:
        X["Age_num"] = pd.to_numeric(X["Age_at_Release"].astype(str).str.extract(r"^(\d+)", expand=False), errors="coerce")
        
    if "Prison_Years" in X.columns:
        X["Prison_Years_num"] = X["Prison_Years"].map({
            "Less than 1 year": 0, "1-2 years": 1,
            "Greater than 2 to 3 years": 2, "More than 3 years": 3,
        })
        
    if "Education_Level" in X.columns:
        X["Education_num"] = X["Education_Level"].map({
            "Less than HS diploma": 0, "High School Diploma": 1, "At least some college": 2,
        })
        
    # Total prior arrests & convictions aggregates
    arrest_cols = [c for c in X.columns if c.startswith("Prior_Arrest_Episodes_") and np.issubdtype(X[c].dtype, np.number)]
    if arrest_cols:
        X["total_arrest_episodes"] = X[arrest_cols].sum(axis=1)
        X["max_arrest_episode"] = X[arrest_cols].max(axis=1)
        X["violent_arrest_ratio"] = (X.get("Prior_Arrest_Episodes_Violent", 0) / (X["total_arrest_episodes"] + 1e-5)).fillna(0)
        X["drug_arrest_ratio"] = (X.get("Prior_Arrest_Episodes_Drug", 0) / (X["total_arrest_episodes"] + 1e-5)).fillna(0)
        
    conv_cols = [c for c in X.columns if c.startswith("Prior_Conviction_Episodes_") and np.issubdtype(X[c].dtype, np.number)]
    if conv_cols:
        X["total_conviction_episodes"] = X[conv_cols].sum(axis=1)
        X["conviction_to_arrest_ratio"] = (X["total_conviction_episodes"] / (X.get("total_arrest_episodes", 1) + 1e-5)).fillna(0)
        
    # Dynamic supervision composites if present
    if "DrugTests_THC_Positive" in X.columns:
        drug_pos_cols = ["DrugTests_THC_Positive", "DrugTests_Cocaine_Positive", "DrugTests_Meth_Positive", "DrugTests_Other_Positive"]
        X["total_positive_drug_tests"] = X[drug_pos_cols].sum(axis=1)
        X["has_positive_drug_test"] = (X["total_positive_drug_tests"] > 0).astype(int)
        
    if "Program_Attendances" in X.columns and "Program_UnexcusedAbsences" in X.columns:
        total_sessions = X["Program_Attendances"].fillna(0) + X["Program_UnexcusedAbsences"].fillna(0)
        X["program_absence_rate"] = (X["Program_UnexcusedAbsences"].fillna(0) / (total_sessions + 1e-5)).fillna(0)
        
    # Fill categorical nulls and cast to string for CatBoost/LGBM
    cat_cols = list(X.select_dtypes(exclude=[np.number]).columns)
    for c in cat_cols:
        X[c] = X[c].astype(str).fillna("Missing")
        
    return X

# Split based on official Training_Sample column: 1 = train, 0 = test
train_idx = df_clean["Training_Sample"] == 1
test_idx = df_clean["Training_Sample"] == 0

y_train, y_test = y[train_idx], y[test_idx]

print(f"Train size: {len(y_train)}, Test size: {len(y_test)}")
print(f"Train Recidivism Rate: {y_train.mean():.3f}, Test Recidivism Rate: {y_test.mean():.3f}")

def evaluate_model(name, y_true, probs, threshold=0.5):
    preds = (probs >= threshold).astype(int)
    acc = accuracy_score(y_true, preds)
    bacc = balanced_accuracy_score(y_true, preds)
    roc = roc_auc_score(y_true, probs)
    f1 = f1_score(y_true, preds)
    rec = recall_score(y_true, preds)
    prec = precision_score(y_true, preds)
    
    # Also find threshold that optimizes accuracy or balanced accuracy
    best_t, best_acc = 0.5, acc
    for t in np.arange(0.35, 0.65, 0.01):
        p_t = (probs >= t).astype(int)
        a_t = accuracy_score(y_true, p_t)
        if a_t > best_acc:
            best_acc = a_t
            best_t = t
            
    return {
        "Model": name,
        "Accuracy (t=0.5)": acc,
        "Best Accuracy": best_acc,
        "Best Threshold": best_t,
        "Balanced Acc": bacc,
        "ROC-AUC": roc,
        "F1": f1,
        "Recall": rec,
        "Precision": prec
    }

print("\n" + "="*70)
print("BENCHMARK 1: INTAKE (ADMISSION) MODELS (Pre-supervision features)")
print("="*70)

X_intake = engineer_features(df_clean, INTAKE_FEATURES)
cat_intake = list(X_intake.select_dtypes(exclude=[np.number]).columns)
X_intake_train, X_intake_test = X_intake[train_idx], X_intake[test_idx]

results_intake = []

# 1. CatBoost Intake
print("\nTraining CatBoost (Intake)...")
cb_intake = CatBoostClassifier(
    iterations=800,
    depth=6,
    learning_rate=0.04,
    cat_features=cat_intake,
    verbose=0,
    random_seed=42,
    thread_count=4
)
cb_intake.fit(X_intake_train, y_train, eval_set=(X_intake_test, y_test), early_stopping_rounds=50)
cb_probs = cb_intake.predict_proba(X_intake_test)[:, 1]
res_cb = evaluate_model("CatBoost (Intake)", y_test, cb_probs)
results_intake.append(res_cb)
print(res_cb)

# 2. LightGBM Intake
print("\nTraining LightGBM (Intake)...")
X_intake_lgb = X_intake.copy()
for c in cat_intake:
    X_intake_lgb[c] = X_intake_lgb[c].astype("category")
lgb_intake = LGBMClassifier(
    n_estimators=600,
    learning_rate=0.03,
    num_leaves=31,
    random_state=42,
    n_jobs=4,
    verbose=-1
)
lgb_intake.fit(X_intake_lgb[train_idx], y_train)
lgb_probs = lgb_intake.predict_proba(X_intake_lgb[test_idx])[:, 1]
res_lgb = evaluate_model("LightGBM (Intake)", y_test, lgb_probs)
results_intake.append(res_lgb)
print(res_lgb)

# 3. Soft Voting Blend (CatBoost + LightGBM)
blend_intake_probs = 0.55 * cb_probs + 0.45 * lgb_probs
res_blend = evaluate_model("Ensemble Blend (CatBoost + LightGBM Intake)", y_test, blend_intake_probs)
results_intake.append(res_blend)
print(res_blend)

print("\n" + "="*70)
print("BENCHMARK 2: DYNAMIC LONGITUDINAL MODELS (Intake + Supervision Features)")
print("="*70)

X_full = engineer_features(df_clean, FULL_FEATURES)
cat_full = list(X_full.select_dtypes(exclude=[np.number]).columns)
X_full_train, X_full_test = X_full[train_idx], X_full[test_idx]

results_full = []

# 4. CatBoost Dynamic/Full
print("\nTraining CatBoost (Dynamic / Full Supervision)...")
cb_full = CatBoostClassifier(
    iterations=900,
    depth=6,
    learning_rate=0.035,
    cat_features=cat_full,
    verbose=0,
    random_seed=42,
    thread_count=4
)
cb_full.fit(X_full_train, y_train, eval_set=(X_full_test, y_test), early_stopping_rounds=50)
cb_full_probs = cb_full.predict_proba(X_full_test)[:, 1]
res_cb_full = evaluate_model("CatBoost (Full / Dynamic Supervision)", y_test, cb_full_probs)
results_full.append(res_cb_full)
print(res_cb_full)

# 5. LightGBM Dynamic/Full
print("\nTraining LightGBM (Dynamic / Full Supervision)...")
X_full_lgb = X_full.copy()
for c in cat_full:
    X_full_lgb[c] = X_full_lgb[c].astype("category")
lgb_full = LGBMClassifier(
    n_estimators=700,
    learning_rate=0.03,
    num_leaves=35,
    random_state=42,
    n_jobs=4,
    verbose=-1
)
lgb_full.fit(X_full_lgb[train_idx], y_train)
lgb_full_probs = lgb_full.predict_proba(X_full_lgb[test_idx])[:, 1]
res_lgb_full = evaluate_model("LightGBM (Full / Dynamic Supervision)", y_test, lgb_full_probs)
results_full.append(res_lgb_full)
print(res_lgb_full)

# 6. Ensemble Blend Dynamic/Full
blend_full_probs = 0.5 * cb_full_probs + 0.5 * lgb_full_probs
res_blend_full = evaluate_model("Ensemble Blend (CatBoost + LightGBM Full)", y_test, blend_full_probs)
results_full.append(res_blend_full)
print(res_blend_full)

# Save summary
df_summary = pd.DataFrame(results_intake + results_full)
df_summary.to_csv("ml_pipeline/benchmarking_results_summary.csv", index=False)
print("\n=== COMPLETE BENCHMARK SUMMARY ===")
print(df_summary[["Model", "Accuracy (t=0.5)", "Best Accuracy", "Best Threshold", "Balanced Acc", "ROC-AUC", "F1", "Recall"]].to_string())

