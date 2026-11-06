# MASTER CODEX PROMPT: BACKEND & ML LOGIC IMPLEMENTATION
## Drug Court Decision Support System (DSS) — Closed-Loop Longitudinal Architecture

---

### 1. PROJECT CONTEXT & RESEARCH FOUNDATION

- **Project Title:** *Designing Transparent, Equitable, and Efficient Decision Support Systems for Drug Courts Using Machine Learning*
- **Institution:** Kakatiya Institute of Technology & Science, Warangal (KITS Warangal) — Batch 8
- **Supervisor:** Sri. H. Bunny Charles (Assistant Professor, Dept. of CSE)
- **Student Team:** Lakavath Ranjani, Veludandi Abhiram, Masadi Hansika Rao, Siribadri Veda Vyshnavi
- **Research Foundation:** Zolbanin et al. (*Decision Support Systems*, Elsevier, 2026).
- **Core Research Gap & Novelty:**
  - *Base Paper Limitation:* Static point-in-time risk assessment at intake ($t_0$) using Random Forest + SHAP + OpenAI o1-preview. It does not monitor compliance during court supervision or evaluate how interventions alter risk.
  - *Our Novel Extension:* **Closed-Loop Dynamic Longitudinal Monitoring & Counterfactual Simulation**:
    $$\text{Intake Risk } (t_0) \longrightarrow \text{Interventions} \longrightarrow \text{Dynamic Monitoring } (t_1, t_2\dots) \longrightarrow \text{Updated Risk } \longrightarrow \Delta\text{Risk} \longrightarrow \text{Traj. Flag (🟢 IMPROVING vs 🚨 ALERT)} \longrightarrow \text{What-If Simulation} \longrightarrow \text{GenAI Clinical Orders} \longrightarrow \text{HITL Judicial Sign-Off}$$

---

### 2. ML MODELS & ASSETS (SINGLE SOURCE OF TRUTH)

All models are trained and benchmarked on the official 25,835 NIJ Recidivism Challenge dataset with fixed random seed `42` and the official 70/30 holdout split (`Training_Sample == 0`, 7,807 holdout test rows).

The serialized model artifacts already exist in the repository:
1. **Intake Champion Model:**
   - **Path:** `ml_pipeline/champion_intake_model.pkl` (mirrored at `models/champion_intake_model.pkl`)
   - **Algorithm:** CatBoost Classifier
   - **Features:** 41 static pre-supervision features (prior arrests, felonies, age at first arrest, demographics, trauma/ACE scores)
   - **Performance:** Holdout Accuracy: `68.57%`, ROC-AUC: `0.7355`, Recall: `80.28%`, Optimal Threshold: `0.515`
2. **Dynamic Champion Model:**
   - **Path:** `ml_pipeline/champion_dynamic_model.pkl` (mirrored at `models/champion_dynamic_model.pkl`)
   - **Algorithm:** CatBoost Classifier
   - **Features:** 60 features (41 static + 19 dynamic supervision features: drug testing compliance, attendance rates, employment %, sanction/incentive ratios)
   - **Performance:** Holdout Accuracy: `75.02%`, ROC-AUC: `0.8197`, Recall: `84.23%`, F1: `0.7948`, Threshold: `0.500`
3. **Counterfactual Simulation Engine:**
   - **Path:** `ml_pipeline/saved_models/counterfactual_simulation_model.pkl` (mirrored at `models/counterfactual_simulation_model.pkl`)
   - **Logic:** Computes quantitative risk reduction ($\Delta\text{Risk} = \text{Simulated Risk} - \text{Baseline Risk}$) and logs every simulation to `backend/logs/decision_log.csv`.

---

### 3. DATABASE CONFIGURATION (POSTGRESQL NEONDB + SQLITE FALLBACK)

- **Config File:** `backend/app/config.py`
- **Connection File:** `backend/app/database/connection.py`
- **Environment:** In `backend/.env`, set:
  ```env
  DATABASE_URL=postgresql://<user>:<password>@<ep-xyz>.us-east-2.aws.neon.tech/drugcourt_db?sslmode=require
  # Fallback: DATABASE_URL=sqlite:///drugcourt_dev.db
  SECRET_KEY=dev-secret-key-change-in-production-drug-court-32chars
  ALGORITHM=HS256
  ACCESS_TOKEN_EXPIRE_MINUTES=480
  OPENAI_API_KEY=
  OPENAI_MODEL=gpt-4o-mini
  ```
