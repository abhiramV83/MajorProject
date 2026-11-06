import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const OUT_DIR = 'C:\\Users\\abhir\\.gemini\\antigravity\\brain\\7a9fd954-b570-473a-a872-7906dc2229ce\\screenshots';
fs.mkdirSync(OUT_DIR, { recursive: true });

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function capture() {
  const chromeProc = spawn(CHROME, [
    '--headless=new',
    '--no-sandbox',
    '--remote-debugging-port=9222',
    '--hide-scrollbars',
    '--disable-gpu',
    '--disable-background-networking',
    '--disable-default-apps',
    '--disable-sync',
    '--no-first-run',
    'about:blank'
  ]);

  await sleep(1500);

  const targets = [
    { name: 'login_light_desktop.png', url: 'http://localhost:5173/login?theme=light', w: 1280, h: 800, mobile: false },
    { name: 'login_dark_desktop.png', url: 'http://localhost:5173/login?theme=dark', w: 1280, h: 800, mobile: false },
    { name: 'login_light_mobile.png', url: 'http://localhost:5173/login?theme=light', w: 375, h: 812, mobile: true },
    { name: 'login_dark_mobile.png', url: 'http://localhost:5173/login?theme=dark', w: 375, h: 812, mobile: true },
    { name: 'landing_light_desktop.png', url: 'http://localhost:5173/?theme=light', w: 1280, h: 800, mobile: false },
    { name: 'landing_dark_desktop.png', url: 'http://localhost:5173/?theme=dark', w: 1280, h: 800, mobile: false },
    { name: 'landing_light_mobile.png', url: 'http://localhost:5173/?theme=light', w: 375, h: 812, mobile: true },
    { name: 'landing_dark_mobile.png', url: 'http://localhost:5173/?theme=dark', w: 375, h: 812, mobile: true },
    { name: 'dashboard_light_desktop.png', url: 'http://localhost:5173/dashboard?demo_auth=judge&theme=light', w: 1280, h: 950, mobile: false },
    { name: 'dashboard_dark_desktop.png', url: 'http://localhost:5173/dashboard?demo_auth=judge&theme=dark', w: 1280, h: 950, mobile: false },
  ];

  try {
    const listRes = await fetch('http://127.0.0.1:9222/json');
    const tabs = await listRes.json();
    const wsUrl = tabs[0].webSocketDebuggerUrl;

    const ws = new WebSocket(wsUrl);
    await new Promise((resolve) => (ws.onopen = resolve));

    let id = 1;
    const pending = new Map();

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.id && pending.has(msg.id)) {
          const { resolve, reject } = pending.get(msg.id);
          pending.delete(msg.id);
          if (msg.error) {
            reject(new Error(msg.error.message || JSON.stringify(msg.error)));
          } else {
            resolve(msg.result);
          }
        }
      } catch (err) {
        console.error('Failed to parse WS msg:', err);
      }
    };

    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const curId = id++;
        const timer = setTimeout(() => {
          if (pending.has(curId)) {
            pending.delete(curId);
            reject(new Error(`Timeout waiting for ${method} (id=${curId})`));
          }
        }, 10000);

        pending.set(curId, {
          resolve: (val) => {
            clearTimeout(timer);
            resolve(val);
          },
          reject: (err) => {
            clearTimeout(timer);
            reject(err);
          },
        });

        ws.send(JSON.stringify({ id: curId, method, params }));
      });
    }

    await send('Page.enable');

    for (const t of targets) {
      console.log(`Rendering ${t.name} (${t.w}x${t.h}, mobile=${t.mobile})...`);
      await send('Emulation.setDeviceMetricsOverride', {
        width: t.w,
        height: t.h,
        deviceScaleFactor: 1,
        mobile: t.mobile,
      });

      await send('Page.navigate', { url: t.url });
      // Allow API and React rendering + transitions to settle
      await sleep(2200);

      const shot = await send('Page.captureScreenshot', { format: 'png' });
      const outPath = path.join(OUT_DIR, t.name);
      fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
      console.log(`  [OK] Saved ${t.name} (${fs.statSync(outPath).size} bytes)`);
    }

    ws.close();
  } catch (err) {
    console.error('Error during capture:', err);
  } finally {
    chromeProc.kill();
  }
}

capture();
