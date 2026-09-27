import pandas as pd
import numpy as np
import os
import csv
from datetime import datetime
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
# STEP 6: SCENARIO SIMULATION MODEL
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

# Pre-fit simulation preprocessor to supply feature names to EBM
simulation_preprocessor.fit(X_sim_train)
sim_feature_names = list(simulation_preprocessor.get_feature_names_out())

simulation_ebm = ExplainableBoostingClassifier(feature_names=sim_feature_names, random_state=42)

simulation_model = Pipeline(
    steps=[
        ("preprocessor", simulation_preprocessor),
        ("classifier", simulation_ebm),
    ]
)

print("\n================================")
print("TRAINING SCENARIO SIMULATION MODEL")
print("================================")
simulation_model.fit(X_sim_train, y_sim_train)
y_sim_pred = simulation_model.predict(X_sim_test)
y_sim_prob = simulation_model.predict_proba(X_sim_test)[:, 1]

simulation_accuracy = accuracy_score(y_sim_test, y_sim_pred)
simulation_f1 = f1_score(y_sim_test, y_sim_pred)
simulation_auc = roc_auc_score(y_sim_test, y_sim_prob)

print(f"\nSimulation Model Accuracy: {simulation_accuracy:.4f}")
print(f"Simulation Model F1-Score: {simulation_f1:.4f}")
print(f"Simulation Model ROC-AUC:  {simulation_auc:.4f}")

print("\nClassification Report:")
print(classification_report(y_sim_test, y_sim_pred, target_names=["No Recidivism", "Recidivism"]))

print("\nConfusion Matrix:")
print(confusion_matrix(y_sim_test, y_sim_pred))

print("\nFirst 10 Simulation Model Probabilities:")
for i in range(10):
    print(f"Person {i+1}: {y_sim_prob[i] * 100:.2f}%")


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

current_risk = simulation_model.predict_proba(person)[0][1]
print("\nCurrent Predicted Risk:")
print(f"{current_risk * 100:.2f}%")

counterfactual_person = person.copy()
counterfactual_person["Program_Attendances"] = 6
counterfactual_person["Program_UnexcusedAbsences"] = 0
counterfactual_person["Percent_Days_Employed"] = 0.50
counterfactual_person["Jobs_Per_Year"] = 1.0

counterfactual_risk = simulation_model.predict_proba(counterfactual_person)[0][1]

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

risk1 = simulation_model.predict_proba(scenario1)[0][1]
risk2 = simulation_model.predict_proba(scenario2)[0][1]
risk3 = simulation_model.predict_proba(scenario3)[0][1]
risk4 = simulation_model.predict_proba(scenario4)[0][1]

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
            "EBM",
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

baseline_path = os.path.join(model_dir, "ebm_baseline_model.pkl")
simulation_path = os.path.join(model_dir, "ebm_simulation_model.pkl")

joblib.dump(model, baseline_path)
joblib.dump(simulation_model, simulation_path)

print("\n================================")
print("MODELS SAVED")
print("================================")
print(f"Baseline model:   {baseline_path}")
print(f"Simulation model: {simulation_path}")
