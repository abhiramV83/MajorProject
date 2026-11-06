import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createServer } from 'vite';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const routes = [
  '/', '/login', '/dashboard', '/participants', '/participants/new',
  '/participants/1/edit', '/participants/1', '/assessments',
  '/assessments/new', '/assessments/1', '/interventions',
  '/model-performance', '/fairness', '/model-card', '/audit-logs',
  '/not-a-route', '/dashboard?qa=unauthorized', '/dashboard?qa=session-expired',
];
const themes = ['dark', 'light'];
const viewports = [
  { width: 375, height: 812 }, { width: 768, height: 1024 },
  { width: 1440, height: 900 }, { width: 1920, height: 1080 },
];
const roles = ['JUDGE', 'CASE_MANAGER', 'TREATMENT_PROVIDER', 'ADMIN'];
const states = ['data', 'empty', 'loading', 'error'];
const smoke = process.env.THEME_SMOKE === '1';
const quick = process.env.THEME_QUICK === '1';
const quickDesktop = process.env.THEME_QUICK_DESKTOP === '1';
const reportDir = path.resolve('../theme-report');
const shotDir = path.join(reportDir, 'screenshots');
fs.mkdirSync(shotDir, { recursive: true });
function sourceHash() {
  const hash = crypto.createHash('sha256');
  function visit(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(file);
      else if (/\.(?:js|jsx|css)$/.test(file)) hash.update(file).update(fs.readFileSync(file));
    }
  }
  visit(path.resolve('src'));
  return hash.digest('hex');
}
const initialSourceHash = sourceHash();

const failures = [];
const summary = new Map();
let checkedByTheme = { dark: 0, light: 0 };
let axeRuns = new Set();

function slug(s) { return s.replaceAll(/[^a-z0-9]+/gi, '-').replaceAll(/^-|-$/g, '') || 'home'; }
function addFailure(row) {
  failures.push(row);
  const key = `${row.route}|${row.theme}`;
  const item = summary.get(key) || { elements: 0, failures: 0, warnings: 0 };
  if (row.severity === 'WARN') item.warnings++;
  else item.failures++;
  summary.set(key, item);
}

async function measure(page) {
  return page.evaluate(() => {
    const parse = (value) => {
      const m = value?.match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const p = m[1].split(/[ ,/]+/).map(Number);
      return [p[0], p[1], p[2], p[3] ?? 1];
    };
    const blend = (front, back) => {
      const a = front[3] + back[3] * (1 - front[3]);
      return [0, 1, 2].map(i => (front[i] * front[3] + back[i] * back[3] * (1 - front[3])) / a).concat(a);
    };
    const luminance = c => [0, 1, 2].map(i => {
      const x = c[i] / 255;
      return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
    }).reduce((sum, x, i) => sum + x * [0.2126, 0.7152, 0.0722][i], 0);
    const ratio = (a, b) => {
      const x = luminance(a), y = luminance(b);
      return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
    };
    const selector = el => {
      if (el.id) return `#${CSS.escape(el.id)}`;
      const parts = [];
      for (let n = el; n && n.nodeType === 1 && parts.length < 5; n = n.parentElement) {
        const index = [...n.parentElement?.children || []].indexOf(n) + 1;
        parts.unshift(`${n.tagName.toLowerCase()}:nth-child(${index})`);
      }
      return parts.join(' > ');
    };
    const visible = el => {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return rect.width > 1 && rect.height > 1 && style.display !== 'none' &&
        style.visibility !== 'hidden' && Number(style.opacity) > 0;
    };
    const rows = [];
    for (const [elementIndex, el] of [...document.querySelectorAll('body *')].entries()) {
      if (!visible(el)) continue;
      const style = getComputedStyle(el);
      const text = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join(' ').trim();
      const icon = el.tagName.toLowerCase() === 'svg' ||
        (el.tagName.toLowerCase() === 'path' && el.closest('svg')?.classList.contains('recharts-surface'));
      const control = ['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(el.tagName);
      const border = control && parse(style.borderColor) && parse(style.borderColor)[3] > 0 && parse(style.borderWidth);
      if (!text && !icon && !control && !border) continue;
      let bg = [255, 255, 255, 1];
      let complex = false;
      const stack = [];
      for (let n = el; n; n = n.parentElement) stack.unshift(n);
      for (const n of stack) {
        const s = getComputedStyle(n);
        if (s.backgroundImage !== 'none' || (s.backdropFilter && s.backdropFilter !== 'none')) complex = true;
        const layer = parse(s.backgroundColor);
        if (layer) bg = blend(layer, bg);
      }
      const fontSize = Number.parseFloat(style.fontSize);
      const large = fontSize >= 24 || (fontSize >= 18.66 && Number.parseInt(style.fontWeight) >= 700);
      const disabled = el.matches(':disabled') || el.getAttribute('aria-disabled') === 'true';
      const required = icon || control && !text ? 3 : disabled ? 3 : large ? 3 : 4.5;
      const colorValue = icon
        ? (parse(el.getAttribute('fill')) ? el.getAttribute('fill')
          : parse(el.getAttribute('stroke')) ? el.getAttribute('stroke')
          : el.tagName.toLowerCase() === 'svg' ? style.color
          : parse(style.fill) ? style.fill : style.color)
        : style.color;
      const color = parse(colorValue);
      if (!color) continue;
      el.setAttribute('data-theme-qa-id', String(elementIndex));
      color[3] *= Number(style.opacity);
      const fg = blend(color, bg);
      const measured = ratio(fg, bg);
      rows.push({ selector: `[data-theme-qa-id="${elementIndex}"]`, cssSelector: selector(el), icon,
        text: text.slice(0, 40), fg: colorValue,
        bg: `rgb(${bg.slice(0, 3).map(x => Math.round(x)).join(',')})`,
        ratio: measured, required, complex, opacity: Number(style.opacity),
        rect: (() => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; })(),
      });
    }
    return rows;
  });
}

