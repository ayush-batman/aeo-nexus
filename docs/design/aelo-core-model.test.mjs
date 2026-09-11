import test from "node:test";
import assert from "node:assert/strict";
import {
  answers,
  engines,
  evidence,
  tally,
  interval,
  sources,
  escapeHTML,
  routeFromHash,
} from "./aelo-core-model.mjs";
test("the complete fixture reconciles at every level", () => {
  assert.equal(new Set(answers.map((row) => row.id)).size, 96);
  assert.deepEqual(tally(answers), { hits: 36, total: 96 });
  assert.deepEqual(
    engines.map(
      (_, i) => tally(answers.filter((row) => row.engine === i)).hits,
    ),
    [18, 8, 6, 4],
  );
  assert.deepEqual(
    [0, 1, 2, 3, 4, 5].map(
      (i) => tally(answers.filter((row) => row.prompt === i)).hits,
    ),
    [2, 4, 5, 7, 8, 10],
  );
  for (let prompt = 0; prompt < 6; prompt++)
    for (let engine = 0; engine < 4; engine++)
      assert.equal(
        answers.filter((row) => row.prompt === prompt && row.engine === engine)
          .length,
        4,
      );
});
test("partial results exclude the failed engine, never count it as zero", () => {
  assert.deepEqual(tally(evidence("partial")), { hits: 32, total: 72 });
  assert.equal(
    evidence("partial").some((row) => row.engine === 3),
    false,
  );
});
test("absent evidence has no interval; stale evidence remains historical", () => {
  for (const state of ["empty", "loading", "failed"])
    assert.deepEqual(evidence(state), []);
  assert.equal(interval(0, 0), null);
  assert.equal(evidence("stale").length, 96);
});
test("Wilson intervals use the count denominator and remain within bounds", () => {
  const range = interval(18, 24);
  assert.ok(Math.abs(range[0] - 55.105) < 0.02);
  assert.ok(Math.abs(range[1] - 88.001) < 0.02);
  for (const hits of [0, 1, 12, 24]) {
    const [low, high] = interval(hits, 24);
    assert.ok(low >= 0 && high <= 100 && high >= low);
  }
});
test("source associations point only to existing omitted answers", () => {
  assert.deepEqual(
    sources.map((source) => source.ids.length),
    [21, 12, 9],
  );
  for (const source of sources)
    for (const id of source.ids)
      assert.equal(answers.find((row) => row.id === id)?.mention, false);
});
test("draft text is escaped for safe display", () =>
  assert.equal(
    escapeHTML('<img src=x onerror="alert(1)"> &'),
    "&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp;",
  ));
test("unknown routes fall back to overview", () => {
  assert.equal(routeFromHash("#sources"), "sources");
  assert.equal(routeFromHash("#not-found"), "overview");
});