- **Connection Engine:** Ensure `create_engine(DATABASE_URL, pool_pre_ping=True)` handles NeonDB idle disconnects without crashing.

---

### 4. EXACT TASKS FOR CODEX TO COMPLETE

#### Task 1: Implement Counterfactual Simulation Endpoint
In `backend/app/routers/assessments_router.py`, implement:
```http
POST /api/assessments/{assessment_id}/simulate
```
**Request Body (`SimulationRequest`):**
```json
{
  "program_attendances": 24,
  "program_unexcused_absences": 0,
  "percent_days_employed": 0.85,
  "drug_tests_clean": true
}
```
**Execution Logic:**
1. Fetch `Assessment` by `assessment_id` and associated `Participant`.
2. Extract baseline participant feature dictionary using `participant_to_features(participant)`.
3. Compute baseline probability using `app.ml.pipeline.predict(features)`.
4. Apply the simulation modifications to the features:
   - `features["program_attendances"] = body.program_attendances`
   - `features["program_unexcused_absences"] = body.program_unexcused_absences`
   - `features["percent_days_employed"] = body.percent_days_employed`
   - If `body.drug_tests_clean` is `True`, set `features["drug_tests_positive_count"] = 0` (or `DrugTests_THC_Positive = 0`, etc.).
5. Run prediction with modified features to obtain `simulated_probability`.
6. Calculate `delta_risk = simulated_probability - baseline_probability`.
7. Determine `simulated_risk_level`:
   - `< 0.35` $\rightarrow$ `LOW`
   - `0.35` to `0.65` $\rightarrow$ `MEDIUM`
   - `> 0.65` $\rightarrow$ `HIGH`
8. Store the scenario in `assessment.simulated_scenarios`.
9. Log audit action `SIMULATION_EXECUTED` in `AuditLog` and append to `backend/logs/decision_log.csv`.
10. **Response format:**
    ```json
    {
      "baseline_risk": 0.542,
      "simulated_risk": 0.321,
      "delta_risk": -0.221,
      "simulated_risk_level": "LOW",
      "recommendation": "Increasing supervised attendance to 24 sessions and maintaining 85% employment reduces recidivism probability by 22.1%."
    }
    ```

---

#### Task 2: Implement Longitudinal Trajectory Endpoint
In `backend/app/routers/participants_router.py`, implement:
```http
GET /api/participants/{participant_id}/trajectory
```
**Execution Logic:**
1. Check `RiskTrajectory` table for `participant_id`, ordered by `recorded_at asc`.
2. If records exist, return them as `List[RiskTrajectoryOut]`.
3. If no records exist in `RiskTrajectory`, query the participant's `Assessment` records ordered by `assessment_date asc`:
   - Synthesize trajectory points:
     - Point 0: Stage `INTAKE`, `risk_probability`, `delta_risk = 0.0`, `trajectory_flag = "BASELINE"`.
     - Subsequent points: Stage `DYNAMIC`, `risk_probability`, `delta_risk = current_prob - prior_prob`, `trajectory_flag = "IMPROVING"` (if delta < -0.05), `"ALERT"` (if delta > 0.05), else `"STABLE"`.
4. Return `List[RiskTrajectoryOut]`:
   ```json
   [
     {
       "id": 1,
       "participant_id": 12,
       "assessment_id": 1,
       "model_stage": "INTAKE",
       "risk_probability": 0.582,
       "risk_level": "MEDIUM",
       "delta_risk": 0.0,
       "trajectory_flag": "BASELINE",
       "recorded_at": "2026-09-15T10:00:00Z",
       "notes": "Intake assessment baseline"
     },
     {
       "id": 2,
       "participant_id": 12,
       "assessment_id": 4,
       "model_stage": "DYNAMIC",
       "risk_probability": 0.385,
       "risk_level": "LOW",
       "delta_risk": -0.197,
       "trajectory_flag": "IMPROVING",
       "recorded_at": "2026-10-20T14:30:00Z",
       "notes": "Supervision checkpoint 1"
     }
   ]
   ```

---

#### Task 3: Automatic Longitudinal Tracking on Assessment Prediction
In `backend/app/routers/assessments_router.py`, inside `run_prediction(assessment_id)`:
1. Check if the participant has any prior completed assessment:
   ```python
   prior_assessment = db.query(Assessment).filter(
       Assessment.participant_id == assessment.participant_id,
       Assessment.id != assessment.id,
       Assessment.recidivism_probability.isnot(None)
   ).order_by(Assessment.assessment_date.desc()).first()
   ```
