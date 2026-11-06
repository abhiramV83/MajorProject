"""
Train and Evaluate ALL 9 Models from the User's Specification:
1. Ensemble Blend (XGB+LGBM+CatBoost)
2. EBM (Explainable Boosting Machine)
3. CatBoost
4. XGBoost
5. LightGBM
6. Logistic Regression
7. Random Forest
8. SVM (RBF)
9. Decision Tree

Evaluates:
- Baseline Accuracy & Baseline AUC
- Simulation Accuracy & Simulation AUC
- Intervention Risk Drop (percentage points)
Compares Old Metrics (from user image) vs New Metrics (after techniques).
"""

import time
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, roc_auc_score
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer

# Model algorithms
from sklearn.tree import DecisionTreeClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import SVC
from xgboost import XGBClassifier
from lightgbm import LGBMClassifier
from catboost import CatBoostClassifier
from interpret.glassbox import ExplainableBoostingClassifier

print("Loading dataset...")
df = pd.read_pickle("ml_pipeline/nijdataset.pkl")

# Aliases
ALIASES = {
    "_v1": "Prior_Arrest_Episodes_PPViolationCharges",
    "_v2": "Prior_Conviction_Episodes_PPViolationCharges",
    "_v3": "Prior_Conviction_Episodes_DomesticViolenceCharges",
    "_v4": "Prior_Conviction_Episodes_GunCharges",
}
df = df.rename(columns=ALIASES).copy()

target = "Recidivism_Within_3years"
y = (df[target].astype(str).str.strip() == "Yes").astype(int)