async function sampleComplex(page, row) {
  const locator = page.locator(row.selector).first();
  if (!await locator.count()) return row.ratio;
  const box = await locator.boundingBox();
  if (!box || box.width < 2 || box.height < 2) return row.ratio;
  const clip = { x: Math.max(0, box.x), y: Math.max(0, box.y),
    width: Math.min(box.width, page.viewportSize().width - Math.max(0, box.x)),
    height: Math.min(box.height, page.viewportSize().height - Math.max(0, box.y)) };
  if (clip.width < 2 || clip.height < 2) return row.ratio;
  const original = await locator.getAttribute('style');
  await locator.evaluate((el, icon) => {
    if (icon) el.style.setProperty('opacity', '0', 'important');
    else {
      el.style.setProperty('color', 'transparent', 'important');
      el.style.setProperty('-webkit-text-fill-color', 'transparent', 'important');
    }
  }, row.icon);
  try {
    const png = await page.screenshot({ clip });
    const pixels = await page.evaluate(async base64 => {
      const img = new Image();
      img.src = `data:image/png;base64,${base64}`;
      await img.decode();
      const canvas = document.createElement('canvas');
      canvas.width = img.width; canvas.height = img.height;
      const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0);
      const values = ctx.getImageData(0, 0, img.width, img.height).data;
      const samples = [];
      for (let y = Math.floor(img.height * .1); y < img.height * .9; y += Math.max(1, Math.floor(img.height / 8)))
        for (let x = Math.floor(img.width * .1); x < img.width * .9; x += Math.max(1, Math.floor(img.width / 8))) {
          const k = (y * img.width + x) * 4;
          samples.push([values[k], values[k + 1], values[k + 2]]);
        }
      return samples;
    }, png.toString('base64'));
    const fg = row.fg.match(/[\d.]+/g)?.slice(0, 3).map(Number);
    if (!fg?.length) return row.ratio;
    const lum = c => c.map(v => { const x = v / 255; return x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; })
      .reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
    const a = lum(fg);
    return Math.min(...pixels.map(p => { const b = lum(p); return (Math.max(a, b) + .05) / (Math.min(a, b) + .05); }));
  } finally {
    await locator.evaluate((el, value) => value === null ? el.removeAttribute('style') : el.setAttribute('style', value), original);
  }
}

