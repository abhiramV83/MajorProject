import pandas as pd
import numpy as np
import os
import csv
from datetime import datetime
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

df = pd.read_excel("nijdataset.xlsx")

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

print("\nIntervention-related columns:")
intervention_features = [
    "Program_Attendances",
    "Program_UnexcusedAbsences",
    "Percent_Days_Employed",
    "Jobs_Per_Year",
    "DrugTests_THC_Positive",
    "DrugTests_Cocaine_Positive",
    "Violations_ElectronicMonitoring",
    "Violations_Instruction",
    "Violations_FailToReport",
]

for column in intervention_features:
    print(f"\n{column}:")
    print(df[column].head(5).to_list())


# ============================================================
# STEP 6: SCENARIO SIMULATION ENSEMBLE MODEL
# ============================================================

simulation_features = features + [
    "Program_Attendances",
    "Program_UnexcusedAbsences",
    "Percent_Days_Employed",
    "Jobs_Per_Year",
]

X_sim = df[simulation_features].copy()
y_sim = df[target].copy().map({"No": 0, "Yes": 1})

simulation_categorical = categorical_features.copy()
simulation_numerical = numerical_features.copy() + [
    "Program_Attendances",
    "Program_UnexcusedAbsences",
    "Percent_Days_Employed",
    "Jobs_Per_Year",
]

for column in simulation_categorical:
    X_sim[column] = X_sim[column].fillna("Missing").astype(str)

for column in simulation_numerical:
    X_sim[column] = pd.to_numeric(X_sim[column], errors="coerce")

simulation_categorical_transformer = Pipeline(
    steps=[
        ("imputer", SimpleImputer(strategy="most_frequent")),
        ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
    ]
)

simulation_numerical_transformer = Pipeline(
    steps=[("imputer", SimpleImputer(strategy="median"))]
)

simulation_preprocessor = ColumnTransformer(
    transformers=[
        ("categorical", simulation_categorical_transformer, simulation_categorical),
        ("numerical", simulation_numerical_transformer, simulation_numerical),
    ]
)

X_sim_train, X_sim_test, y_sim_train, y_sim_test = train_test_split(
    X_sim, y_sim, test_size=0.2, random_state=42, stratify=y_sim
)

print("\n================================")
print("TRAINING SCENARIO SIMULATION ENSEMBLE")
print("================================")

sim_xgb = Pipeline(
    steps=[
        ("preprocessor", simulation_preprocessor),
        ("classifier", XGBClassifier(n_estimators=100, learning_rate=0.1, max_depth=5, eval_metric="logloss", random_state=42)),
    ]
)

sim_lgb = Pipeline(
    steps=[
        ("preprocessor", simulation_preprocessor),
        ("classifier", lgb.LGBMClassifier(n_estimators=100, learning_rate=0.1, random_state=42, verbose=-1)),
    ]
)

sim_cat = Pipeline(
    steps=[
        ("preprocessor", simulation_preprocessor),
        ("classifier", cb.CatBoostClassifier(iterations=100, learning_rate=0.1, depth=6, verbose=0, random_state=42)),
    ]
)

print("Computing simulation out-of-fold predictions...")
oof_sim_xgb = cross_val_predict(sim_xgb, X_sim_train, y_sim_train, cv=cv, method="predict_proba")[:, 1]
oof_sim_lgb = cross_val_predict(sim_lgb, X_sim_train, y_sim_train, cv=cv, method="predict_proba")[:, 1]
oof_sim_cat = cross_val_predict(sim_cat, X_sim_train, y_sim_train, cv=cv, method="predict_proba")[:, 1]

X_sim_meta_train = np.column_stack([oof_sim_xgb, oof_sim_lgb, oof_sim_cat])

meta_sim_model = LogisticRegression(random_state=42)
meta_sim_model.fit(X_sim_meta_train, y_sim_train)

# Fit simulation base pipelines on full simulation train set
print("Fitting simulation base models on full training set...")
sim_xgb.fit(X_sim_train, y_sim_train)
sim_lgb.fit(X_sim_train, y_sim_train)
sim_cat.fit(X_sim_train, y_sim_train)

test_sim_xgb = sim_xgb.predict_proba(X_sim_test)[:, 1]
test_sim_lgb = sim_lgb.predict_proba(X_sim_test)[:, 1]
test_sim_cat = sim_cat.predict_proba(X_sim_test)[:, 1]

X_sim_meta_test = np.column_stack([test_sim_xgb, test_sim_lgb, test_sim_cat])

