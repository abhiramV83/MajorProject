import subprocess
import os
import time

CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
OUT_DIR = r"C:\Users\abhir\.gemini\antigravity\brain\7a9fd954-b570-473a-a872-7906dc2229ce\screenshots"
os.makedirs(OUT_DIR, exist_ok=True)

targets = [
    ("participants_light_desktop.png", "http://localhost:5173/participants?demo_auth=judge&theme=light", "1280,950"),
    ("participants_dark_desktop.png", "http://localhost:5173/participants?demo_auth=judge&theme=dark", "1280,950"),
    ("participant_profile_light_desktop.png", "http://localhost:5173/participants/1?demo_auth=judge&theme=light", "1280,1080"),
    ("participant_profile_dark_desktop.png", "http://localhost:5173/participants/1?demo_auth=judge&theme=dark", "1280,1080"),
    ("participant_form_light_desktop.png", "http://localhost:5173/participants/new?demo_auth=judge&theme=light", "1280,1080"),
    ("participant_form_dark_desktop.png", "http://localhost:5173/participants/new?demo_auth=judge&theme=dark", "1280,1080"),
    ("participant_edit_light_desktop.png", "http://localhost:5173/participants/1/edit?demo_auth=judge&theme=light", "1280,1080"),
    ("participant_edit_dark_desktop.png", "http://localhost:5173/participants/1/edit?demo_auth=judge&theme=dark", "1280,1080"),
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
