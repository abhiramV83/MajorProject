import subprocess
import os

CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
OUT_DIR = r"C:\Users\abhir\.gemini\antigravity\brain\7a9fd954-b570-473a-a872-7906dc2229ce\screenshots"
os.makedirs(OUT_DIR, exist_ok=True)

targets = [
    ("interventions_light_desktop.png", "http://localhost:5173/interventions?demo_auth=judge&theme=light", "1280,950"),
    ("interventions_dark_desktop.png", "http://localhost:5173/interventions?demo_auth=judge&theme=dark", "1280,950"),
    ("audit_logs_light_desktop.png", "http://localhost:5173/audit-logs?demo_auth=judge&theme=light", "1280,950"),
    ("audit_logs_dark_desktop.png", "http://localhost:5173/audit-logs?demo_auth=judge&theme=dark", "1280,950"),
]

for name, url, size in targets:
    out_path = os.path.join(OUT_DIR, name)
    if os.path.exists(out_path):
        try:
            os.remove(out_path)
        except Exception:
            pass
    cmd = [
        CHROME,
        "--headless=new",
        "--no-sandbox",
        "--disable-gpu",
        "--virtual-time-budget=4000",
        "--run-all-compositor-stages-before-draw",
        f"--window-size={size}",
        f"--screenshot={out_path}",
        url
    ]
    print(f"Capturing {name} ({size}) from {url}...")
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
        if os.path.exists(out_path) and os.path.getsize(out_path) > 1000:
            print(f"  [OK] Saved {name} ({os.path.getsize(out_path)} bytes)")
        else:
            print(f"  [FAIL] {name}: {res.stderr[:200] if res.stderr else 'no file or empty'}")
    except subprocess.TimeoutExpired:
        print(f"  [TIMEOUT] {name}")
