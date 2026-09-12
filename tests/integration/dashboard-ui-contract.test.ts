import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../", import.meta.url);
const source = (path: string) => readFile(new URL(path, root), "utf8");

test("onboarding leads to an evidence-backed first result", async () => {
  const page = await source("app/(dashboard)/onboarding/page.tsx");

  assert.match(page, /aria-label="Onboarding progress"/);
  assert.match(page, /Your first useful result/);
  assert.match(page, /three to five editable buyer questions/i);
  assert.match(page, /Repeated answers, source evidence, and one ranked next move/);
  assert.match(page, /partial/);
  assert.match(page, /all_failed/);
  assert.doesNotMatch(page, /Welcome to Aelo!/);
  assert.doesNotMatch(page, /You&apos;re All Set!/);
  assert.doesNotMatch(page, /Discover Forums/);
  assert.doesNotMatch(page, /Optimize Content/);
});

test("the five primary dashboard jobs share restrained, evidence-first language", async () => {
  const paths = [
    "app/(dashboard)/dashboard/llm-tracker/page.tsx",
    "app/(dashboard)/dashboard/sources/page.tsx",
    "components/dashboard/analytics/citation-map.tsx",
    "app/(dashboard)/dashboard/interventions/page.tsx",
    "app/(dashboard)/dashboard/report/report-view.tsx",
    "app/(dashboard)/dashboard/settings/page.tsx",
  ];
  const pages = await Promise.all(paths.map(source));
  const combined = pages.join("\n");

  assert.doesNotMatch(combined, /(?:bg|text)-(?:blue|orange|cyan|amber)-(?:400|500|600)/);
  assert.match(pages[0], /Run a measurement/);
  assert.match(pages[0], /Collecting samples…/);
  assert.doesNotMatch(pages[0], /Run a New Scan|Scanning\.\.\./);
  assert.match(pages[2], /structured citation evidence/);
  assert.match(pages[3], /A task completed is not a result measured/);
  assert.match(pages[4], /Prompts &(?:amp;)? Scans/);
  assert.match(pages[5], /ReportsSettingsTabs/);
});

test("primary dashboard controls expose usable names and semantics", async () => {
  const [overview, tracker, actions, settings] = await Promise.all([
    source("app/(dashboard)/dashboard/page.tsx"),
    source("app/(dashboard)/dashboard/llm-tracker/page.tsx"),
    source("app/(dashboard)/dashboard/interventions/page.tsx"),
    source("app/(dashboard)/dashboard/settings/page.tsx"),
  ]);

  assert.doesNotMatch(overview, /#74807D|#9AA39F|text-\[var\(--text-ghost\)\]">\{step\}/);
  assert.match(overview, /<dd className="mt-1 text-xs text-\[var\(--text-tertiary\)\]">\{detail\}<\/dd>/);
  assert.match(tracker, /aria-pressed=\{selectedPlatforms\.includes\(platform\.id\)\}/);
  assert.match(tracker, /aria-pressed=\{scanRegion === region\.id\}/);
  assert.match(tracker, /aria-label="Add competitor"/);
  assert.match(tracker, /aria-label=\{`Remove \$\{c\}`\}/);
  assert.match(tracker, /py-12 text-center text-\[var\(--text-secondary\)\]/);
  assert.match(actions, /role="status" aria-label="Loading actions"/);
  assert.match(actions, /aria-hidden="true"/);
  for (const id of ["workspace-name", "profile-full-name", "profile-email"]) {
    assert.match(settings, new RegExp(`htmlFor="${id}"`));
    assert.match(settings, new RegExp(`id="${id}"`));
  }
  assert.match(settings, /aria-label=\{`Remove \$\{comp\}`\}/);
});