y_sim_prob = meta_sim_model.predict_proba(X_sim_meta_test)[:, 1]
y_sim_pred = meta_sim_model.predict(X_sim_meta_test)

simulation_accuracy = accuracy_score(y_sim_test, y_sim_pred)
simulation_f1 = f1_score(y_sim_test, y_sim_pred)
simulation_auc = roc_auc_score(y_sim_test, y_sim_prob)

print(f"\nSimulation Ensemble Accuracy: {simulation_accuracy:.4f}")
print(f"Simulation Ensemble F1-Score: {simulation_f1:.4f}")
print(f"Simulation Ensemble ROC-AUC:  {simulation_auc:.4f}")

print("\nClassification Report:")
print(classification_report(y_sim_test, y_sim_pred, target_names=["No Recidivism", "Recidivism"]))

print("\nConfusion Matrix:")
print(confusion_matrix(y_sim_test, y_sim_pred))

print("\nFirst 10 Simulation Model Probabilities:")
for i in range(10):
    print(f"Person {i+1}: {y_sim_prob[i] * 100:.2f}%")


# Helper function to predict blended risk for scenario simulation
def predict_blend_risk(df_input):
    p_xgb = sim_xgb.predict_proba(df_input)[:, 1]
    p_lgb = sim_lgb.predict_proba(df_input)[:, 1]
    p_cat = sim_cat.predict_proba(df_input)[:, 1]
    meta_in = np.column_stack([p_xgb, p_lgb, p_cat])
    return meta_sim_model.predict_proba(meta_in)[0, 1]


# ============================================================
# STEP 7: COUNTERFACTUAL SIMULATION
# ============================================================

person = X_sim_test.iloc[[0]].copy()

print("\n================================")
print("COUNTERFACTUAL SIMULATION")
print("================================")

print("\nOriginal values:")
print("Program Attendances:", person["Program_Attendances"].iloc[0])
print("Program Unexcused Absences:", person["Program_UnexcusedAbsences"].iloc[0])
print("Percent Days Employed:", person["Percent_Days_Employed"].iloc[0])
print("Jobs Per Year:", person["Jobs_Per_Year"].iloc[0])

current_risk = predict_blend_risk(person)

print("\nCurrent Predicted Risk:")
print(f"{current_risk * 100:.2f}%")

counterfactual_person = person.copy()
counterfactual_person["Program_Attendances"] = 6
counterfactual_person["Program_UnexcusedAbsences"] = 0
counterfactual_person["Percent_Days_Employed"] = 0.50
counterfactual_person["Jobs_Per_Year"] = 1.0

counterfactual_risk = predict_blend_risk(counterfactual_person)

print("\nHypothetical Scenario:")
print("Program Attendances: 6")
print("Program Unexcused Absences: 0")
print("Percent Days Employed: 50%")
print("Jobs Per Year: 1")

print("\nHypothetical Predicted Risk:")
print(f"{counterfactual_risk * 100:.2f}%")

risk_difference = counterfactual_risk - current_risk
print("\nChange in Predicted Risk:")
print(f"{risk_difference * 100:.2f} percentage points")


# ============================================================
# STEP 8: MULTIPLE COUNTERFACTUAL SCENARIOS
# ============================================================

print("\n================================")
print("MULTIPLE SCENARIO SIMULATION")
print("================================")

scenario1 = person.copy()

scenario2 = person.copy()
scenario2["Program_Attendances"] = 6

scenario3 = person.copy()
scenario3["Program_Attendances"] = 6
scenario3["Percent_Days_Employed"] = 0.50

scenario4 = person.copy()
scenario4["Program_Attendances"] = 6
scenario4["Percent_Days_Employed"] = 0.50
scenario4["Program_UnexcusedAbsences"] = 0

risk1 = predict_blend_risk(scenario1)
risk2 = predict_blend_risk(scenario2)
risk3 = predict_blend_risk(scenario3)
risk4 = predict_blend_risk(scenario4)

print("\nScenario Results:")
print(f"Scenario 1 - Current Situation: {risk1 * 100:.2f}%")
print(f"Scenario 2 - Higher Program Attendance: {risk2 * 100:.2f}%")
print(f"Scenario 3 - Attendance + Employment: {risk3 * 100:.2f}%")
print(f"Scenario 4 - Attendance + Employment + No Unexcused Absences: {risk4 * 100:.2f}%")