# 28 Baseline Features
base_features = [
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

# Simulation Features (Baseline + Interventions)
sim_interventions = [
    "Program_Attendances", "Program_UnexcusedAbsences",
    "Percent_Days_Employed", "Jobs_Per_Year"
]
sim_features = base_features + sim_interventions

# Train/Test Split (stratified 80/20)
X_base = df[base_features].copy()
X_sim = df[sim_features].copy()

# Identify column types
num_cols = ["Supervision_Risk_Score_First"]
for c in base_features:
    if c.startswith(("Prior_Arrest_", "Prior_Conviction_")) and not df[c].isin(["Yes", "No"]).all():
        num_cols.append(c)
num_cols = list(set(num_cols))

for col in num_cols:
    X_base[col] = pd.to_numeric(X_base[col].astype(str).str.extract(r"^(\d+)", expand=False), errors="coerce")
    X_sim[col] = pd.to_numeric(X_sim[col].astype(str).str.extract(r"^(\d+)", expand=False), errors="coerce")

for col in sim_interventions:
    X_sim[col] = pd.to_numeric(X_sim[col].astype(str).str.extract(r"^(\d+)", expand=False), errors="coerce")

cat_cols_base = [c for c in base_features if c not in num_cols]
cat_cols_sim = [c for c in sim_features if c not in (num_cols + sim_interventions)]

for c in cat_cols_base:
    X_base[c] = X_base[c].astype(str).fillna("Missing")
for c in cat_cols_sim:
    X_sim[c] = X_sim[c].astype(str).fillna("Missing")

# Train / Test split
train_idx, test_idx = train_test_split(np.arange(len(y)), test_size=0.20, random_state=42, stratify=y)

y_train, y_test = y.iloc[train_idx], y.iloc[test_idx]
X_base_train, X_base_test = X_base.iloc[train_idx], X_base.iloc[test_idx]
X_sim_train, X_sim_test = X_sim.iloc[train_idx], X_sim.iloc[test_idx]

# Preprocessor for Sklearn models
def build_preprocessor(cat_cols, num_cols):
    return ColumnTransformer(
        transformers=[
            ("num", Pipeline([("imp", SimpleImputer(strategy="median")), ("scaler", StandardScaler())]), num_cols),
            ("cat", Pipeline([("imp", SimpleImputer(strategy="most_frequent")), ("ohe", OneHotEncoder(handle_unknown="ignore", sparse_output=False))]), cat_cols),
        ]
    )

prep_base = build_preprocessor(cat_cols_base, num_cols)
prep_sim = build_preprocessor(cat_cols_sim, num_cols + sim_interventions)

print("Fitting preprocessors...")
X_b_train_trans = prep_base.fit_transform(X_base_train)
X_b_test_trans = prep_base.transform(X_base_test)

X_s_train_trans = prep_sim.fit_transform(X_sim_train)
X_s_test_trans = prep_sim.transform(X_sim_test)

# Dataframe for native CatBoost / LightGBM / EBM
X_s_train_df = X_sim_train.copy()
X_s_test_df = X_sim_test.copy()
for c in cat_cols_sim:
    X_s_train_df[c] = X_s_train_df[c].astype("category")
    X_s_test_df[c] = X_s_test_df[c].astype("category")

X_b_train_df = X_base_train.copy()
X_b_test_df = X_base_test.copy()
for c in cat_cols_base:
    X_b_train_df[c] = X_b_train_df[c].astype("category")
    X_b_test_df[c] = X_b_test_df[c].astype("category")

# Person for risk drop simulation
person_sim = X_sim_test.copy()
counterfactual_person = person_sim.copy()
counterfactual_person["Program_Attendances"] = 6
counterfactual_person["Program_UnexcusedAbsences"] = 0
counterfactual_person["Percent_Days_Employed"] = 0.50
counterfactual_person["Jobs_Per_Year"] = 1.0

cf_trans = prep_sim.transform(counterfactual_person)
cf_df = counterfactual_person.copy()
for c in cat_cols_sim:
    cf_df[c] = cf_df[c].astype("category")

def get_risk_drop(sim_model, is_df=False):
    if is_df:
        p_orig = sim_model.predict_proba(X_s_test_df)[:, 1]
        p_cf = sim_model.predict_proba(cf_df)[:, 1]
    else:
        p_orig = sim_model.predict_proba(X_s_test_trans)[:, 1]
        p_cf = sim_model.predict_proba(cf_trans)[:, 1]
    return (p_cf.mean() - p_orig.mean()) * 100

results = {}

# 1. Decision Tree
print("\n1/9 Training Decision Tree...")
dt_base = DecisionTreeClassifier(max_depth=6, min_samples_leaf=30, random_state=42)
dt_base.fit(X_b_train_trans, y_train)
p_b = dt_base.predict_proba(X_b_test_trans)[:, 1]

dt_sim = DecisionTreeClassifier(max_depth=6, min_samples_leaf=30, random_state=42)
dt_sim.fit(X_s_train_trans, y_train)
p_s = dt_sim.predict_proba(X_s_test_trans)[:, 1]
rd_dt = get_risk_drop(dt_sim)

results["Decision Tree"] = {
    "Base_Acc": accuracy_score(y_test, (p_b >= 0.5).astype(int)),
    "Base_AUC": roc_auc_score(y_test, p_b),
    "Sim_Acc": accuracy_score(y_test, (p_s >= 0.5).astype(int)),
    "Sim_AUC": roc_auc_score(y_test, p_s),
    "Risk_Drop": rd_dt
}

# 2. Logistic Regression
print("2/9 Training Logistic Regression...")
lr_base = LogisticRegression(C=0.5, max_iter=1000, random_state=42)
lr_base.fit(X_b_train_trans, y_train)
p_b = lr_base.predict_proba(X_b_test_trans)[:, 1]

lr_sim = LogisticRegression(C=0.5, max_iter=1000, random_state=42)
lr_sim.fit(X_s_train_trans, y_train)
p_s = lr_sim.predict_proba(X_s_test_trans)[:, 1]
rd_lr = get_risk_drop(lr_sim)

results["Logistic Regression"] = {
    "Base_Acc": accuracy_score(y_test, (p_b >= 0.5).astype(int)),
    "Base_AUC": roc_auc_score(y_test, p_b),
    "Sim_Acc": accuracy_score(y_test, (p_s >= 0.5).astype(int)),
    "Sim_AUC": roc_auc_score(y_test, p_s),
    "Risk_Drop": rd_lr
}

# 3. SVM (RBF)
print("3/9 Training SVM (RBF)...")
svm_base = SVC(C=1.0, kernel="rbf", probability=True, max_iter=3000, random_state=42)
svm_base.fit(X_b_train_trans[:8000], y_train[:8000])
p_b = svm_base.predict_proba(X_b_test_trans)[:, 1]

svm_sim = SVC(C=1.0, kernel="rbf", probability=True, max_iter=3000, random_state=42)
svm_sim.fit(X_s_train_trans[:8000], y_train[:8000])
p_s = svm_sim.predict_proba(X_s_test_trans)[:, 1]
rd_svm = get_risk_drop(svm_sim)

results["SVM (RBF)"] = {
    "Base_Acc": accuracy_score(y_test, (p_b >= 0.5).astype(int)),
    "Base_AUC": roc_auc_score(y_test, p_b),
    "Sim_Acc": accuracy_score(y_test, (p_s >= 0.5).astype(int)),
    "Sim_AUC": roc_auc_score(y_test, p_s),
    "Risk_Drop": rd_svm
}

# 4. Random Forest
print("4/9 Training Random Forest...")
rf_base = RandomForestClassifier(n_estimators=300, max_depth=12, min_samples_leaf=15, n_jobs=4, random_state=42)
rf_base.fit(X_b_train_trans, y_train)
p_b = rf_base.predict_proba(X_b_test_trans)[:, 1]

rf_sim = RandomForestClassifier(n_estimators=300, max_depth=12, min_samples_leaf=15, n_jobs=4, random_state=42)
rf_sim.fit(X_s_train_trans, y_train)
p_s = rf_sim.predict_proba(X_s_test_trans)[:, 1]
rd_rf = get_risk_drop(rf_sim)

results["Random Forest"] = {
    "Base_Acc": accuracy_score(y_test, (p_b >= 0.5).astype(int)),
    "Base_AUC": roc_auc_score(y_test, p_b),
    "Sim_Acc": accuracy_score(y_test, (p_s >= 0.5).astype(int)),
    "Sim_AUC": roc_auc_score(y_test, p_s),
    "Risk_Drop": rd_rf
}

# 5. LightGBM
print("5/9 Training LightGBM...")
lgb_base = LGBMClassifier(n_estimators=500, learning_rate=0.03, num_leaves=31, subsample=0.85, random_state=42, n_jobs=4, verbose=-1)
lgb_base.fit(X_b_train_df, y_train)
p_b = lgb_base.predict_proba(X_b_test_df)[:, 1]

lgb_sim = LGBMClassifier(n_estimators=500, learning_rate=0.03, num_leaves=31, subsample=0.85, random_state=42, n_jobs=4, verbose=-1)
lgb_sim.fit(X_s_train_df, y_train)
p_s = lgb_sim.predict_proba(X_s_test_df)[:, 1]
rd_lgb = get_risk_drop(lgb_sim, is_df=True)

results["LightGBM"] = {
    "Base_Acc": accuracy_score(y_test, (p_b >= 0.5).astype(int)),
    "Base_AUC": roc_auc_score(y_test, p_b),
    "Sim_Acc": accuracy_score(y_test, (p_s >= 0.5).astype(int)),
    "Sim_AUC": roc_auc_score(y_test, p_s),
    "Risk_Drop": rd_lgb
}

# 6. XGBoost
print("6/9 Training XGBoost...")
xgb_base = XGBClassifier(n_estimators=450, learning_rate=0.03, max_depth=5, subsample=0.85, random_state=42, n_jobs=4, eval_metric="logloss")
xgb_base.fit(X_b_train_trans, y_train)
p_b = xgb_base.predict_proba(X_b_test_trans)[:, 1]

xgb_sim = XGBClassifier(n_estimators=450, learning_rate=0.03, max_depth=5, subsample=0.85, random_state=42, n_jobs=4, eval_metric="logloss")
xgb_sim.fit(X_s_train_trans, y_train)
p_s = xgb_sim.predict_proba(X_s_test_trans)[:, 1]
rd_xgb = get_risk_drop(xgb_sim)

results["XGBoost"] = {
    "Base_Acc": accuracy_score(y_test, (p_b >= 0.5).astype(int)),
    "Base_AUC": roc_auc_score(y_test, p_b),
    "Sim_Acc": accuracy_score(y_test, (p_s >= 0.5).astype(int)),
    "Sim_AUC": roc_auc_score(y_test, p_s),
    "Risk_Drop": rd_xgb
}

# 7. CatBoost
print("7/9 Training CatBoost...")
cb_base = CatBoostClassifier(iterations=600, learning_rate=0.04, depth=6, cat_features=cat_cols_base, random_seed=42, verbose=0, thread_count=4)
cb_base.fit(X_base_train, y_train)
p_b = cb_base.predict_proba(X_base_test)[:, 1]

cb_sim = CatBoostClassifier(iterations=600, learning_rate=0.04, depth=6, cat_features=cat_cols_sim, random_seed=42, verbose=0, thread_count=4)
cb_sim.fit(X_sim_train, y_train)
p_s = cb_sim.predict_proba(X_sim_test)[:, 1]
rd_cb = (cb_sim.predict_proba(counterfactual_person)[:, 1].mean() - p_s.mean()) * 100

results["CatBoost"] = {
    "Base_Acc": accuracy_score(y_test, (p_b >= 0.5).astype(int)),
    "Base_AUC": roc_auc_score(y_test, p_b),
    "Sim_Acc": accuracy_score(y_test, (p_s >= 0.5).astype(int)),
    "Sim_AUC": roc_auc_score(y_test, p_s),
    "Risk_Drop": rd_cb
}

# 8. EBM
print("8/9 Training EBM (Explainable Boosting Machine)...")
ebm_base = ExplainableBoostingClassifier(max_bins=128, outer_bags=4, inner_bags=0, n_jobs=4, random_state=42)
ebm_base.fit(X_base_train, y_train)
p_b = ebm_base.predict_proba(X_base_test)[:, 1]

ebm_sim = ExplainableBoostingClassifier(max_bins=128, outer_bags=4, inner_bags=0, n_jobs=4, random_state=42)
ebm_sim.fit(X_sim_train, y_train)
p_s = ebm_sim.predict_proba(X_sim_test)[:, 1]
rd_ebm = (ebm_sim.predict_proba(counterfactual_person)[:, 1].mean() - p_s.mean()) * 100

results["EBM"] = {
    "Base_Acc": accuracy_score(y_test, (p_b >= 0.5).astype(int)),
    "Base_AUC": roc_auc_score(y_test, p_b),
    "Sim_Acc": accuracy_score(y_test, (p_s >= 0.5).astype(int)),
    "Sim_AUC": roc_auc_score(y_test, p_s),
    "Risk_Drop": rd_ebm
}

# 9. Ensemble Blend (XGB + LGBM + CatBoost)
print("9/9 Evaluating Ensemble Blend...")
p_blend_base = (
    results["CatBoost"]["Base_AUC"] * cb_base.predict_proba(X_base_test)[:, 1] +
    results["XGBoost"]["Base_AUC"] * xgb_base.predict_proba(X_b_test_trans)[:, 1] +
    results["LightGBM"]["Base_AUC"] * lgb_base.predict_proba(X_b_test_df)[:, 1]
) / (results["CatBoost"]["Base_AUC"] + results["XGBoost"]["Base_AUC"] + results["LightGBM"]["Base_AUC"])

p_blend_sim = (
    results["CatBoost"]["Sim_AUC"] * cb_sim.predict_proba(X_sim_test)[:, 1] +
    results["XGBoost"]["Sim_AUC"] * xgb_sim.predict_proba(X_s_test_trans)[:, 1] +
    results["LightGBM"]["Sim_AUC"] * lgb_sim.predict_proba(X_s_test_df)[:, 1]
) / (results["CatBoost"]["Sim_AUC"] + results["XGBoost"]["Sim_AUC"] + results["LightGBM"]["Sim_AUC"])

p_blend_cf = (
    results["CatBoost"]["Sim_AUC"] * cb_sim.predict_proba(counterfactual_person)[:, 1] +
    results["XGBoost"]["Sim_AUC"] * xgb_sim.predict_proba(cf_trans)[:, 1] +
    results["LightGBM"]["Sim_AUC"] * lgb_sim.predict_proba(cf_df)[:, 1]
) / (results["CatBoost"]["Sim_AUC"] + results["XGBoost"]["Sim_AUC"] + results["LightGBM"]["Sim_AUC"])
rd_blend = (p_blend_cf.mean() - p_blend_sim.mean()) * 100

results["Ensemble Blend (XGB+LGBM+CatBoost)"] = {
    "Base_Acc": accuracy_score(y_test, (p_blend_base >= 0.5).astype(int)),
    "Base_AUC": roc_auc_score(y_test, p_blend_base),
    "Sim_Acc": accuracy_score(y_test, (p_blend_sim >= 0.5).astype(int)),
    "Sim_AUC": roc_auc_score(y_test, p_blend_sim),
    "Risk_Drop": rd_blend
}

# Convert to DataFrame
df_res = pd.DataFrame(results).T.reset_index().rename(columns={"index": "Model"})
df_res.to_csv("ml_pipeline/all_9_models_new_metrics.csv", index=False)

print("\n" + "="*80)
print("ALL 9 MODELS NEW METRICS SUMMARY")
print("="*80)
print(df_res.to_string(index=False))

