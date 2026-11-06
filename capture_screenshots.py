import subprocess
import os

CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
OUT_DIR = r"C:\Users\abhir\.gemini\antigravity\brain\7a9fd954-b570-473a-a872-7906dc2229ce\screenshots"
os.makedirs(OUT_DIR, exist_ok=True)

targets = [
    ("login_light_desktop.png", "http://localhost:5173/login?theme=light", "1280,800"),
    ("login_dark_desktop.png", "http://localhost:5173/login?theme=dark", "1280,800"),
    ("login_light_mobile.png", "http://localhost:5173/login?theme=light", "375,812"),
    ("login_dark_mobile.png", "http://localhost:5173/login?theme=dark", "375,812"),
    ("landing_light_desktop.png", "http://localhost:5173/?theme=light", "1280,800"),
    ("landing_dark_desktop.png", "http://localhost:5173/?theme=dark", "1280,800"),
    ("landing_light_mobile.png", "http://localhost:5173/?theme=light", "375,812"),
    ("landing_dark_mobile.png", "http://localhost:5173/?theme=dark", "375,812"),
    ("dashboard_light_desktop.png", "http://localhost:5173/dashboard?demo_auth=judge&theme=light", "1280,950"),
    ("dashboard_dark_desktop.png", "http://localhost:5173/dashboard?demo_auth=judge&theme=dark", "1280,950"),
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
        "--run-all-compositor-stages-before-draw",
        f"--window-size={size}",
        f"--screenshot={out_path}",
        url
    ]
    print(f"Capturing {name} ({size}) from {url}...")
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=12)
        if os.path.exists(out_path):
            print(f"  [OK] Saved {name} ({os.path.getsize(out_path)} bytes)")
        else:
            print(f"  [FAIL] {name}: {res.stderr[:200] if res.stderr else 'no file'}")
    except subprocess.TimeoutExpired:
        print(f"  [TIMEOUT] {name}")
