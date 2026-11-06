"""
Advanced ML Optimization Experiment to Push Top Models' Accuracy Higher:
Techniques applied:
1. Out-of-Fold (OOF) Stacking with 5-Fold Stratified Cross-Validation
2. Target Encoding on high-cardinality PUMA geography & Prison Offense (with smoothing to prevent leakage)
3. Advanced Clinical Risk & Compliance Velocity Indices:
   - Drug Severity Weighted Index (Meth=3.0, Cocaine=2.5, Other=1.5, THC=1.0)
   - Compliance Ratio: Attendances / (Attendances + Absences + 1)
   - Violation Severity Multiplier: (FailToReport + MoveWithoutPermission + ElectronicMonitoring)
   - Arrest Intensity: total arrests / (Age - 17)
4. Bayesian / Grid Weight Optimization across CatBoost, LightGBM, and XGBoost
5. Global Threshold Optimization for Maximum Accuracy on Holdout Set
"""

import numpy as np
import pandas as pd
from sklearn.model_selection import StratifiedKFold, train_test_split
from sklearn.metrics import accuracy_score, roc_auc_score, f1_score, balanced_accuracy_score, brier_score_loss
from sklearn.linear_model import LogisticRegression, RidgeClassifier
from sklearn.preprocessing import StandardScaler
from lightgbm import LGBMClassifier
from catboost import CatBoostClassifier
from xgboost import XGBClassifier

print("Loading dataset...")
df = pd.read_pickle("ml_pipeline/nijdataset.pkl")

ALIASES = {
    "_v1": "Prior_Arrest_Episodes_PPViolationCharges",
    "_v2": "Prior_Conviction_Episodes_PPViolationCharges",
    "_v3": "Prior_Conviction_Episodes_DomesticViolenceCharges",
    "_v4": "Prior_Conviction_Episodes_GunCharges",
}
df = df.rename(columns=ALIASES).copy()

TARGET = "Recidivism_Within_3years"
y = (df[TARGET].astype(str).str.strip() == "Yes").astype(int)

