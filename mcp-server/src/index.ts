#!/usr/bin/env node
/**
 * Aelo MCP server.
 *
 * Design principles (this is the whole point vs. other AI-visibility MCPs):
 *  1. HONEST NUMBERS. Every visibility figure is multi-sampled (the same
 *     question asked to each engine several times) and returned WITH its
 *     confidence and the raw evidence, because a single screenshot of an LLM
 *     answer is a coin flip.
 *  2. RECEIPTS. Citations come back as the actual URLs the model pulled from.
 *     Accuracy claims come back with the source they were checked against.
 *  3. NO MANIPULATION. There are no tools to buy upvotes, order citations, or
 *     post on someone's behalf. The only writes are measurement actions
 *     (schedule a scan, track a buyer question). Aelo measures; it never fakes.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { aelo, AeloApiError } from "./client.js";

const server = new McpServer({ name: "aelo", version: "0.1.0" });

/** Resolve a data promise into MCP tool output, turning API errors into readable text. */
async function ok(p: Promise<unknown>) {
  try {
    const data = await p;
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  } catch (e) {
    const msg = e instanceof AeloApiError ? e.message : (e as Error).message;
    return { isError: true, content: [{ type: "text" as const, text: `Aelo error: ${msg}` }] };
  }
}

/* ---------------------------------------------------------------------------
 * READS  — orient the assistant, then go deep. All honest, all with evidence.
 * ------------------------------------------------------------------------- */

server.tool(
  "list_brands",
  "List the brands/workspaces this API key can see. Call first to orient before going deeper.",
  {},
  async () => ok(aelo.get("/brands")),
);

server.tool(
  "get_visibility_overview",
  "Your AI visibility right now, across every engine you track (ChatGPT, Gemini, Claude, Perplexity). Each score is MULTI-SAMPLED and returned with a confidence value and sample count, so you can trust the number instead of a single lucky answer.",
  { window: z.enum(["7d", "30d", "90d"]).default("30d").describe("Look-back window.") },
  async ({ window }) => ok(aelo.get("/visibility/overview", { window })),
);

server.tool(
  "get_visibility_trend",
  "How your visibility has moved over time, per engine. Use to see whether you are gaining or losing ground and how volatile each engine is.",
  { window: z.enum(["30d", "90d", "180d"]).default("90d") },
  async ({ window }) => ok(aelo.get("/visibility/trend", { window })),
);

server.tool(
  "run_visibility_scan",
  "Run a FRESH multi-sample scan for a specific buyer question and brand. Asks each engine the same question several times and returns per-engine mentions, sentiment, rank, AND the raw responses as evidence. This is the honest primitive the whole product is built on.",
  {
    prompt: z.string().describe('The buyer question, e.g. "best tyre inflator for cars in India".'),
    brandName: z.string().describe("The brand to look for in the answers."),
    brandDomain: z.string().optional().describe("Optional brand domain to disambiguate."),
    competitors: z.array(z.string()).optional().describe("Optional competitor names to also detect."),
    samples: z.number().int().min(1).max(8).default(4).describe("How many times to ask each engine. More samples = tighter confidence."),
  },
  async (args) => ok(aelo.post("/scan", args)),
);

server.tool(
  "get_answer_volatility",
  "Aelo's signature metric: how much an engine's answer CHANGES when you ask the same question repeatedly. A high number means the recommendation is a coin flip and any single-shot tool is lying to you. Returns per-prompt, per-engine volatility with the differing answers as evidence.",
  {
    promptId: z.string().optional().describe("Limit to one tracked prompt; omit for an account-wide summary."),
    window: z.enum(["7d", "30d"]).default("30d"),
  },
  async (args) => ok(aelo.get("/volatility", args)),
);

server.tool(
  "compare_competitors",
  "Share of voice: who the engines name when buyers ask about your category, and where you rank against them, prompt by prompt. Honest counts from real samples, not vibes.",
  {
    window: z.enum(["7d", "30d", "90d"]).default("30d"),
    competitors: z.array(z.string()).optional().describe("Optional explicit competitor list; otherwise uses the ones on file."),
  },
  async (args) => ok(aelo.get("/competitors", args)),
);

server.tool(
  "analyze_prompt_gaps",
  "The buyer questions you should own and do not. Returns the prompts driving your category ranked by opportunity (high intent + low current visibility), so you know the easiest real wins.",
  { limit: z.number().int().min(1).max(50).default(15) },
  async ({ limit }) => ok(aelo.get("/prompts/gaps", { limit })),
);

server.tool(
  "list_citations",
  "The actual sources engines pulled from when they answered your category, as real URLs (the receipts). Filter to ones that cite you or ones that do not.",
  {
    window: z.enum(["7d", "30d", "90d"]).default("30d"),
    citesYou: z.boolean().optional().describe("true = only sources that cited you; false = only ones that did not."),
    limit: z.number().int().min(1).max(100).default(50),
  },
  async (args) => ok(aelo.get("/citations", args)),
);

server.tool(
  "find_citation_sources",
  "The domains that shape answers in your category, ranked by how often engines cite them. Use to find where to earn a mention next. Aelo tells you where to EARN a citation; it does not sell you one.",
  { limit: z.number().int().min(1).max(50).default(20) },
  async ({ limit }) => ok(aelo.get("/citations/sources", { limit })),
);

server.tool(
  "get_accuracy_verdict",
  "Every factual claim the engines made about your brand, checked against your own site and labelled true / false / outdated / unverified, each with the source it was checked against. Unique to Aelo: catch the model overstating your price or repeating a stale limitation before a buyer does.",
  { window: z.enum(["7d", "30d"]).default("30d") },
  async ({ window }) => ok(aelo.get("/accuracy", { window })),
);

server.tool(
  "get_crawler_access",
  "Whether the major AI crawlers can actually reach your site (parsed live from robots.txt) plus AI referral traffic by engine. A blocked crawler cannot cite you no matter what you publish.",
  {},
  async () => ok(aelo.get("/crawlers")),
);

server.tool(
  "list_prompts",
  "The buyer questions currently being tracked for your brand.",
  {},
  async () => ok(aelo.get("/prompts")),
);

/* ---------------------------------------------------------------------------
 * WRITES  — measurement only. No money, no manipulation, ever.
 * ------------------------------------------------------------------------- */

server.tool(
  "track_prompt",
  "Add a buyer question to track so Aelo starts MEASURING your visibility on it. This is a measurement action only; it does not post anything or spend money.",
  { prompt: z.string().describe("The buyer question to start tracking.") },
  async ({ prompt }) => ok(aelo.post("/prompts", { prompt })),
);

server.tool(
  "schedule_scan",
  "Schedule a recurring multi-sample scan so visibility is tracked automatically. Measurement only, spends no credits on anyone's behalf.",
  {
    prompt: z.string(),
    brandName: z.string(),
    frequency: z.enum(["daily", "weekly", "monthly"]).default("weekly"),
  },
  async (args) => ok(aelo.post("/scans/schedule", args)),
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stderr so it never corrupts the stdio JSON-RPC stream on stdout
  process.stderr.write("aelo-mcp running (read-first, honest measurement). No manipulation tools by design.\n");
}

main().catch((e) => {
  process.stderr.write(`aelo-mcp failed to start: ${(e as Error).message}\n`);
  process.exit(1);
});
