import subprocess
import os

CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
OUT_DIR = r"C:\Users\abhir\.gemini\antigravity\brain\7a9fd954-b570-473a-a872-7906dc2229ce\screenshots"

targets = [
    ("dashboard_light_desktop.png", "http://localhost:5173/dashboard?demo_auth=judge&theme=light", "1280,950"),
    ("dashboard_dark_desktop.png", "http://localhost:5173/dashboard?demo_auth=judge&theme=dark", "1280,950"),
]

for name, url, size in targets:
    out_path = os.path.join(OUT_DIR, name)
    if os.path.exists(out_path):
        try: os.remove(out_path)
        except Exception: pass
    cmd = [
        CHROME,
        "--headless=new",
        "--no-sandbox",
        "--disable-gpu",
        f"--window-size={size}",
        f"--screenshot={out_path}",
        url
    ]
    print(f"Capturing {name} from {url}...")
    res = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
    if os.path.exists(out_path):
        print(f"  [OK] Saved {name} ({os.path.getsize(out_path)} bytes)")
    else:
        print(f"  [FAIL] {name}: {res.stderr}")