async function main() {
  const server = await createServer({ server: { host: '127.0.0.1', port: 4173, strictPort: true } });
  await server.listen();
  const browser = await chromium.launch({ headless: true });
  try {
    const checkRoute = async route => {
      for (const theme of themes) {
        for (const viewport of quickDesktop ? viewports.slice(2, 3) : smoke || quick ? viewports.slice(0, 1) : viewports) {
          for (const role of smoke || quick || quickDesktop ? roles.slice(0, 1) : roles) {
            for (const state of smoke || quick || quickDesktop ? states.slice(0, 1) : states) {
              const context = await browser.newContext({ viewport, colorScheme: theme, reducedMotion: 'reduce' });
              const page = await context.newPage();
              const expectedUser = { id: 1, email: 'qa@example.invalid', full_name: 'Theme QA', role };
              await page.addInitScript(({ theme, user, route }) => {
                if (!sessionStorage.getItem('theme-qa-initialized')) {
                  localStorage.setItem('theme', theme);
                  sessionStorage.setItem('theme-qa-initialized', '1');
                }
                if (!route.includes('unauthorized')) {
                  localStorage.setItem('user', JSON.stringify(user));
                  localStorage.setItem('access_token', 'qa-token');
                }
              }, { theme, user: expectedUser, route });
              await page.route('**/api/**', async request => {
                const url = new URL(request.request().url());
                if (url.pathname === '/api/auth/me')
                  return request.fulfill({ status: route.includes('session-expired') ? 401 : 200,
                    contentType: 'application/json', body: JSON.stringify(expectedUser) });
                if (state === 'loading') await new Promise(resolve => setTimeout(resolve, 800));
                if (state === 'empty') {
                  const body = url.pathname === '/api/participants' ? { items: [], total: 0, pages: 1 } : [];
                  return request.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
                }
                return request.fulfill({ status: state === 'error' ? 500 : 503, contentType: 'application/json', body: '{}' });
              });
              const url = `http://127.0.0.1:4173${route}`;
              await page.goto(url, { waitUntil: 'domcontentloaded' });
              await page.waitForTimeout(state === 'loading' ? 100 : 350);
              const routeKey = route.split('?')[0];
              if (role === roles[0]) {
                const name = `${slug(route)}-${theme}-${viewport.width}x${viewport.height}${state === 'data' ? '' : `-${state}`}`;
                await page.screenshot({ path: path.join(shotDir, `${name}.png`), fullPage: true });
              }
              const rows = await measure(page);
              checkedByTheme[theme] += rows.length;
              const key = `${route}|${theme}`;
              const stats = summary.get(key) || { elements: 0, failures: 0, warnings: 0 };
              stats.elements += rows.length;
              summary.set(key, stats);
              for (const row of rows) {
                if (row.complex && row.ratio < row.required + 1) row.ratio = await sampleComplex(page, row);
                if (row.ratio < row.required || row.opacity < 0.7) addFailure({
                  route, viewport: `${viewport.width}x${viewport.height}`, role, theme, state,
                  ...row, severity: row.ratio < 1.5 ? 'INVISIBLE' : 'FAIL',
                });
              }
              const axeKey = `${route}|${theme}`;
              if (!axeRuns.has(axeKey)) {
                axeRuns.add(axeKey);
                const results = await new AxeBuilder({ page }).withTags(['wcag2aa']).analyze();
                for (const violation of results.violations.filter(v => v.id === 'color-contrast')) {
                  for (const node of violation.nodes) {
                    const data = node.any?.[0]?.data || {};
                    addFailure({ route, theme,
                    viewport: `${viewport.width}x${viewport.height}`, role, state,
                    selector: node.target.join(' '), text: node.html.slice(0, 40),
                    fg: data.fgColor || '', bg: data.bgColor || '',
                    ratio: Number(data.contrastRatio) || 0,
                    required: Number(data.expectedContrastRatio) || 4.5,
                    severity: 'FAIL', source: 'axe' });
                  }
                }
              }
              if (role === roles[0] && state === 'data' && viewport.width === 1440) {
                const toggle = page.locator('button[aria-label^="Switch to"]').first();
                if (await toggle.count()) {
                  const before = await measure(page);
                  await toggle.click();
                  await page.waitForTimeout(500);
                  const opposite = theme === 'dark' ? 'light' : 'dark';
                  if (await page.locator('html').evaluate(el => el.classList.contains('dark')) !== (opposite === 'dark'))
                    addFailure({ route, viewport: '1440x900', role, theme, state: 'toggle',
                      selector: 'html', text: 'Theme did not switch', fg: '', bg: '', ratio: 0, required: 1, severity: 'FAIL' });
                  const after = await measure(page);
                  for (const row of after) {
                    if (row.ratio < row.required) addFailure({ route, viewport: '1440x900', role,
                      theme: opposite, state: 'live-toggle', ...row,
                      severity: row.ratio < 1.5 ? 'INVISIBLE' : 'FAIL' });
                  }
                  const beforeMap = new Map(before.map(x => [x.selector, x]));
                  for (const row of after) {
                    const old = beforeMap.get(row.selector);
                    if (old && old.fg === row.fg && old.bg !== row.bg && row.text)
                      addFailure({ route, viewport: '1440x900', role, theme, state: 'stale-color',
                        ...row, severity: 'WARN' });
                  }
                  await page.reload({ waitUntil: 'domcontentloaded' });
                  if (await page.locator('html').evaluate(el => el.classList.contains('dark')) !== (opposite === 'dark'))
                    addFailure({ route, viewport: '1440x900', role, theme, state: 'reload',
                      selector: 'html', text: 'Theme persistence failed', fg: '', bg: '', ratio: 0, required: 1, severity: 'FAIL' });
                  const toggleBack = page.locator('button[aria-label^="Switch to"]').first();
                  if (await toggleBack.count()) await toggleBack.click();
                }
                if (routeKey === '/interventions') {
                  const modalButton = page.getByRole('button', { name: /Issue Court Order/i }).first();
                  if (await modalButton.count()) {
                    await modalButton.click();
                    await page.screenshot({ path: path.join(shotDir, `modal-${theme}.png`), fullPage: true });
                    for (const row of await measure(page)) {
                      if (row.ratio < row.required) addFailure({ route, viewport: '1440x900', role, theme,
                        state: 'modal-open', ...row, severity: row.ratio < 1.5 ? 'INVISIBLE' : 'FAIL' });
                    }
                  }
                }
                if (routeKey === '/assessments/1') {
                  const simulate = page.getByRole('button', { name: /Simulate Intervention/i }).first();
                  if (await simulate.count()) {
                    await simulate.click();
                    await page.waitForTimeout(200);
                    await page.screenshot({ path: path.join(shotDir, `assessment-studio-${theme}.png`), fullPage: true });
                  }
                }
              }
              await context.close();
            }
          }
        }
      }
      console.log(`Checked ${route}: ${failures.length} failures so far`);
    };
    const selectedRoutes = smoke ? routes.slice(0, 3) : routes;
    for (let i = 0; i < selectedRoutes.length; i += 4) {
      await Promise.all(selectedRoutes.slice(i, i + 4).map(checkRoute));
    }
    for (const systemTheme of themes) {
      const context = await browser.newContext({ colorScheme: systemTheme });
      const page = await context.newPage();
      await page.goto('http://127.0.0.1:4173/', { waitUntil: 'domcontentloaded' });
      const actual = await page.locator('html').evaluate(el => el.classList.contains('dark'));
      if (actual !== (systemTheme === 'dark')) addFailure({ route: '/', theme: systemTheme,
        viewport: 'system', role: 'public', state: 'system-preference', selector: 'html',
        text: 'System theme did not apply before DOM ready', fg: '', bg: '',
        ratio: 0, required: 1, severity: 'FAIL' });
      await context.close();
    }
  } finally {
    await browser.close();
    await server.close();
  }
  if (sourceHash() !== initialSourceHash) addFailure({ route: 'SOURCE_CHANGED', theme: 'both',
    viewport: 'all', role: 'all', state: 'run', selector: 'src/**', text: 'Source files changed during run',
    fg: '', bg: '', ratio: 0, required: 1, severity: 'FAIL' });
  const lines = [
    '# Theme validation report', '',
    `Matrix: ${routes.length} routes × ${themes.length} themes × ${viewports.length} viewports × ${roles.length} roles × ${states.length} states.`,
    `Elements checked: dark ${checkedByTheme.dark}, light ${checkedByTheme.light}.`,
    `Failures: ${failures.filter(x => x.severity !== 'WARN').length}; warnings: ${failures.filter(x => x.severity === 'WARN').length}.`, '',
    '| Route | Theme | Elements | Failures | Warnings |', '|---|---|---:|---:|---:|',
    ...[...summary].map(([key, value]) => { const [route, theme] = key.split('|'); return `| ${route} | ${theme} | ${value.elements} | ${value.failures} | ${value.warnings} |`; }),
    '', '| Route | Viewport | Role | Theme | State | Selector | Text | Foreground | Background | Ratio | Required | Severity |',
    '|---|---|---|---|---|---|---|---|---|---:|---:|---|',
    ...failures.map(x => `| ${x.route} | ${x.viewport} | ${x.role} | ${x.theme} | ${x.state} | ${x.selector} | ${(x.text || '').replaceAll('|', '\\|')} | ${x.fg} | ${x.bg} | ${x.ratio.toFixed(2)} | ${x.required} | ${x.severity} |`),
  ];
  fs.writeFileSync(path.join(reportDir, 'report.md'), lines.join('\n'));
  console.log(`Elements checked: dark ${checkedByTheme.dark}, light ${checkedByTheme.light}`);
  console.log(`Failures: ${failures.length}; first 20:`);
  for (const row of failures.slice(0, 20)) console.log(`${row.route} ${row.theme} ${row.selector} ${row.ratio.toFixed(2)} < ${row.required}`);
  if (failures.length) process.exitCode = 1;
}

await main();
