// Fictional, deterministic design fixtures. Never imported by the production app.
export const engines = ["Gemini", "ChatGPT", "Claude", "Perplexity"];
export const prompts = [
  "What is the best project management tool for a small agency?",
  "Which project tools work well for client-facing teams?",
  "What are the alternatives to Asana for a growing agency?",
  "Which tools combine project planning and client approvals?",
  "What should an agency use to manage recurring projects?",
  "Which project tools are built for creative teams?",
];
const counts = [
  [1, 1, 0, 0],
  [3, 1, 0, 0],
  [3, 1, 1, 0],
  [3, 2, 1, 1],
  [4, 1, 2, 1],
  [4, 2, 2, 2],
];
const order = [2, 0, 3, 1];
export const answers = counts.flatMap((row, prompt) =>
  row.flatMap((count, engine) =>
    Array.from({ length: 4 }, (_, sample) => ({
      id: `P${prompt + 1}-E${engine + 1}-S${sample + 1}`,
      prompt,
      engine,
      sample,
      mention: order.slice(0, count).includes(sample),
    })),
  ),
);
const omitted = answers.filter((answer) => !answer.mention);
export const sources = [
  {
    name: "g2.com",
    letter: "g",
    type: "Software comparisons",
    title: "Agency project-management comparisons",
    ids: omitted.slice(0, 21).map((answer) => answer.id),
  },
  {
    name: "zapier.com",
    letter: "z",
    type: "Editorial guides",
    title: "Project-management software guides",
    ids: omitted.slice(15, 27).map((answer) => answer.id),
  },
  {
    name: "reddit.com",
    letter: "r",
    type: "Community discussions",
    title: "Agency workflow discussions",
    ids: omitted.slice(23, 32).map((answer) => answer.id),
  },
];
export function evidence(state = "complete") {
  return state === "partial"
    ? answers.filter((answer) => answer.engine !== 3)
    : ["empty", "failed", "loading"].includes(state)
      ? []
      : answers;
}
export function tally(rows) {
  return { hits: rows.filter((row) => row.mention).length, total: rows.length };
}
export function interval(hits, total) {
  if (!total) return null;
  const z = 1.96,
    p = hits / total,
    denominator = 1 + (z * z) / total;
  const centre = (p + (z * z) / (2 * total)) / denominator;
  const radius =
    (z * Math.sqrt((p * (1 - p)) / total + (z * z) / (4 * total * total))) /
    denominator;
  return [
    Math.max(0, (centre - radius) * 100),
    Math.min(100, (centre + radius) * 100),
  ];
}
export function escapeHTML(value) {
  return String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ],
  );
}
export function routeFromHash(hash) {
  const route = hash.replace(/^#/, "");
  return ["overview", "prompts", "sources", "actions", "reports"].includes(
    route,
  )
    ? route
    : "overview";
}
