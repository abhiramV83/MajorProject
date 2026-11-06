import { chromium } from 'playwright';

async function testRoutes() {
  let realToken = 'demo-token';
  let realUser = { id: 1, email: 'judge@drugcourt.gov', full_name: 'Hon. Patricia Vance', role: 'JUDGE' };
  try {
    const authRes = await fetch('http://localhost:5173/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'judge@drugcourt.gov', password: 'judge123' }),
    });
    if (authRes.ok) {
      const authData = await authRes.json();
      realToken = authData.access_token;
      if (authData.user) realUser = authData.user;
      console.log('Obtained real backend auth token!');
    }
  } catch (err) {
    console.log('Login fetch error:', err.message);
  }

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  await context.addInitScript(({ tokenVal, userVal }) => {
    localStorage.setItem('theme', 'dark');
    localStorage.setItem('access_token', tokenVal);
    localStorage.setItem('user', JSON.stringify(userVal));
  }, { tokenVal: realToken, userVal: realUser });
  const page = await context.newPage();

  console.log('--- Test 1: Direct navigation to /assessments/13 ---');
  await page.goto('http://localhost:5173/assessments/13', { waitUntil: 'domcontentloaded' });
  // Wait up to 5s for assessment data to load
  await page.waitForTimeout(3500);
  let url = page.url();
  console.log('Current URL:', url);
  let bodyText = await page.innerText('body');
  let hasInvalid = bodyText.includes('Invalid assessment identifier');
  console.log('Contains "Invalid assessment identifier":', hasInvalid);
  let hasReject = bodyText.includes('REJECT') || bodyText.includes('REJECTED');
  console.log('Has REJECT disposition:', hasReject);
  let hasTreeShap = bodyText.includes('TreeSHAP') || bodyText.includes('Feature Attributions');
  console.log('Has TreeSHAP / Assessment data:', hasTreeShap);

  console.log('\n--- Test 2: Direct navigation to /assessments/new ---');
  await page.goto('http://localhost:5173/assessments/new', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  url = page.url();
  console.log('Current URL:', url);
  bodyText = await page.innerText('body');
  hasInvalid = bodyText.includes('Invalid assessment identifier');
  console.log('Contains "Invalid assessment identifier":', hasInvalid);
  let hasDispatch = bodyText.includes('EVALUATION DISPATCH CONSOLE') || bodyText.includes('Candidate');
  console.log('Candidate Evaluation Dispatch Console visible:', hasDispatch);

  console.log('\n--- Test 3: Navigate from /assessments to /assessments/new via click ---');
  await page.goto('http://localhost:5173/assessments', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  const newBtn = await page.locator('a[href="/assessments/new"]').first();
  if (await newBtn.isVisible()) {
    await newBtn.click();
    await page.waitForTimeout(1500);
    url = page.url();
    console.log('After clicking "+ New Assessment", URL:', url);
    bodyText = await page.innerText('body');
    hasInvalid = bodyText.includes('Invalid assessment identifier');
    console.log('Contains "Invalid assessment identifier":', hasInvalid);
    hasDispatch = bodyText.includes('EVALUATION DISPATCH CONSOLE') || bodyText.includes('Candidate');
    console.log('Candidate Evaluation Dispatch Console visible:', hasDispatch);
  }

  await browser.close();
}

testRoutes().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
