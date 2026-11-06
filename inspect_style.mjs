import { spawn } from 'child_process';

const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
  '--headless=new',
  '--remote-debugging-port=9223',
  'about:blank'
]);

await new Promise(r => setTimeout(r, 1200));
const tabs = await (await fetch('http://127.0.0.1:9223/json')).json();
const ws = new WebSocket(tabs[0].webSocketDebuggerUrl);
await new Promise(r => ws.onopen = r);

let id = 1;
const send = (method, params = {}) => new Promise(res => {
  const curId = id++;
  const handler = (e) => {
    const d = JSON.parse(e.data);
    if (d.id === curId) {
      ws.removeEventListener('message', handler);
      res(d.result);
    }
  };
  ws.addEventListener('message', handler);
  ws.send(JSON.stringify({ id: curId, method, params }));
});

await send('Page.enable');
await send('Page.navigate', { url: 'http://localhost:5173/dashboard?demo_auth=judge&theme=light' });
await new Promise(r => setTimeout(r, 2000));

const evalRes = await send('Runtime.evaluate', {
  expression: `(() => {
    const btn = Array.from(document.querySelectorAll('a')).find(a => a.innerText.includes('New Intake'));
    if(!btn) return 'not found';
    const s = window.getComputedStyle(btn);
    return {
      classes: btn.className,
      bg: s.backgroundColor,
      color: s.color,
      radius: s.borderRadius
    };
  })()`,
  returnByValue: true
});

console.log('EVAL RESULT:', JSON.stringify(evalRes.result.value, null, 2));

const portalRes = await send('Runtime.evaluate', {
  expression: `(() => {
    const portal = Array.from(document.querySelectorAll('a')).find(a => a.innerText.includes('Portal'));
    if(!portal) return 'portal not found';
    const s = window.getComputedStyle(portal);
    return {
      classes: portal.className,
      bg: s.backgroundColor,
      color: s.color
    };
  })()`,
  returnByValue: true
});
console.log('PORTAL RESULT:', JSON.stringify(portalRes.result.value, null, 2));

chrome.kill();
process.exit(0);
