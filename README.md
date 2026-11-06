# Explainable AI-Based Human-in-the-Loop Dynamic Recidivism Risk Prediction and Intervention Effectiveness Monitoring

Drug Court Decision Support System (DSS) integrating longitudinal risk tracking, AI explainability (TreeSHAP), and counterfactual intervention simulation.

---

## 📱 Mobile Testing & Real-Device Setup (Phone-First Quality Gate)

Follow these exact steps to run and test the application on your physical mobile phone (iPhone or Android) on the same local Wi-Fi network.

### 1. Network & Server Architecture

```
┌────────────────────────────────────────────────────────┐
│ Mobile Phone (Safari / Chrome Mobile)                  │
│ URL: http://<YOUR_PC_LAN_IP>:5173                      │
└───────────────────────────┬────────────────────────────┘
                            │ Wi-Fi Network Request
                            ▼
┌────────────────────────────────────────────────────────┐
│ Vite Dev Server (Host PC: port 5173)                   │
│ - Bound to 0.0.0.0 (Network Accessible)                │
│ - Internal Proxy: /api/*  ───►  http://127.0.0.1:8000   │
└───────────────────────────┬────────────────────────────┘
                            │ Local Loopback (Internal)
                            ▼
┌────────────────────────────────────────────────────────┐
│ FastAPI Backend Server (Host PC: port 8000)            │
│ - Dev CORS allows LAN IP subnets (192.168.*, 10.*)     │
│ - Production stays strictly locked down                │
└────────────────────────────────────────────────────────┘
```

> **Why your phone never calls `localhost:8000`:**  
> The frontend communicates with the relative base path `/api`. When opened on your phone, API requests go to `http://<YOUR_PC_LAN_IP>:5173/api/...`. The Vite server on your PC transparently proxies these requests internally to `http://127.0.0.1:8000`. This completely prevents mobile connection failures and CORS issues.

---

### 2. Steps to Connect from Your Phone

#### Step 1: Verify Wi-Fi Connection
Ensure your computer and your phone are connected to the **same Wi-Fi network**.

#### Step 2: Determine Your PC's Local IP Address
In PowerShell or Command Prompt, run:
```powershell
ipconfig
```
Look for **IPv4 Address** under your active Wi-Fi or Ethernet adapter (e.g., `192.168.0.107`).

#### Step 3: Start the Backend Server
In terminal 1:
```powershell
python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
```

#### Step 4: Start the Frontend Dev Server (Network Exposed)
In terminal 2:
```powershell
cd frontend
npx vite --host 0.0.0.0 --port 5173
```
Vite will print:
```
  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.0.107:5173/
```

#### Step 5: Open on Your Phone
Open Safari (iOS) or Chrome (Android) on your phone and browse to:
```
http://192.168.0.107:5173
```
*(Replace `192.168.0.107` with your actual PC IP from Step 2)*.

---

### 3. Remote Debugging from Your Phone

#### Android (Google Chrome Remote Inspection):
1. On your phone: Enable **Developer Options** (tap Build Number 7 times) and turn on **USB Debugging**.
2. Connect your phone to your computer with a USB cable.
3. On your desktop Chrome browser, open:
   ```
   chrome://inspect/#devices
   ```
4. Find your device and tab listed, and click **Inspect**.
5. You can now inspect elements, view console logs, measure touch targets, and debug network traffic directly.

#### iOS / iPhone (Safari Web Inspector):
1. On your iPhone: Go to **Settings > Safari > Advanced** and toggle on **Web Inspector**.
2. Connect your iPhone to your Mac via USB cable.
3. Open desktop Safari, go to **Settings > Advanced > Show features for web developers**.
4. In Safari menu bar, click **Develop > [Your iPhone Name] > [Drug Court DSS Page]**.
5. Full Web Inspector and console tools will open.

---

### 4. Running the Automated Mobile Test Suite

To run the automated Playwright phone-first quality gate audit:

```powershell
cd frontend
node scripts/check-mobile.mjs
```

- **Output Report:** [`mobile-report/report.md`](file:///c:/dump/MajorProject/mobile-report/report.md)
- **Screenshots Directory:** [`mobile-report/screenshots/`](file:///c:/dump/MajorProject/mobile-report/screenshots/)
- **Evaluated Devices:** 
  - 360x640 (Small Android - Portrait & Landscape)
  - 375x667 (iPhone SE - Portrait & Landscape)
  - 390x844 (iPhone 14 - Portrait & Landscape)
  - 412x915 (Pixel 7 - Portrait & Landscape)
  - 430x932 (Large iPhone Pro Max - Portrait & Landscape)
  - 768x1024 (Tablet Portrait)
  - 1024x768 (Tablet Landscape)
  - 200% Accessibility Zoom & Interactive Overlays (Drawer, Dropdowns, Modals)
