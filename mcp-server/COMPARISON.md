# CrowdReply MCP vs Aelo MCP

A read of `crowdreply.io/mcp` (their 18+ tool set) against what Aelo's MCP does, and where Aelo is deliberately different.

## What CrowdReply's MCP does

Three buckets, exposed to Claude / Cursor / Codex:

- **Read visibility** — `get_visibility_overview`, `get_visibility_trend`, `list_llm_mentions`, `list_llm_citations`, `list_prompts`, `compare_competitors`, `analyze_prompt_gaps`, `find_citation_sources`.
- **Read account / listening** — `list_brands`, `get_brand`, `list_projects`, `find_reddit_threads`, `list_mentions`, `list_tracked_keywords`, `list_tasks`, `get_balance`, `get_usage_metrics`.
- **Write / take action** — `create_task`, `create_group_task`, `refund_task`, `cancel_task`, **`send_upvotes`**, `add_tracked_keyword`, `add_prompts`, `delete_prompts`, `remove_tracked_keyword`. Credit-spending writes use a two-step confirm.

The pitch: "see the gap, then close it right inside your assistant." In practice, "close it" means the assistant can **order citations, queue posts, and buy upvotes** on your behalf.

## Where they are genuinely ahead

Be honest about this:

1. **Breadth of action.** They can go from insight to bought placement in one chat. That is convenient for a buyer who does not care how the sausage is made.
2. **Distribution + polish.** Live install prompts for Codex/Cursor/Claude, pricing, "5,000+ brands", a backlink marketplace. It is a finished funnel.
3. **Listening surface.** Native Reddit thread discovery and keyword mention tracking as first-class tools.

## Where Aelo is better

The difference is not tool count. It is what the numbers mean and what the tools are willing to do.

| | CrowdReply MCP | Aelo MCP |
| --- | --- | --- |
| **How a "visibility" number is made** | Presented as a figure to act on | **Multi-sampled** (same question asked N times per engine), returned with **confidence + sample count** |
| **Answer instability** | Not surfaced | **`get_answer_volatility`** — quantifies how much the answer changes on repeat; unique |
| **Citations** | `list_llm_citations` | `list_citations` returns the **actual source URLs** (receipts), filterable by "cites me / doesn't" |
| **Factual accuracy** | Not offered | **`get_accuracy_verdict`** — every claim AI made about you, checked true/false/outdated **against your own site, with the source**; unique |
| **Crawler reality** | Listening-focused | **`get_crawler_access`** — can AI actually reach you (robots.txt) + AI referral traffic |
| **Writes** | Buy upvotes, order citations, queue posts | **Measurement only** — `track_prompt`, `schedule_scan`. No money, no manipulation, ever |
| **Trust model** | Convenience over provenance | **Every number is defensible**; nothing is fabricated or bought |

### The one-line difference

**CrowdReply's assistant can buy you fake signal. Aelo's assistant tells you the honest truth and where to earn the real thing.** When an engine or Reddit tightens the screws on manufactured engagement (they will), Aelo customers have measurement they can defend; CrowdReply customers have a paper trail of bought upvotes.

## Honesty-contrast copy (for the site / outreach)

Short, usable lines that lean into the gap they just published for us:

- "Their MCP can buy you upvotes. Ours can't, on purpose."
- "We measure your AI visibility. We don't manufacture it."
- "Every number comes with its receipt. Ask the same question twice and see for yourself."
- "The honest measurement layer for AI answers. No bought citations. No fake upvotes. Just the truth about where you stand, and where to earn the next mention."
- "AI visibility you can defend in a board meeting, not one you have to hide."

## Fast-follow priorities

1. Wire the remaining `/api/v1` endpoints (all reuse existing Aelo logic).
2. Ship the **Settings → API keys** UI so a user can self-serve a read-only key.
3. Publish the copy-paste install prompt on `aelohq.com/mcp`, matching their distribution, with the honesty framing above front and center.