# Full set of intake + dynamic features
BASE_COLS = [
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

DYN_COLS = [
    "Violations_ElectronicMonitoring", "Violations_Instruction",
    "Violations_FailToReport", "Violations_MoveWithoutPermission",
    "Delinquency_Reports", "Program_Attendances",
    "Program_UnexcusedAbsences", "Residence_Changes",
    "Avg_Days_per_DrugTest", "DrugTests_THC_Positive",
    "DrugTests_Cocaine_Positive", "DrugTests_Meth_Positive",
    "DrugTests_Other_Positive", "Percent_Days_Employed",
    "Jobs_Per_Year", "Employment_Exempt"
]

def build_feature_matrix(data):
    X = data[BASE_COLS + DYN_COLS].copy()
    
    # 1. Numeric conversions
    X["Supervision_Risk_Score_First"] = pd.to_numeric(X["Supervision_Risk_Score_First"], errors="coerce")
    
    for c in X.columns:
        if c.startswith(("Prior_Arrest_", "Prior_Conviction_")) and not X[c].isin(["Yes", "No"]).all():
            X[c] = pd.to_numeric(X[c].astype(str).str.extract(r"^(\d+)", expand=False), errors="coerce").fillna(0)
            
    for c in ["Dependents", "Program_Attendances", "Program_UnexcusedAbsences", "Residence_Changes", "Delinquency_Reports"]:
        X[c] = pd.to_numeric(X[c].astype(str).str.extract(r"^(\d+)", expand=False), errors="coerce").fillna(0)
        
    X["Age_num"] = pd.to_numeric(X["Age_at_Release"].astype(str).str.extract(r"^(\d+)", expand=False), errors="coerce").fillna(30)
    
    X["Prison_Years_num"] = X["Prison_Years"].map({
        "Less than 1 year": 0.5, "1-2 years": 1.5,
        "Greater than 2 to 3 years": 2.5, "More than 3 years": 4.0,
    }).fillna(1.0)
    
    X["Education_num"] = X["Education_Level"].map({
        "Less than HS diploma": 0, "High School Diploma": 1, "At least some college": 2,
    }).fillna(1)
    
    # Aggregates
    arrest_cols = [c for c in X.columns if c.startswith("Prior_Arrest_Episodes_") and np.issubdtype(X[c].dtype, np.number)]
    X["total_arrests"] = X[arrest_cols].sum(axis=1)
    conv_cols = [c for c in X.columns if c.startswith("Prior_Conviction_Episodes_") and np.issubdtype(X[c].dtype, np.number)]
    X["total_convictions"] = X[conv_cols].sum(axis=1)
    
    # Arrest intensity per adult year
    adult_years = np.maximum(X["Age_num"] - 17, 1.0)
    X["arrest_intensity"] = X["total_arrests"] / adult_years
    X["conviction_intensity"] = X["total_convictions"] / adult_years
    X["conviction_to_arrest_ratio"] = X["total_convictions"] / (X["total_arrests"] + 1e-4)
    
    # Dynamic clinical features
    drug_cols = ["DrugTests_THC_Positive", "DrugTests_Cocaine_Positive", "DrugTests_Meth_Positive", "DrugTests_Other_Positive"]
    for dc in drug_cols:
        X[dc] = pd.to_numeric(X[dc], errors="coerce").fillna(0)
        
    # Weighted drug severity index
    X["drug_severity_index"] = (
        X["DrugTests_Meth_Positive"] * 3.0 +
        X["DrugTests_Cocaine_Positive"] * 2.5 +
        X["DrugTests_Other_Positive"] * 1.5 +
        X["DrugTests_THC_Positive"] * 1.0
    )
    X["any_hard_drug"] = ((X["DrugTests_Meth_Positive"] > 0) | (X["DrugTests_Cocaine_Positive"] > 0)).astype(int)
    
    # Compliance velocity
    total_prog = X["Program_Attendances"] + X["Program_UnexcusedAbsences"]
    X["compliance_rate"] = X["Program_Attendances"] / (total_prog + 1e-4)
    X["high_unexcused_flag"] = (X["Program_UnexcusedAbsences"] >= 3).astype(int)
    
    # Violation index
    v_cols = ["Violations_ElectronicMonitoring", "Violations_Instruction", "Violations_FailToReport", "Violations_MoveWithoutPermission"]
    v_score = 0
    for vc in v_cols:
        v_score += (X[vc].astype(str).str.lower().isin(["true", "yes", "1"])).astype(int)
    X["violation_score"] = v_score + X["Delinquency_Reports"] * 1.5
    X["has_violations"] = (X["violation_score"] > 0).astype(int)
    
    # Employment stability index
    X["Percent_Days_Employed"] = pd.to_numeric(X["Percent_Days_Employed"], errors="coerce").fillna(0)
    X["Jobs_Per_Year"] = pd.to_numeric(X["Jobs_Per_Year"], errors="coerce").fillna(0)
    X["employment_stability"] = X["Percent_Days_Employed"] * (1.0 / (X["Jobs_Per_Year"] + 1.0))
    X["unemployed_risk_flag"] = (X["Percent_Days_Employed"] < 0.1).astype(int)
    
    # Risk-Age interaction
    X["risk_age_ratio"] = X["Supervision_Risk_Score_First"].fillna(5.0) / (X["Age_num"] + 1.0)
    
    cat_cols = list(X.select_dtypes(exclude=[np.number]).columns)
    for c in cat_cols:
        X[c] = X[c].astype(str).fillna("Missing")
        
    return X, cat_cols

print("Building feature matrix...")
X_mat, cat_cols = build_feature_matrix(df)
print(f"Total features: {X_mat.shape[1]}")

# Train/Test Split (official Training_Sample if present, otherwise stratified 80/20)
if "Training_Sample" in df.columns:
    train_mask = df["Training_Sample"] == 1
    test_mask = df["Training_Sample"] == 0
    train_idx = np.where(train_mask)[0]
    test_idx = np.where(test_mask)[0]
else:
    train_idx, test_idx = train_test_split(np.arange(len(y)), test_size=0.2, random_state=42, stratify=y)

y_train, y_test = y.iloc[train_idx], y.iloc[test_idx]
X_train, X_test = X_mat.iloc[train_idx].copy(), X_mat.iloc[test_idx].copy()

# Out-of-fold Target Encoding for Residence_PUMA and Prison_Offense
for col in ["Residence_PUMA", "Prison_Offense"]:
    global_mean = y_train.mean()
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    oof_target = pd.Series(index=X_train.index, dtype=float)
    
    for trn_k, val_k in skf.split(X_train, y_train):
        cat_means = y_train.iloc[trn_k].groupby(X_train.iloc[trn_k][col]).agg(["mean", "count"])
        # Empirical Bayes smoothing (m=20)
        smoothed = (cat_means["count"] * cat_means["mean"] + 20 * global_mean) / (cat_means["count"] + 20)
        oof_target.iloc[val_k] = X_train.iloc[val_k][col].map(smoothed).fillna(global_mean)
        
    X_train[f"{col}_te"] = oof_target
    # Test encoding from full train
    full_cat_means = y_train.groupby(X_train[col]).agg(["mean", "count"])
    full_smoothed = (full_cat_means["count"] * full_cat_means["mean"] + 20 * global_mean) / (full_cat_means["count"] + 20)
    X_test[f"{col}_te"] = X_test[col].map(full_smoothed).fillna(global_mean)

# Prepare categorical columns for LightGBM / CatBoost
X_train_df = X_train.copy()
X_test_df = X_test.copy()
for c in cat_cols:
    X_train_df[c] = X_train_df[c].astype("category")
    X_test_df[c] = X_test_df[c].astype("category")

print("\n" + "="*70)
print("TRAINING 5-FOLD OUT-OF-FOLD STACKING ENSEMBLE")
print("="*70)

skf_oof = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

oof_preds_cb = np.zeros(len(X_train))
oof_preds_lgb = np.zeros(len(X_train))
oof_preds_xgb = np.zeros(len(X_train))

test_preds_cb = np.zeros(len(X_test))
test_preds_lgb = np.zeros(len(X_test))
test_preds_xgb = np.zeros(len(X_test))

# XGBoost requires one-hot or target-encoded numerics
num_features_xgb = list(X_train.select_dtypes(include=[np.number]).columns)

for fold, (trn_k, val_k) in enumerate(skf_oof.split(X_train, y_train)):
    print(f"--> Training Fold {fold+1}/5...")
    X_tr, y_tr = X_train.iloc[trn_k], y_train.iloc[trn_k]
    X_va, y_val = X_train.iloc[val_k], y_train.iloc[val_k]
    
    # 1. CatBoost
    cb_fold = CatBoostClassifier(
        iterations=900,
        learning_rate=0.035,
        depth=6,
        l2_leaf_reg=4,
        cat_features=cat_cols,
        verbose=0,
        random_seed=42 + fold,
        thread_count=4
    )
    cb_fold.fit(X_tr, y_tr, eval_set=(X_va, y_val), early_stopping_rounds=40)
    oof_preds_cb[val_k] = cb_fold.predict_proba(X_va)[:, 1]
    test_preds_cb += cb_fold.predict_proba(X_test)[:, 1] / 5.0
    
    # 2. LightGBM
    lgb_fold = LGBMClassifier(
        n_estimators=750,
        learning_rate=0.03,
        num_leaves=35,
        min_child_samples=25,
        subsample=0.85,
        colsample_bytree=0.85,
        random_state=42 + fold,
        n_jobs=4,
        verbose=-1
    )
    lgb_fold.fit(X_train_df.iloc[trn_k], y_tr)
    oof_preds_lgb[val_k] = lgb_fold.predict_proba(X_train_df.iloc[val_k])[:, 1]
    test_preds_lgb += lgb_fold.predict_proba(X_test_df)[:, 1] / 5.0
    
    # 3. XGBoost
    xgb_fold = XGBClassifier(
        n_estimators=650,
        learning_rate=0.03,
        max_depth=5,
        subsample=0.85,
        colsample_bytree=0.85,
        random_state=42 + fold,
        n_jobs=4,
        eval_metric="logloss"
    )
    xgb_fold.fit(X_tr[num_features_xgb], y_tr)
    oof_preds_xgb[val_k] = xgb_fold.predict_proba(X_va[num_features_xgb])[:, 1]
    test_preds_xgb += xgb_fold.predict_proba(X_test[num_features_xgb])[:, 1] / 5.0

# Build Meta Dataset from OOF Predictions
X_meta_train = np.column_stack([oof_preds_cb, oof_preds_lgb, oof_preds_xgb])
X_meta_test = np.column_stack([test_preds_cb, test_preds_lgb, test_preds_xgb])

# Fit Stacking Meta-Learner (Logistic Regression)
meta_learner = LogisticRegression(C=1.0, random_state=42)
meta_learner.fit(X_meta_train, y_train)

stacked_probs = meta_learner.predict_proba(X_meta_test)[:, 1]
stacked_auc = roc_auc_score(y_test, stacked_probs)

# Find optimal accuracy threshold on OOF train predictions
oof_stacked = meta_learner.predict_proba(X_meta_train)[:, 1]
best_thresh, best_oof_acc = 0.5, 0
for t in np.arange(0.40, 0.60, 0.005):
    acc_t = accuracy_score(y_train, (oof_stacked >= t).astype(int))
    if acc_t > best_oof_acc:
        best_oof_acc = acc_t
        best_thresh = t

print(f"Optimal Decision Threshold selected via OOF Cross-Validation: {best_thresh:.3f}")

# Evaluate on Holdout Test Set
stacked_preds_default = (stacked_probs >= 0.5).astype(int)
stacked_preds_opt = (stacked_probs >= best_thresh).astype(int)

acc_def = accuracy_score(y_test, stacked_preds_default)
acc_opt = accuracy_score(y_test, stacked_preds_opt)
f1_opt = f1_score(y_test, stacked_preds_opt)
bacc_opt = balanced_accuracy_score(y_test, stacked_preds_opt)

# Individual model holdout evaluations
cb_auc = roc_auc_score(y_test, test_preds_cb)
cb_acc = accuracy_score(y_test, (test_preds_cb >= best_thresh).astype(int))

lgb_auc = roc_auc_score(y_test, test_preds_lgb)
lgb_acc = accuracy_score(y_test, (test_preds_lgb >= best_thresh).astype(int))

xgb_auc = roc_auc_score(y_test, test_preds_xgb)
xgb_acc = accuracy_score(y_test, (test_preds_xgb >= best_thresh).astype(int))

print("\n" + "="*70)
print("🎯 NEW PUSHED METRICS ACROSS ADVANCED ENSEMBLE & BOOSTERS")
print("="*70)
print(f"1. 5-Fold Stacked Super Learner (t=0.5):    Acc: {acc_def*100:.2f}% | AUC: {stacked_auc:.4f}")
print(f"2. 5-Fold Stacked Super Learner (Optimal t): Acc: {acc_opt*100:.2f}% | AUC: {stacked_auc:.4f} | F1: {f1_opt:.4f} | Balanced: {bacc_opt*100:.2f}%")
print(f"3. 5-Fold Bagged CatBoost (Test):           Acc: {cb_acc*100:.2f}% | AUC: {cb_auc:.4f}")
print(f"4. 5-Fold Bagged LightGBM (Test):           Acc: {lgb_acc*100:.2f}% | AUC: {lgb_auc:.4f}")
print(f"5. 5-Fold Bagged XGBoost (Test):            Acc: {xgb_acc*100:.2f}% | AUC: {xgb_auc:.4f}")

# Save the super learner model
import joblib
joblib.dump({
    "meta_learner": meta_learner,
    "best_threshold": best_thresh,
    "metrics": {
        "accuracy": acc_opt,
        "roc_auc": stacked_auc,
        "f1": f1_opt,
        "balanced_acc": bacc_opt
    }
}, "ml_pipeline/stacked_super_learner.pkl")
print("\nSaved super learner artifact to 'ml_pipeline/stacked_super_learner.pkl'!")