2. If `prior_assessment` exists:
   - Set `assessment.assessment_stage = "DYNAMIC"`
   - Compute `delta = result["probability"] - prior_assessment.recidivism_probability`
   - Set `assessment.delta_risk = delta`
   - Set `assessment.trajectory_flag`:
     - `"IMPROVING"` if `delta < -0.05`
     - `"ALERT"` if `delta > 0.05`
     - `"STABLE"` otherwise
3. Else:
   - Set `assessment.assessment_stage = "INTAKE"`
   - Set `assessment.delta_risk = 0.0`
   - Set `assessment.trajectory_flag = "BASELINE"`
4. Create and commit a new `RiskTrajectory` entry linking `participant_id` and `assessment_id`.

---

#### Task 4: Implement Court PDF Report Generation Endpoint
In `backend/app/routers/reports_router.py`, implement:
```http
GET /api/reports/{assessment_id}/pdf
```
**Execution Logic:**
1. Fetch `Assessment`, `Participant`, `InterventionRecommendation`, and `User` (judge/assessor).
2. Generate a professional Court Decision Support Summary PDF using `reportlab` (or generate clean HTML and stream as PDF/HTML with `Content-Type: application/pdf`).
3. Include:
   - Court Header: *Drug Court Decision Support System (DSS) — Case Evaluation Report*
   - Participant Demographics & ID
   - Assessment Date & Stage (`INTAKE` vs `DYNAMIC`)
   - Model Prediction: Recidivism Probability (%) & Risk Tier
   - Longitudinal Trajectory Delta: $\Delta\text{Risk}$ with badge (`IMPROVING` / `ALERT` / `STABLE`)
   - TreeSHAP Key Risk Drivers (Top 5 features)
   - GenAI Clinical Narrative & Prioritized Interventions
   - Human-in-the-Loop Judicial Review Sign-off Block (Decision, Judicial Rationale, Signature line, Timestamp)
4. Stream as file attachment:
   `Content-Disposition: attachment; filename="DrugCourt_DSS_Assessment_{assessment_id}.pdf"`.

---

#### Task 5: Seed Demo Participants & Evaluations
Create a runnable database seed script: `backend/seed_demo_data.py`.
When executed (`python seed_demo_data.py`), it should ensure tables are created and seed:
1. **User Accounts:**
   - Judge: `judge@drugcourt.gov` / `judge123` (Role: `JUDGE`)
   - Case Manager: `casemanager@drugcourt.gov` / `case123` (Role: `CASE_MANAGER`)
2. **Participants:**
   - **Participant 1 (Improving):** John Carter (`DC-109284`)
     - Enrolled 3 months ago. Intake risk: `58.2%` (Medium-High). Checkpoint 1 risk: `38.5%` (Low-Medium, $\Delta = -19.7\%$, 🟢 `IMPROVING`).
     - 24 program attendances, 0 unexcused absences, 85% days employed, 0 positive drug tests.
   - **Participant 2 (Critical Alert):** Marcus Vance (`DC-204918`)
     - Enrolled 2 months ago. Intake risk: `46.0%`. Checkpoint 1 risk: `68.4%` ($\Delta = +22.4\%$, 🚨 `ALERT`).
     - 4 program attendances, 4 unexcused absences, 15% days employed, 2 positive drug tests.
   - **Participant 3 (New Intake):** Elena Rodriguez (`DC-301827`)
     - Freshly enrolled. Intake assessment only (`51.0%`, `BASELINE`).

---

### 5. VERIFICATION & RUNNING INSTRUCTIONS

1. **Activate Virtual Environment & Install Dependencies:**
   ```bash
   cd backend
   pip install -r requirements.txt
   pip install reportlab psycopg2-binary
   ```
2. **Run Migrations / Seed Demo Data:**
   ```bash
   python seed_demo_data.py
   ```
3. **Start FastAPI Backend Server:**
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```
4. **Interactive OpenAPI Documentation:**
   Open `http://localhost:8000/docs` to test:
   - `POST /api/assessments/{id}/predict`
   - `POST /api/assessments/{id}/simulate`
   - `GET /api/participants/{id}/trajectory`
   - `GET /api/reports/{id}/pdf`

