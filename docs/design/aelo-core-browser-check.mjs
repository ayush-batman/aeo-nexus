// Run from the repository: node docs/design/aelo-core-browser-check.mjs
// Only the isolated local prototype is tested. No production data is accessed.
import { chromium } from "playwright";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const browser = await chromium.launch({
  headless: true,
  executablePath:
    process.env.AELO_PREVIEW_CHROME ||
    "/Users/ayush/.agent-browser/browsers/chrome-152.0.7977.82/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
});
const page = await browser.newPage({
  viewport: { width: 1440, height: 1100 },
  reducedMotion: "reduce",
});
const errors = [],
  failedRequests = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
page.on("requestfailed", (request) => failedRequests.push(request.url()));
page.on("response", (response) => {
  if (response.status() >= 400)
    failedRequests.push(response.url() + " " + response.status());
});
try {
  await page.goto("http://127.0.0.1:4180/aelo-core.html");
  await page.evaluate(() => document.fonts.ready);
  const routes = ["overview", "prompts", "sources", "actions", "reports"];
  for (const theme of ["dark", "light"]) {
    await page.evaluate((theme) => {
      localStorage.setItem("aelo-preview-theme", theme);
    }, theme);
    await page.reload();
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1100 });
      for (const route of routes) {
        await page.goto(`http://127.0.0.1:4180/aelo-core.html#${route}`);
        await page.locator("main h1").waitFor();
        await page.evaluate(() => document.fonts.ready);
        assert.equal(await page.locator("main h1").count(), 1);
        assert.equal(
          await page.evaluate(() => document.documentElement.dataset.theme),
          theme,
        );
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          `${route} overflows at ${width} in ${theme} mode`,
        );
        await page.screenshot({
          path: `/tmp/aelo-core-${route}-${theme}-${width}.png`,
          fullPage: true,
        });
      }
    }
  }
  await page.getByRole("button", { name: "Use dark mode" }).click();
  assert.equal(
    await page.evaluate(() => localStorage.getItem("aelo-preview-theme")),
    "dark",
  );
  await page.reload();
  assert.equal(
    await page.evaluate(() => document.documentElement.dataset.theme),
    "dark",
  );
  assert.equal(
    await page.getByRole("button", { name: "Use light mode" }).count(),
    1,
  );
  // Mobile navigation and native dialog keyboard/focus behavior.
  await page.locator(".mobile-menu").click();
  await page.keyboard.press("Escape");
  assert.equal(
    await page.evaluate(() => document.activeElement.className),
    "mobile-menu",
  );
  await page.locator(".mobile-menu").click();
  await page.locator('dialog a[href="#overview"]').click();
  await page.waitForURL("**#overview");
  assert.equal(await page.locator("dialog").isVisible(), false);
  await page
    .getByRole("button", { name: "Answer sample 3", exact: true })
    .click();
  assert.match(
    await page.locator(".annotation").innerText(),
    /Northstar is mentioned/,
  );
  await page
    .getByRole("button", { name: "Read the method", exact: false })
    .click();
  await page.keyboard.press("Escape");
  assert.match(
    await page.evaluate(() => document.activeElement.textContent),
    /Read the method/,
  );
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page
    .locator('nav[aria-label="Main navigation"] a[href="#prompts"]')
    .click();
  await page.locator("#engine-filter").selectOption("2");
  await page.locator('[data-prompt="5"]').click();
  assert.match(await page.locator(".question").innerText(), /creative teams/);
  assert.match(await page.locator(".paper-label").innerText(), /Claude/);
  await page.locator('[data-dialog="edit-prompt"]').click();
  await page
    .locator("textarea")
    .fill('<img src=x onerror="alert(1)"> buyer question');
  await page.locator("#prompt-form button").click();
  await page.locator('[data-dialog="drafts"]').click();
  assert.match(await page.locator("#dialog-content").innerText(), /<img src=x/);
  assert.equal(await page.locator("#dialog-content img").count(), 0);
  await page.keyboard.press("Escape");
  assert.match(await page.locator(".question").innerText(), /creative teams/);
  await page
    .locator('nav[aria-label="Main navigation"] a[href="#sources"]')
    .click();
  await page.locator('[data-source="1"]').click();
  assert.equal(
    await page.locator(".source-detail h2").innerText(),
    "zapier.com",
  );
  await page.locator('[data-dialog="source-evidence"]').click();
  assert.match(
    await page.locator("#dialog-content").innerText(),
    /P\d-E\d-S\d/,
  );
  await page.keyboard.press("Escape");
  await page
    .locator('nav[aria-label="Main navigation"] a[href="#actions"]')
    .click();
  await page.locator('[data-status="0"]').click();
  await page.locator("#action-filter").selectOption("In progress");
  assert.equal(await page.locator(".action-item").count(), 1);
  await page.locator('[data-status="0"]').click();
  assert.equal(await page.locator(".action-item").count(), 0);
  await page.locator("#action-filter").selectOption("Done");
  assert.equal(await page.locator(".action-item").count(), 1);
  await page
    .locator('nav[aria-label="Main navigation"] a[href="#reports"]')
    .click();
  const downloadEvent = page.waitForEvent("download");
  await page.locator("[data-export]").click();
  const download = await downloadEvent;
  const text = await readFile(await download.path(), "utf8");
  assert.match(text, /60 of 96/);
  assert.match(text, /FICTIONAL DESIGN DATA/);
  await page.locator('[data-tab="Workspace"]').click();
  await page.locator('input[name="workspace"]').fill("Preview team");
  await page.locator('#workspace-form button[type="submit"]').click();
  assert.match(
    await page.locator("#announcement").innerText(),
    /this tab only/,
  );
  await page.locator('[data-tab="Access"]').click();
  await page.locator('[data-dialog="invite"]').click();
  await page.locator('input[name="email"]').fill("preview@example.com");
  await page.locator("#invite-form button").click();
  assert.match(await page.locator("#dialog-content").innerText(), /not sent/);
  await page.keyboard.press("Escape");
  for (const view of ["partial", "stale", "empty", "loading", "failed"]) {
    await page.locator("#preview-state").selectOption(view);
    for (const route of routes) {
      await page.evaluate((route) => {
        location.hash = route;
      }, route);
      await page.waitForFunction(
        (route) =>
          document.title.includes(
            {
              overview: "Overview",
              prompts: "Prompts & Scans",
              sources: "Sources",
              actions: "Actions",
              reports: "Reports & Settings",
            }[route],
          ),
        route,
      );
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      if (["empty", "loading", "failed"].includes(view))
        assert.equal(await page.locator(".engine-value").count(), 0);
    }
  }
  await page.locator("[data-reset]").click();
  await page
    .locator('nav[aria-label="Main navigation"] a[href="#overview"]')
    .click();
  await page.locator('[data-dialog="scan"]').click();
  await page.locator("#scan-outcome").selectOption("partial");
  await page.locator("#simulate-scan").click();
  await page.waitForFunction(
    () => document.querySelector("#preview-state").value === "partial",
  );
  assert.match(await page.locator(".intro").innerText(), /32 of 72/);
  assert.match(await page.locator(".engine-grid").innerText(), /Unavailable/);
  assert.deepEqual(errors, []);
  assert.deepEqual(failedRequests, []);
  console.log(
    "PASS: 20 dark/light desktop/mobile screenshots; saved theme preference; five-page navigation; dialogs and focus; samples and engine filters; safe local drafts; source inspection; action status and filters; report download; local settings; invitation preview; all preview states; partial-scan simulation. No console, page or network errors.",
  );
} finally {
  await browser.close();
}
