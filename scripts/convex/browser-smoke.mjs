import { chromium } from 'playwright';

// Intentionally local-only. No production account, provider or billing is used.
const origin = process.env.AELO_TEST_ORIGIN ?? 'http://localhost:3000';
const originUrl = new URL(origin);
if (!['localhost', '127.0.0.1'].includes(originUrl.hostname)) throw new Error('Browser smoke is local-only');
const email = process.env.AELO_LOCAL_TEST_EMAIL;
const password = process.env.AELO_LOCAL_TEST_PASSWORD;
const authCookies = process.env.AELO_LOCAL_TEST_AUTH_COOKIES
  ? JSON.parse(process.env.AELO_LOCAL_TEST_AUTH_COOKIES)
  : null;
if (!authCookies && (!email?.endsWith('@example.test') || !password)) throw new Error('Synthetic local test credentials required');
if (authCookies && (!Array.isArray(authCookies) || authCookies.some(cookie =>
  !cookie || typeof cookie.name !== 'string' || typeof cookie.value !== 'string' ||
  !['__Secure-better-auth.session_token', '__Secure-better-auth.convex_jwt'].includes(cookie.name)
))) throw new Error('Invalid synthetic test session cookies');
if (process.env.AELO_TEST_ONBOARDING === '1' &&
    process.env.AELO_EXPECT_MISSING_PROVIDERS !== '1' &&
    process.env.AELO_ALLOW_TEST_MEASUREMENT !== '1') {
  throw new Error('Onboarding measurement requires an explicit missing-provider expectation or provider-spend approval');
}
const browser = await chromium.launch({ headless: true, ...(process.env.AELO_TEST_CHROME ? { executablePath: process.env.AELO_TEST_CHROME } : {}) });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, ignoreHTTPSErrors: true });
if (authCookies && originUrl.protocol !== 'https:') throw new Error('Synthetic session cookies require local HTTPS');
if (authCookies) await context.addCookies(authCookies.map(cookie => ({ ...cookie, url: origin, secure: true, httpOnly: true, sameSite: 'Lax' })));
const page = await context.newPage();
const errors = [];
const sameOriginFailures = [];
const timings = [];
let loginMs = null;
// A stalled fetch/browser must fail the check, never leave verification hanging.
const watchdog = setTimeout(() => {
  console.error('Browser verification exceeded three minutes. Partial timings:', JSON.stringify(timings));
  void browser.close().finally(() => process.exit(1));
}, process.env.AELO_TEST_CORE_JOBS === '1' ? 300000 : 180000);
page.on('pageerror', error => errors.push(error.message.slice(0, 250)));
page.on('response', response => { const url = new URL(response.url()); if (url.origin === origin && response.status() >= 400)
  sameOriginFailures.push({ status: response.status(), path: url.pathname }); });
