import { chromium } from 'playwright';

async function check() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  
  await page.addInitScript(() => {
    localStorage.setItem('theme', 'dark');
    localStorage.setItem('access_token', 'demo-token');
    localStorage.setItem('user', JSON.stringify({ id: 2, email: 'judge@drugcourt.gov', full_name: 'Hon. Patricia Vance', role: 'JUDGE' }));
  });
  
  await page.goto('http://localhost:5173/assessments/13?demo_auth=judge', { waitUntil: 'networkidle', timeout: 10000 });
  await page.waitForTimeout(1000);
  const title = await page.title();
  const text = await page.innerText('body');
  console.log('PAGE TITLE:', title);
  console.log('PAGE BODY SNIPPET:\n', text.slice(0, 500));
  await page.screenshot({ path: '../mobile-report/screenshots/assessment_13_check.png' });
  await browser.close();
}

check().catch(console.error);
