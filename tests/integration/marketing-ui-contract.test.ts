import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path: string) {
  return readFile(new URL(`../../${path}`, import.meta.url), "utf8");
}

test("public pages share Aelo's evidence-led visual system", async () => {
  const [primitives, product, pricing, methodology, about, solution] = await Promise.all([
    source("components/marketing/page-primitives.tsx"),
    source("app/(marketing)/product/page.tsx"),
    source("app/(marketing)/pricing/page.tsx"),
    source("app/(marketing)/methodology/page.tsx"),
    source("app/(marketing)/about/page.tsx"),
    source("components/marketing/solution-page.tsx"),
  ]);

  for (const name of ["MarketingHero", "MarketingSectionHeading", "MarketingCTA", "EvidencePanel"]) {
    assert.match(primitives, new RegExp(`export function ${name}`));
  }
  assert.match(primitives, /min-h-11/);
  assert.match(primitives, /bg-\[#131717\]/);
  assert.match(primitives, /bg-\[#fbfaf5\]/);

  for (const page of [product, pricing, methodology, about, solution]) {
    assert.doesNotMatch(page, /bg-gradient/);
    assert.doesNotMatch(page, /#6d63f7|#8de6d1|#ff9d8f|#ffdd65/);
  }
});

test("public copy does not promise causal lift or unverified market behavior", async () => {
  const files = await Promise.all([
    source("app/(marketing)/about/page.tsx"),
    source("components/marketing/solution-page.tsx"),
    source("app/(marketing)/solutions/founders/page.tsx"),
    source("app/(marketing)/solutions/marketing/page.tsx"),
    source("app/(marketing)/solutions/agencies/page.tsx"),
    source("app/(marketing)/solutions/india/page.tsx"),
  ]);
  const combined = files.join("\n");

  assert.doesNotMatch(combined, /majority of high-intent buying research/i);
  assert.doesNotMatch(combined, /prescribe the exact action that closes the gap/i);
  assert.doesNotMatch(combined, /measure the delta/i);
  assert.doesNotMatch(combined, /visibility change on the target prompt, in points, with a verdict/i);
  assert.doesNotMatch(combined, /#1 country for ChatGPT users/i);
});