try {
  const loginStart = performance.now();
  if (authCookies) {
    await page.goto(`${origin}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  } else {
    await page.goto(`${origin}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    // Local development can finish hydrating after DOMContentLoaded. Wait for
    // the auth capability checks so the form click always reaches React.
    await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
    await page.getByLabel('Email', { exact: true }).fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  }
  await page.waitForURL(url => ['/dashboard', '/onboarding'].includes(url.pathname), { timeout: 60000 });
  await page.getByRole('heading', { name: /Read what AI says when a buyer asks about your category\.|Overview/ }).first().waitFor({ timeout: 60000 });
  loginMs = Math.round(performance.now() - loginStart);
  console.log('Login to usable page ms:', loginMs);
  for (let sample = 1; sample <= (process.env.AELO_SKIP_TIMINGS === '1' ? 0 : 3); sample++) {
    for (const path of ['/api/onboarding/context', '/api/workspaces', '/api/dashboard/stats']) {
      const result = await page.evaluate(async path => {
        const started = performance.now();
        const response = await fetch(path, { signal: AbortSignal.timeout(20000) });
        await response.text();
        return { path, status: response.status, ms: Math.round(performance.now() - started) };
      }, path);
      timings.push({ sample, ...result });
    }
  }
  console.log('Request timings:', JSON.stringify(timings));
  if (process.env.AELO_PERF_JSON === '1') {
    console.log(JSON.stringify({ kind: 'aelo-performance', loginMs, timings }));
  }
  if (process.env.AELO_TEST_ACCESSIBILITY === '1') {
    const skipLink = page.getByRole('link', { name: 'Skip to dashboard content' });
    const hiddenSkipBox = await skipLink.boundingBox();
    if (!hiddenSkipBox || hiddenSkipBox.y + hiddenSkipBox.height >= 0) {
      throw new Error('Dashboard skip link is visible without focus');
    }
    await page.keyboard.press('Tab');
    await page.waitForTimeout(250);
    const focusedSkipBox = await skipLink.boundingBox();
    if (!(await skipLink.evaluate(element => element === document.activeElement)) || !focusedSkipBox || focusedSkipBox.y < 0) {
      throw new Error('Dashboard skip link is not visible on keyboard focus');
    }
    await page.keyboard.press('Enter');
    if (!await page.locator('#dashboard-content').evaluate(element => element === document.activeElement)) {
      throw new Error('Dashboard skip link did not move focus to the main content');
    }

    const navigationButton = page.getByRole('button', { name: 'Open all dashboard tools' });
    await navigationButton.click();
    const navigationDialog = page.getByRole('dialog', { name: 'Product navigation' });
    await navigationDialog.waitFor();
    if (!await navigationDialog.evaluate(element => element.contains(document.activeElement))) {
      throw new Error('Dashboard tools drawer did not receive focus');
    }
    await page.keyboard.press('Escape');
    await navigationDialog.waitFor({ state: 'hidden' });
    if (!await navigationButton.evaluate(element => element === document.activeElement)) {
      throw new Error('Dashboard tools drawer did not return focus to its trigger');
    }

    await page.setViewportSize({ width: 720, height: 500 });
    const zoomEquivalentOverflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    if (zoomEquivalentOverflow) throw new Error('Dashboard overflows at a 200% desktop-zoom equivalent viewport');
    console.log('Signed-in accessibility:', {
      skipLink: 'passed',
      drawerFocusReturn: 'passed',
      zoomEquivalentOverflow,
    });
    await page.setViewportSize({ width: 1440, height: 1000 });
  }
  await page.screenshot({ path: '/tmp/aelo-signed-in-desktop.png', fullPage: true });
  console.log('Signed-in route:', new URL(page.url()).pathname);
  console.log('Page:', (await page.locator('body').innerText()).slice(0, 2000));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: '/tmp/aelo-signed-in-mobile.png', fullPage: true, animations: 'disabled' });
  const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  console.log('Mobile overflow:', mobileOverflow);
  if (mobileOverflow) throw new Error('Mobile horizontal overflow');
  console.log('Mobile layout:', await page.evaluate(() => ({
    width: innerWidth, mainPadding: getComputedStyle(document.querySelector('main')).paddingLeft,
    wideElements: [...document.querySelectorAll('main *')].filter(el => el.getBoundingClientRect().right > innerWidth + 1).slice(0, 5).map(el => ({ tag: el.tagName, className: el.className })),
  })));
  if (process.env.AELO_TEST_CORE_JOBS === '1') {
    const setup = await page.evaluate(async () => {
      const call = (path, body) => fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(20000) });
      const brand = await call('/api/onboarding/brand', { brandName: 'Synthetic Migration Brand', website: 'https://example.test', industry: 'saas' });
      const complete = await call('/api/onboarding/complete');
      return { brand: brand.status, complete: complete.status };
    });
    if (setup.brand !== 200 || setup.complete !== 200) throw new Error(`Synthetic onboarding failed: ${JSON.stringify(setup)}`);

    const jobs = [
      { path: '/dashboard', heading: /Overview/, empty: /unmeasured/i },
      { path: '/dashboard/llm-tracker', heading: /Prompts & Scans/, empty: /No scans yet/ },
      { path: '/dashboard/sources', heading: /Sources/, empty: /No provider citations measured yet/ },
      { path: '/dashboard/interventions', heading: /Actions/, empty: /No actions in this stage/ },
      { path: '/dashboard/report', heading: /Client reports are a paid feature|A brief you can stand behind/, empty: /Client reports are a paid feature|No scans in this period yet/ },
      { path: '/dashboard/settings', heading: /Settings/, empty: /Workspace Name/ },
    ];
    const journeyResults = [];
    for (const viewport of [{ width: 1440, height: 1000, label: 'desktop' }, { width: 390, height: 844, label: 'mobile' }]) {
      await page.setViewportSize(viewport);
      for (const job of jobs) {
        const routeStart = performance.now();
        const failureStart = sameOriginFailures.length;
        const errorStart = errors.length;
        await page.goto(`${origin}${job.path}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.getByRole('heading', { name: job.heading }).first().waitFor({ timeout: 60000 });
        await page.getByText(job.empty).first().waitFor({ timeout: 30000 });
        const usableMs = Math.round(performance.now() - routeStart);
        // Let shell requests settle before the next hard navigation so the
        // check does not manufacture cancellation races that users would not see.
        await page.waitForTimeout(1800);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
        const routeFailures = sameOriginFailures.slice(failureStart);
        const routeErrors = errors.slice(errorStart);
        journeyResults.push({ path: job.path, viewport: viewport.label, usableMs, overflow, routeFailures, routeErrors });
        if (overflow || routeFailures.length || routeErrors.length) {
          throw new Error(`Core journey failed: ${JSON.stringify(journeyResults.at(-1))}`);
        }
      }
    }
    console.log('Core signed-in journeys:', JSON.stringify(journeyResults));
  }
  if (process.env.AELO_TEST_ONBOARDING === '1') {
    let releaseContext;
    const contextGate = new Promise(resolve => { releaseContext = resolve; });
    await page.route('**/api/onboarding/context', async route => { await contextGate; await route.continue(); });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Add my brand', exact: true }).click();
    await page.getByLabel('Brand or company name', { exact: false }).fill('Synthetic Migration Brand');
    await page.getByLabel('Website', { exact: false }).fill('https://example.test');
    await page.getByLabel('Industry', { exact: true }).selectOption('saas');
    const waitingButton = page.getByRole('button', { name: 'Loading workspace…', exact: true });
    if (!await waitingButton.isDisabled()) throw new Error('Brand submission must wait for workspace context');
    releaseContext();
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.getByRole('heading', { name: 'Choose buyer prompts' }).waitFor({ timeout: 20000 });
    console.log('Onboarding saved brand; editable prompts:', await page.getByRole('textbox', { name: /Buyer prompt/ }).count());
    const responsePromise = page.waitForResponse(r => new URL(r.url()).pathname === '/api/onboarding/decision-packet' && r.request().method() === 'POST');
    await page.getByRole('button', { name: 'Build decision packet', exact: true }).click();
    const packetResponse = await responsePromise;
    console.log('Decision packet submission status:', packetResponse.status());
    // This scenario intentionally has no provider keys. Never label this a successful scan.
    if (!packetResponse.ok()) {
      await page.getByRole('alert').filter({ hasText: /retry|completed|engine|configured/i }).waitFor();
      console.log('Missing-provider error is visible; no fabricated measurement.');
    }
    await page.screenshot({ path: '/tmp/aelo-onboarding-prompts-mobile.png', fullPage: true, animations: 'disabled' });
  }
  if (process.env.AELO_TEST_API_KEYS === '1') {
    const statuses = await page.evaluate(async () => {
      const call = (path, options = {}) => fetch(path, { ...options, signal: AbortSignal.timeout(20000) });
      const unauthenticated = await call('/api/v1/brands');
      const listed = await call('/api/keys');
      if (!listed.ok) throw new Error(`Test key lookup failed: ${listed.status}`);
      for (const key of (await listed.json()).keys) {
        if (key.name === 'Synthetic browser verification' && !key.revoked_at) {
          const cleanup = await call(`/api/keys/${key.id}`, { method: 'DELETE' });
          if (!cleanup.ok) throw new Error('Previous synthetic key cleanup failed');
        }
      }
      const created = await call('/api/keys', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Synthetic browser verification', scopes: ['read'] }) });
      if (!created.ok) throw new Error(`Test key creation failed: ${created.status}`);
      const { key, secret } = await created.json();
      const headers = { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' };
      let result;
      try {
        const read = await call('/api/v1/brands', { headers });
        const denied = await call('/api/v1/scan', { method: 'POST', headers, body: '{}' });
        result = { noKey: unauthenticated.status, read: read.status, measureWithReadKey: denied.status };
      } finally {
        const revoked = await call(`/api/keys/${key.id}`, { method: 'DELETE' });
        if (!revoked.ok) throw new Error('Synthetic key cleanup failed');
      }
      const afterRevocation = await call('/api/v1/brands', { headers });
      return { ...result, revoked: afterRevocation.status };
    });
    console.log('API-key authorization:', statuses);
    if (JSON.stringify(statuses) !== JSON.stringify({ noKey: 401, read: 200, measureWithReadKey: 403, revoked: 401 })) throw new Error('API-key status regression');
  }
  if (errors.length) throw new Error(`Browser page errors: ${errors.join(' | ')}`);
  console.log('Browser errors:', errors);
} catch (error) {
  console.log('Partial request timings:', JSON.stringify(timings));
  await page.screenshot({ path: '/tmp/aelo-browser-failure.png', fullPage: true }).catch(() => {});
  console.log('Route:', new URL(page.url()).pathname);
  console.log('Page:', (await page.locator('body').innerText()).slice(0, 1500));
  console.log('Browser errors:', errors);
  console.log('Same-origin HTTP failures:', sameOriginFailures);
  throw error;
} finally { clearTimeout(watchdog); await browser.close(); }
