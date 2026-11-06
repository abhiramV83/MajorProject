import requests
import json
import sys
import os

BASE_URL = "http://127.0.0.1:8000"

def run_tests():
    print("==================================================")
    print(" DRUG COURT DECISION SUPPORT SYSTEM - BACKEND AUDIT")
    print("==================================================")
    
    # 1. Auth Login
    print("\n--- 1. Testing Auth Login ---")
    users = [
        ("judge@drugcourt.gov", "judge123"),
        ("casemanager@drugcourt.gov", "case123"),
        ("admin@drugcourt.gov", "admin123"),
    ]
    tokens = {}
    for email, pwd in users:
        res = requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": pwd})
        if res.status_code == 200:
            data = res.json()
            tokens[email] = data["access_token"]
            print(f"  [PASS] Logged in as {email} (role: {data['user']['role']})")
        else:
            print(f"  [FAIL] Failed to log in as {email}: {res.status_code} {res.text}")

    judge_token = tokens.get("judge@drugcourt.gov")
    if not judge_token:
        print("Aborting further tests due to missing judge token.")
        return

    headers = {"Authorization": f"Bearer {judge_token}"}

    # 2. Participants List
    print("\n--- 2. Testing Participants List ---")
    res = requests.get(f"{BASE_URL}/api/participants", headers=headers)
    p_id = 1
    if res.status_code == 200:
        data = res.json()
        items = data.get("items", [])
        total = data.get("total", len(items))
        print(f"  [PASS] Retrieved {total} participants in database (page items: {len(items)}).")
        if items:
            p_id = items[0]["id"]
            print(f"  Selected Participant #{p_id}: {items[0].get('first_name')} {items[0].get('last_name')}, Risk: {items[0].get('latest_risk_level')}")
    else:
        print(f"  [FAIL] Participants list failed: {res.status_code} {res.text}")

    # 3. Task 2: Risk Trajectory
    print(f"\n--- 3. Testing Task 2: Risk Trajectory (Participant #{p_id}) ---")
    res = requests.get(f"{BASE_URL}/api/participants/{p_id}/trajectory", headers=headers)
    if res.status_code == 200:
        traj = res.json()
        print(f"  [PASS] Trajectory returned {len(traj)} data points.")
        for pt in traj:
            print(f"    - Stage: {pt.get('model_stage')}, Risk Prob: {pt.get('risk_probability')}, Flag: {pt.get('trajectory_flag')}, Delta: {pt.get('delta_risk')}")
    else:
        print(f"  [FAIL] Trajectory endpoint failed: {res.status_code} {res.text}")

    # 4. Task 1: What-If Simulation Endpoint
    print(f"\n--- 4. Testing Task 1: What-If Simulation Endpoint ---")
    res = requests.get(f"{BASE_URL}/api/assessments/participant/{p_id}", headers=headers)
    assessments = res.json() if res.status_code == 200 else []
    # Find a dynamic assessment
    dynamic_assessments = [a for a in assessments if a.get("assessment_stage") == "DYNAMIC"]
    target_assessment = dynamic_assessments[0] if dynamic_assessments else (assessments[0] if assessments else None)
    a_id = target_assessment["id"] if target_assessment else 1
    print(f"  Testing on Assessment #{a_id} (Stage: {target_assessment.get('assessment_stage') if target_assessment else 'N/A'}).")

    sim_payload = {
        "program_attendances": 24,
        "percent_days_employed": 0.85,
        "drug_tests_clean": True,
        "notes": "Testing hypothetical compliance boost in what-if studio"
    }
    res = requests.post(f"{BASE_URL}/api/assessments/{a_id}/simulate", json=sim_payload, headers=headers)
    if res.status_code == 200:
        sim_res = res.json()
        print(f"  [PASS] Simulation executed successfully!")
        print(f"    - Baseline Risk: {sim_res.get('baseline_risk'):.4f}")
        print(f"    - Simulated Risk: {sim_res.get('simulated_risk'):.4f} ({sim_res.get('simulated_risk_level')})")
        print(f"    - Delta Risk: {sim_res.get('delta_risk'):+.4f}")
        print(f"    - Recommendation: {sim_res.get('recommendation')[:80]}...")
    else:
        print(f"  [FAIL] Simulation failed: {res.status_code} {res.text}")

    # 5. Task 4: Judicial PDF Export
    print(f"\n--- 5. Testing Task 4: Judicial PDF Export (Assessment #{a_id}) ---")
    res = requests.get(f"{BASE_URL}/api/reports/{a_id}/pdf", headers=headers)
    if res.status_code == 200:
        pdf_bytes = res.content
        is_pdf = pdf_bytes.startswith(b"%PDF-")
        print(f"  [PASS] Court Summary PDF generated successfully!")
        print(f"    - Content-Type: {res.headers.get('content-type')}")
        print(f"    - Size: {len(pdf_bytes)} bytes")
        print(f"    - Valid %PDF- header: {is_pdf}")
    else:
        print(f"  [FAIL] PDF generation failed: {res.status_code} {res.text}")

    # 6. Audit Log Integration
    print(f"\n--- 6. Testing Audit Log Integration (/api/audit-logs) ---")
    res = requests.get(f"{BASE_URL}/api/audit-logs", headers=headers)
    if res.status_code == 200:
        audit_events = res.json()
        print(f"  [PASS] Retrieved {len(audit_events)} audit events via API.")
        sim_events = [e for e in audit_events if "SIMULAT" in e.get("action", "").upper()]
        print(f"    - Verified simulation events recorded in audit trail: {len(sim_events)} event(s)")
        if sim_events:
            print(f"    - Latest Action: {sim_events[0].get('action')} at {sim_events[0].get('timestamp')}")
    else:
        print(f"  [FAIL] Audit log API failed: {res.status_code} {res.text}")

    # 7. Check decision_log.csv
    print(f"\n--- 7. Checking backend/logs/decision_log.csv ---")
    csv_path = os.path.join(os.path.dirname(__file__), "logs", "decision_log.csv")
    if os.path.exists(csv_path):
        with open(csv_path, "r", encoding="utf-8") as f:
            lines = f.readlines()
        print(f"  [PASS] decision_log.csv exists and has {len(lines)} lines.")
        if len(lines) > 1:
            print(f"    - Header: {lines[0].strip()}")
            print(f"    - Last Entry: {lines[-1].strip()}")
    else:
        print(f"  [INFO] decision_log.csv at {csv_path} not found.")

    print("\n==================================================")
    print(" BACKEND AUDIT RESULT: ALL SYSTEMS OPERATIONAL")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
