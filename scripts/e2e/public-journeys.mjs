import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const origin = process.env.AELO_E2E_BASE_URL ?? 'http://localhost:3000';
const publicRoutes = [
  '/',
  '/product',
  '/pricing',
  '/methodology',
  '/about',
  '/solutions/founders',
  '/solutions/marketing',
  '/solutions/agencies',
  '/solutions/india',
];
const routes = process.env.AELO_E2E_ROUTE ? [process.env.AELO_E2E_ROUTE] : publicRoutes;
const allViewports = [
  { label: 'desktop', width: 1440, height: 1000 },
  { label: 'mobile', width: 390, height: 844 },
];
const viewports = process.env.AELO_E2E_VIEWPORT
  ? allViewports.filter(({ label }) => label === process.env.AELO_E2E_VIEWPORT)
  : allViewports;

async function isReachable() {
  try {
    const response = await fetch(origin, { signal: AbortSignal.timeout(1500) });
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForServer(processHandle) {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (processHandle.exitCode !== null) {
      throw new Error(`Development server exited with code ${processHandle.exitCode}`);
    }
    if (await isReachable()) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Development server did not become ready at ${origin}`);
}

let server = null;
if (!(await isReachable())) {
  server = spawn('./node_modules/.bin/next', ['dev'], {
    cwd: process.cwd(),
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  await waitForServer(server);
}

let browser;
try {
  browser = await chromium.launch({ headless: true, channel: 'chrome' });
} catch {
  browser = await chromium.launch({ headless: true });
}

const failures = [];
const results = [];
let checksPassed = false;
try {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const pageErrors = [];
    const requestFailures = [];
    const badResponses = [];

    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('requestfailed', (request) => {
      const url = new URL(request.url());
      const reason = request.failure()?.errorText ?? 'unknown error';
      if (url.origin === origin && reason !== 'net::ERR_ABORTED') {
        requestFailures.push(`${request.method()} ${url.pathname}: ${reason}`);
      }
    });
    page.on('response', (response) => {
      const url = new URL(response.url());
      if (url.origin === origin && response.status() >= 400) {
        badResponses.push(`${response.status()} ${url.pathname}`);
      }
    });

    for (const route of routes) {
      pageErrors.length = 0;
      requestFailures.length = 0;
      badResponses.length = 0;
      const started = performance.now();
      await page.goto(`${origin}${route}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      await page.locator('main h1').first().waitFor({ timeout: 30_000 });
      const navigationMs = Math.round(performance.now() - started);
      const state = await page.evaluate(() => ({
        blank: document.body.innerText.trim().length === 0,
        overflow: document.documentElement.scrollWidth > innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        viewportWidth: innerWidth,
        bodyScrollWidth: document.body.scrollWidth,
        overlay: Boolean(document.querySelector('[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay')),
        wideElements: [...document.querySelectorAll('body *')]
          .filter((element) => element.getBoundingClientRect().right > innerWidth + 1)
          .slice(0, 6)
          .map((element) => ({
            tag: element.tagName,
            text: element.textContent?.trim().slice(0, 80),
            className: typeof element.className === 'string' ? element.className : '',
            right: Math.round(element.getBoundingClientRect().right),
          })),
        wideText: (() => {
          const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
          const nodes = [];
          while (walker.nextNode()) {
            const value = walker.currentNode.textContent?.trim();
            if (!value) continue;
            const range = document.createRange();
            range.selectNodeContents(walker.currentNode);
            const right = range.getBoundingClientRect().right;
            if (right > innerWidth + 1) nodes.push({ value: value.slice(0, 100), right: Math.round(right) });
          }
          return nodes.slice(0, 8);
        })(),
      }));
      const result = { route, viewport: viewport.label, navigationMs, ...state, pageErrors: [...pageErrors], requestFailures: [...requestFailures], badResponses: [...badResponses] };
      results.push(result);
      if (state.blank || state.overflow || state.overlay || pageErrors.length || requestFailures.length || badResponses.length) failures.push(result);
    }

    if (!process.env.AELO_E2E_ROUTE || process.env.AELO_E2E_ROUTE === '/') {
      await page.goto(origin, { waitUntil: 'domcontentloaded' });
      const skipLink = page.getByRole('link', { name: 'Skip to content' });
      const hiddenSkipBox = await skipLink.boundingBox();
      if (!hiddenSkipBox || hiddenSkipBox.y + hiddenSkipBox.height >= 0) {
        failures.push({ route: '/', viewport: viewport.label, accessibility: 'skip link is visible without focus' });
      }
      if (viewport.label === 'desktop') {
        await page.screenshot({ path: '/tmp/aelo-public-desktop.png', fullPage: true, animations: 'disabled' });
      } else {
        await page.screenshot({ path: '/tmp/aelo-public-mobile.png', fullPage: true, animations: 'disabled' });
      }
      await page.keyboard.press('Tab');
      const focusedSkipBox = await skipLink.boundingBox();
      if (!(await skipLink.evaluate((element) => element === document.activeElement)) || !focusedSkipBox || focusedSkipBox.y < 0) {
        failures.push({ route: '/', viewport: viewport.label, accessibility: 'skip link is not visible on keyboard focus' });
      }
      const sampleGroup = page.getByRole('group', { name: 'Choose an illustrative answer sample' });
      const sampleThree = sampleGroup.getByRole('button').nth(2);
      await sampleThree.click();
      if ((await sampleThree.getAttribute('aria-pressed')) !== 'true') {
        failures.push({ route: '/', viewport: viewport.label, interaction: 'sample selection did not update' });
      }
      await page.getByRole('button', { name: 'Play sample sequence' }).click();
      await page.getByRole('button', { name: 'Pause sample sequence' }).waitFor();
    }

    await context.close();
  }

  const reducedContext = !process.env.AELO_E2E_ROUTE || process.env.AELO_E2E_ROUTE === '/' ? await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: 'reduce', // Emulates prefers-reduced-motion: reduce.
  }) : null;
  if (reducedContext) {
    const reducedPage = await reducedContext.newPage();
    await reducedPage.goto(origin, { waitUntil: 'domcontentloaded' });
    const firstSample = reducedPage
      .getByRole('group', { name: 'Choose an illustrative answer sample' })
      .getByRole('button')
      .first();
    await firstSample.waitFor();
    await reducedPage.waitForTimeout(5_100);
    if ((await firstSample.getAttribute('aria-pressed')) !== 'true') {
      failures.push({ route: '/', viewport: 'reduced-motion', interaction: 'sequence advanced despite reduced motion' });
    }
    await reducedContext.close();
  }

  console.log(JSON.stringify({ results, failures }, null, 2));
  if (failures.length) throw new Error(`${failures.length} public browser checks failed`);
  checksPassed = true;
} finally {
  server?.kill('SIGTERM');
  const closed = await Promise.race([
    browser.close().then(() => true),
    new Promise((resolve) => setTimeout(() => resolve(false), 5_000)),
  ]);
  if (!closed) {
    console.warn('Browser checks finished, but Chrome did not close within five seconds; ending the test runner.');
    process.exit(checksPassed ? 0 : 1);
  }
}