print("\nChange from Current Scenario:")
print(f"Scenario 2: {(risk2 - risk1) * 100:.2f} percentage points")
print(f"Scenario 3: {(risk3 - risk1) * 100:.2f} percentage points")
print(f"Scenario 4: {(risk4 - risk1) * 100:.2f} percentage points")


# ============================================================
# STEP 9: AUTOMATIC SCENARIO RECOMMENDATION
# ============================================================

print("\n================================")
print("AUTOMATIC SCENARIO RECOMMENDATION")
print("================================")

scenario_results = {
    "Current Situation": risk1,
    "Higher Program Attendance": risk2,
    "Attendance + Employment": risk3,
    "Attendance + Employment + No Unexcused Absences": risk4,
}

recommended_scenario = min(scenario_results, key=scenario_results.get)
recommended_risk = scenario_results[recommended_scenario]
recommended_change = (recommended_risk - risk1) * 100

print("\nCurrent Predicted Risk:")
print(f"{risk1 * 100:.2f}%")
print("\nRecommended Scenario for Practitioner Review:")
print(recommended_scenario)
print("\nSimulated Predicted Risk:")
print(f"{recommended_risk * 100:.2f}%")
print("\nChange from Current Risk:")
print(f"{recommended_change:.2f} percentage points")
print("\nRecommendation:")
print("This scenario produced the lowest predicted risk among the simulated scenarios and can be reviewed by the practitioner.")
print("\nNote: This is a model-based hypothetical scenario, not a proven causal intervention effect.")


# ============================================================
# STEP 10: HUMAN-IN-THE-LOOP
# ============================================================

print("\n================================")
print("HUMAN-IN-THE-LOOP DECISION")
print("================================")
print("\nAI Suggested Scenario:")
print(recommended_scenario)
print(f"Simulated Predicted Risk: {recommended_risk * 100:.2f}%")
print("\nPractitioner Options:")
print("1. Accept")
print("2. Modify")
print("3. Reject")

try:
    choice = input("\nEnter your choice (1/2/3): ")
except (EOFError, KeyboardInterrupt):
    choice = "1"

if not choice or choice.strip() == "":
    choice = "1"

choice = choice.strip()

if choice == "1":
    decision = "Accepted"
    print("\nPractitioner Decision: ACCEPTED")
    print("The practitioner accepted the AI-suggested scenario.")
elif choice == "2":
    decision = "Modified"
    print("\nPractitioner Decision: MODIFIED")
    print("The practitioner chose to modify the AI-suggested scenario.")
elif choice == "3":
    decision = "Rejected"
    print("\nPractitioner Decision: REJECTED")
    print("The practitioner rejected the AI-suggested scenario.")
else:
    decision = "Invalid"
    print("\nInvalid choice.")

print("\nFinal Decision Status:")
print(decision)


# ============================================================
# STEP 11: AUDIT / FEEDBACK LOG
# ============================================================

print("\n================================")
print("AUDIT / FEEDBACK LOG")
print("================================")

log_dir = "logs"
os.makedirs(log_dir, exist_ok=True)
log_file = os.path.join(log_dir, "decision_log.csv")
file_exists = os.path.exists(log_file)

with open(log_file, "a", newline="", encoding="utf-8") as file:
    writer = csv.writer(file)
    if not file_exists:
        writer.writerow(
            [
                "Date_Time",
                "Model_Type",
                "Current_Risk",
                "Recommended_Scenario",
                "Simulated_Risk",
                "Risk_Change",
                "Practitioner_Decision",
            ]
        )
    writer.writerow(
        [
            datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "Ensemble_Blend",
            f"{risk1 * 100:.2f}%",
            recommended_scenario,
            f"{recommended_risk * 100:.2f}%",
            f"{recommended_change:.2f} percentage points",
            decision,
        ]
    )

print("\nDecision saved successfully!")
print("Audit file:", log_file)


# ============================================================
# STEP 13A: SAVE MODELS
# ============================================================

model_dir = "saved_models"
os.makedirs(model_dir, exist_ok=True)

baseline_path = os.path.join(model_dir, "ensemble_baseline_model.pkl")
simulation_path = os.path.join(model_dir, "ensemble_simulation_model.pkl")

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

joblib.dump(
    {
        "xgb": sim_xgb,
        "lgbm": sim_lgb,
        "catboost": sim_cat,
        "meta": meta_sim_model,
    },
    simulation_path,
)

print("\n================================")
print("MODELS SAVED")
print("================================")
print(f"Baseline ensemble model:   {baseline_path}")
print(f"Simulation ensemble model: {simulation_path}")
