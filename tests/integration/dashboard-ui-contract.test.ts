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
