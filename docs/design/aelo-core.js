import {
  engines,
  prompts,
  answers,
  sources,
  evidence,
  tally,
  interval,
  escapeHTML as esc,
  routeFromHash,
} from "./aelo-core-model.mjs";

const routes = {
  overview: "Overview",
  prompts: "Prompts & Scans",
  sources: "Sources",
  actions: "Actions",
  reports: "Reports & Settings",
};
const state = {
  view: "complete",
  prompt: 0,
  engine: 0,
  sample: 0,
  source: 0,
  reportTab: "Report",
  actionFilter: "All",
  statuses: ["To investigate", "To investigate", "To investigate"],
  drafts: {},
  workspace: "Northstar",
  region: "India",
  language: "English",
};
const main = document.querySelector("#main"),
  dialog = document.querySelector("#detail"),
  dialogContent = document.querySelector("#dialog-content");
let opener = null,
  toastTimer,
  scanTimer;
const themeToggle = document.querySelector("#theme-toggle");
function applyTheme(theme, announceChange = false) {
  const next = theme === "light" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  document.querySelector('meta[name="theme-color"]').content =
    next === "light" ? "#f0f1ed" : "#171a1b";
  themeToggle.setAttribute(
    "aria-label",
    `Use ${next === "dark" ? "light" : "dark"} mode`,
  );
  themeToggle.setAttribute("aria-pressed", String(next === "light"));
  themeToggle.querySelector(".theme-icon").textContent =
    next === "dark" ? "☼" : "◐";
  themeToggle.querySelector(".theme-label").textContent =
    next === "dark" ? "Light mode" : "Dark mode";
  try {
    localStorage.setItem("aelo-preview-theme", next);
  } catch {
    // The visual mode still works when storage is unavailable.
  }
  if (announceChange)
    announce(`${next === "dark" ? "Dark" : "Light"} mode on.`);
}
const link = (route, label, primary = false) =>
  `<a class="button ${primary ? "primary" : ""}" href="#${route}">${label} <span aria-hidden="true">↗</span></a>`;
const current = () => routeFromHash(location.hash);
const nav = () =>
  Object.entries(routes)
    .map(
      ([route, label]) =>
        `<a href="#${route}" ${current() === route ? 'aria-current="page"' : ""}>${label}</a>`,
    )
    .join("");
const pct = (hits, total) =>
  total ? Math.round((hits / total) * 100) + "%" : "—";
const sampleRows = () => evidence(state.view);
function heading(kicker, title, description, button = "") {
  return `<div class="page-heading"><div><div class="eyebrow muted">${kicker}</div><h1>${title}</h1><p>${description}</p></div>${button}</div>`;
}
function note() {
  return state.view === "partial"
    ? `<div class="notice warning"><div><strong>Perplexity did not return usable answers.</strong>Showing 72 completed samples. Failed samples are excluded, not counted as omissions.</div><button data-dialog="scan">Preview retry</button></div>`
    : state.view === "stale"
      ? `<div class="notice warning"><div><strong>This scan is more than 30 days old.</strong>These are historical answers, not a current reading of your visibility.</div><button data-dialog="scan">Preview new scan</button></div>`
      : "";
}
function answerPaper(
  promptIndex = state.prompt,
  engine = state.engine,
  sample = state.sample,
) {
  const answer = answers.find(
    (row) =>
      row.prompt === promptIndex &&
      row.engine === engine &&
      row.sample === sample,
  );
  return `<article class="answer-paper" aria-label="Fictional answer excerpt" aria-live="polite"><div class="paper-label"><span>${engines[engine]} / SAMPLE 0${sample + 1}</span><span>ILLUSTRATIVE EXCERPT</span></div><div class="question">${esc(prompts[promptIndex])}</div><div class="answer-copy">${answer.mention ? `<p>For a small agency, <mark>Northstar</mark> is worth considering alongside Asana and ClickUp.</p><p>Compare client approvals, recurring work and how easily your team can share progress. The right fit depends on the workflow you need.</p>` : `<p>For a small agency, I’d shortlist <strong>Asana</strong> for coordinating projects, <strong>ClickUp</strong> for flexible workflows, and <strong>monday.com</strong> for visual planning.</p><p>Start with the way your team handles client approvals, then compare the tools against that workflow.</p>`}</div><div class="annotation"><span>${answer.mention ? "↳ Northstar is mentioned" : "↳ Northstar is not mentioned"}</span><span class="mono">${answer.id}</span></div></article>`;
}
function sampleSelector() {
  return `<div class="samples"><span>Same question. Four answers.</span>${[0, 1, 2, 3].map((i) => `<button data-sample="${i}" aria-label="Answer sample ${i + 1}" aria-pressed="${state.sample === i}">0${i + 1}</button>`).join("")}</div>`;
}
function engineStrip() {
  return `<div class="engine-grid">${engines
    .map((engine, i) => {
      const { hits, total } = tally(
        sampleRows().filter((row) => row.engine === i),
      );
      const ci = interval(hits, total);
      return `<div><div class="engine-name"><span>0${i + 1}</span>${engine}</div><div class="engine-value">${pct(hits, total)}<small>${total ? `${hits} / ${total} answers` : "Unavailable"}</small></div>${ci ? `<div class="interval" aria-label="95 percent interval ${Math.round(ci[0])} to ${Math.round(ci[1])} percent" style="--low:${ci[0]}%;--high:${ci[1]}%;--point:${(hits / total) * 100}%"><i></i><b></b></div><div class="engine-note">95% interval ${Math.round(ci[0])}–${Math.round(ci[1])}%</div>` : `<div class="interval"></div><div class="engine-note">Provider failed · not zero</div>`}</div>`;
    })
    .join("")}</div>`;
}
function overview() {
  const { hits, total } = tally(sampleRows());
  return `<div class="wrap">${note()}<div class="context-line"><span>NORTHSTAR / VISIBILITY BRIEF</span><span class="status-dot">${state.view === "stale" ? "08 Aug" : "08 Sep"} 2026 · ${total} sample answers</span></div><section class="hero"><div><h1>Most answers<br><span>leave you out.</span></h1><p class="intro">Northstar appeared in <strong>${hits} of ${total} answers.</strong> The other ${total - hits} didn’t mention your brand. Start with the questions where buyers are choosing a tool.</p><div class="buttons">${link("prompts", "See the missing mentions", true)}<button class="text-button" data-dialog="scan">Run another scan ↗</button></div><p class="footnote">${state.view === "partial" ? "3 responding engines" : "4 engines"} · 6 buyer questions · 4 samples per question</p></div><div>${answerPaper(0, 0, state.sample)}${sampleSelector()}</div></section><section aria-labelledby="engine-heading"><div class="section-top"><div><h2 id="engine-heading">Visibility, by engine</h2><p>Share of completed answers that mention Northstar.</p></div><button class="text-button" data-dialog="method">Read the method ↗</button></div>${engineStrip()}<p class="engine-foot">The line shows uncertainty around each estimate. These are sampled API answers, not a census of consumer chats.</p></section></div><section class="light"><div class="wrap opportunity"><div><div class="eyebrow muted">NEXT INVESTIGATION / 01</div><h2>The sources are visible.<br>The reason you’re missing isn’t.</h2><p>Review the pages behind the answers before deciding what to change. A citation tells you a source was used—not that it caused an omission.</p><div class="buttons">${link("sources", "Inspect the cited sources")}</div></div><div><div class="source-mini"><span>SAMPLE SOURCE DOMAIN</span><span>ANSWERS OMITTING YOU</span></div>${sources.map((source, i) => `<a class="source-mini" href="#sources" data-source-link="${i}"><strong>${source.name} ↗</strong><span>${sourceCount(source)}</span></a>`).join("")}<p class="small muted" style="margin-top:20px">Illustrative source associations; answers may cite more than one domain. No real citation URLs are connected.</p></div></div></section>`;
}
function promptsPage() {
  return `<div class="wrap">${note()}${heading("01 / MEASURE", "Ask what buyers ask.", "Track the questions that put your brand in—or leave it out of—the shortlist.", '<button class="primary" data-dialog="prompt">Add a draft prompt +</button>')}<div class="toolbar"><span class="count">6 TRACKED QUESTIONS · ${Object.keys(state.drafts).length} LOCAL DRAFTS</span><label>Answer engine <select id="engine-filter">${engines.map((engine, i) => `<option value="${i}" ${state.engine === i ? "selected" : ""} ${state.view === "partial" && i === 3 ? "disabled" : ""}>${engine}${state.view === "partial" && i === 3 ? " · unavailable" : ""}</option>`).join("")}</select></label></div><div class="split"><div><div class="prompt-list">${prompts
    .map((prompt, i) => {
      const rows = sampleRows().filter(
          (row) => row.prompt === i && row.engine === state.engine,
        ),
        { hits, total } = tally(rows);
      return `<button class="prompt-row" data-prompt="${i}" aria-pressed="${state.prompt === i}"><span class="row-number">0${i + 1}</span><span class="row-title">${esc(prompt)}<small>${state.drafts[i] ? "EDIT SAVED AS LOCAL DRAFT" : "BUYER SHORTLIST · 4 SAMPLES"}</small></span><span class="ratio">${hits}/${total}<small>MENTIONS</small></span></button>`;
    })
    .join(
      "",
    )}</div><p class="footnote">Editing a prompt creates a draft for a future scan. Historical answers stay attached to the original question.</p><button class="text-button" data-dialog="drafts">Review local drafts ↗</button></div><div class="inspection"><div class="section-top"><h2>Read the answer</h2><button class="text-button" data-dialog="edit-prompt">Edit this prompt ↗</button></div>${answerPaper()}${sampleSelector()}<button class="text-button" data-dialog="receipt">Sample details ↗</button></div></div></div>`;
}
function sourceCount(source) {
  const ids = new Set(sampleRows().map((row) => row.id));
  return source.ids.filter((id) => ids.has(id)).length;
}
function sourcesPage() {
  const source = sources[state.source],
    count = sourceCount(source);
  return `<div class="wrap">${note()}${heading("02 / TRACE", "Follow the sources.", "These domains appear in the sample answers that leave Northstar out. Inspect the evidence before turning it into a task.")}<div class="toolbar"><span class="count">3 DOMAINS · OMISSIONS ONLY</span><button class="text-button" data-dialog="source-method">What counts as a citation? ↗</button></div><div class="source-ledger"><div>${sources.map((item, i) => `<button class="source-row" data-source="${i}" aria-pressed="${state.source === i}"><span class="source-icon" aria-hidden="true">${item.letter}</span><span><h3>${item.name}</h3><p>${item.type}</p></span><span class="source-total">${sourceCount(item)}</span></button>`).join("")}<p class="footnote">Counts are completed answers, not unique visitors or referral traffic. Domain counts can overlap.</p></div><article class="source-detail"><span class="light-tag">FICTIONAL SOURCE ASSOCIATIONS</span><h2>${source.name}</h2><p>${source.type}. A place to investigate, not a placement to buy.</p><div class="stat-pair"><div><strong>${count}</strong><span>answers omit Northstar</span></div><div><strong>—</strong><span>live URLs connected</span></div></div><div class="eyebrow">EVIDENCE TO REVIEW</div><div class="evidence-item"><h3>${source.title}</h3><p>In the real product, each entry opens the exact provider citation and the sampled answer that contains it.</p><button data-dialog="source-evidence">Inspect sample associations ↗</button></div><div class="evidence-item"><h3>What to look for</h3><p>Is Northstar included? Does the comparison address the buyer’s question? Is the information current and factually correct?</p></div><div class="buttons">${link("actions", "Review the recommended action")}</div></article></div></div>`;
}
const actionCopy = [
  {
    title: "Check the comparison pages that leave you out.",
    body: "Start with the cited comparisons. Record whether Northstar is missing, misdescribed, or simply not a fit for the buyer’s question.",
    evidence: "Source evidence",
    effort: "Research · 30–45 min",
    steps: [
      "Open the exact cited page and the sampled answer together.",
      "Check inclusion, factual accuracy and the buyer’s use case.",
      "Record a specific correction or relevant submission route. Do not buy a mention.",
    ],
  },
  {
    title: "Make your client-approval workflow easy to verify.",
    body: "Review your own product page against the buyer questions. Explain the workflow, who it helps, and its limits with concrete product evidence.",
    evidence: "Prompt evidence",
    effort: "Content review · 1–2 hours",
    steps: [
      "Compare your current page against the client-approval prompt.",
      "Replace unsupported claims with product examples and limitations.",
      "Record the change date. Visibility improvement is not guaranteed.",
    ],
  },
  {
    title: "Re-measure before calling it an improvement.",
    body: "After making a change, run the same questions under matching conditions. Keep the original evidence so the comparison can be checked.",
    evidence: "Measurement method",
    effort: "Follow-up scan",
    steps: [
      "Use matching prompts, engines, models, region and measurement versions.",
      "Collect enough repeated samples in both runs.",
      "Report an inconclusive result if the evidence does not support a change.",
    ],
  },
];
function actionsPage() {
  const shown = actionCopy
    .map((action, i) => ({ action, i }))
    .filter(
      ({ i }) =>
        state.actionFilter === "All" ||
        state.statuses[i] === state.actionFilter,
    );
  return `<div class="wrap">${note()}${heading("03 / ACT", "One useful next move.", "A short investigation queue, ranked by the available evidence. No promises of placement or guaranteed lift.")}<div class="toolbar"><span class="count">${state.statuses.filter((status) => status === "Done").length} OF 3 MARKED DONE · LOCAL PREVIEW</span><label>Show <select id="action-filter">${["All", "To investigate", "In progress", "Done"].map((value) => `<option ${state.actionFilter === value ? "selected" : ""}>${value}</option>`).join("")}</select></label></div><div class="action-layout"><div>${shown.length ? shown.map(({ action, i }) => `<article class="action-item"><div class="rank">0${i + 1}</div><div><div class="action-meta"><span>${action.evidence.toUpperCase()}</span><span>${state.statuses[i]}</span></div><h2>${action.title}</h2><p>${action.body}</p><div class="action-meta"><span>${action.effort}</span></div><div class="buttons"><button ${i === 0 ? 'class="primary"' : ""} data-action="${i}">Open investigation ↗</button><button class="text-button" data-status="${i}">${state.statuses[i] === "To investigate" ? "Start" : state.statuses[i] === "In progress" ? "Mark done" : "Reopen"}</button></div></div></article>`).join("") : '<div class="empty-line"><h2>No actions in this view.</h2><p class="muted">Choose another status to see the rest of the queue.</p></div>'}</div><aside class="action-aside"><div class="eyebrow muted">THE STANDARD OF PROOF</div><h3>A task completed<br>isn’t a result measured.</h3><p>Finishing this queue does not increase your visibility score. Only new answers can change the measurement.</p><ol><li>Save the current evidence.</li><li>Make one documented change.</li><li>Compare a compatible follow-up scan.</li></ol><div class="notice"><div><strong>Outcome: not measured</strong>No follow-up scan in this sample.</div></div>${link("reports", "Read the decision brief")}</aside></div></div>`;
}
function reportDocument() {
  const { hits, total } = tally(sampleRows());
  return `<article class="report"><div class="report-head"><span class="wordmark">aelo<span>↗</span></span><span class="mono">SAMPLE BRIEF / 001</span></div><h2>Northstar is missing from<br>${total - hits} of ${total} answers.</h2><p class="report-lead">Visibility is uneven across engines. Use the answer-level evidence to choose what to investigate next.</p><table><caption class="small" style="text-align:left;margin-bottom:12px">Sampled mention rates · 95% intervals</caption><thead><tr><th scope="col">ENGINE</th><th scope="col">MENTIONS</th><th scope="col">RATE</th><th scope="col">INTERVAL</th></tr></thead><tbody>${engines
    .map((engine, i) => {
      const { hits, total } = tally(
          sampleRows().filter((row) => row.engine === i),
        ),
        ci = interval(hits, total);
      return `<tr><td>${engine}</td><td>${total ? hits + " / " + total : "Failed"}</td><td>${pct(hits, total)}</td><td>${ci ? Math.round(ci[0]) + "–" + Math.round(ci[1]) + "%" : "—"}</td></tr>`;
    })
    .join(
      "",
    )}</tbody></table><h3>Next: inspect the cited comparisons.</h3><p>Check the underlying pages for omissions and factual errors. A citation is not proof that a page caused a recommendation.</p><h3>What this does not establish</h3><p>This single scan does not establish a trend, attribution, or a likely return on a content change.</p><div class="report-footer">FICTIONAL DESIGN DATA · ${state.view === "stale" ? "08 AUG" : "08 SEP"} 2026 · INDIA / ENGLISH<br>6 PROMPTS × ${state.view === "partial" ? 3 : 4} RESPONDING ENGINES × 4 SAMPLES<br>API ANSWERS · PROVIDER MODELS NOT CONNECTED · NO LIVE CITATION URLS</div></article>`;
}
function settingsContent() {
  if (state.reportTab === "Workspace")
    return `<form class="settings-form" id="workspace-form"><h2>A workspace your team recognises.</h2><p>These preferences are saved in this tab only. The fictional historical scan remains Northstar / India / English.</p><label>Workspace display name<input name="workspace" maxlength="60" required value="${esc(state.workspace)}"></label><div class="field-row"><label>Default region<select name="region"><option ${state.region === "India" ? "selected" : ""}>India</option><option ${state.region === "United States" ? "selected" : ""}>United States</option></select></label><label>Default language<select name="language"><option>English</option></select></label></div><div class="notice"><div><strong>Changing defaults starts a new comparison group.</strong>Answers from different regions should not be presented as a like-for-like trend.</div></div><button class="primary" type="submit">Save local preferences</button></form>`;
  if (state.reportTab === "Access")
    return `<section class="settings-form"><h2>Control who can see and change things.</h2><p>Illustrative roles and API access. No real accounts or credentials are connected.</p><div class="setting-row"><div><h3>Workspace owner</h3><p>Sample owner · full workspace access</p></div><span class="light-tag muted">FICTIONAL MEMBER</span></div><div class="setting-row"><div><h3>Team access</h3><p>Give teammates only the access their work needs.</p></div><button data-dialog="invite">Preview invitation</button></div><div class="setting-row"><div><h3>API keys & MCP</h3><p>Scope access to this workspace. Keep write access separate.</p></div><button data-dialog="key">Preview key permissions</button></div></section>`;
  return `<section class="settings-form"><h2>Know what a scan can run.</h2><p>This mockup does not know your plan, usage or provider configuration.</p>${["Plan & billing", "Engine connections", "Email reports"].map((name, i) => `<div class="setting-row"><div><h3>${name}</h3><p>${["No live price, payment method or quota is shown.", "Provider availability must be checked before scheduling scans.", "Delivery requires a verified sender and configured email service."][i]}</p></div><button data-dialog="${["billing", "connections", "email"][i]}">View requirements</button></div>`).join("")}</section>`;
}
function reportsPage() {
  return `<div class="wrap">${note()}${heading("04 / SHARE & MANAGE", "A brief you can stand behind.", "The finding, the supporting evidence, and the limits—kept together.")}<div class="tabs" aria-label="Reports and settings sections">${["Report", "Workspace", "Access", "Connections"].map((tab) => `<button data-tab="${tab}" aria-pressed="${state.reportTab === tab}">${tab}</button>`).join("")}</div>${state.reportTab === "Report" ? `<div class="report-layout">${reportDocument()}<aside class="report-controls"><div class="eyebrow muted" style="margin-bottom:20px">DECISION BRIEF</div><h2>Share the evidence,<br>not just the percentage.</h2><p>This sample export includes counts, uncertainty, the proposed action and the measurement limits.</p><label>Export format<select id="export-format"><option>Plain text (.txt)</option></select></label><button class="primary button" data-export="report">Download sample brief ↓</button><p class="footnote">Local download only. No email is sent and no public link is created.</p><button class="text-button" data-dialog="method">Review the methodology ↗</button></aside></div>` : settingsContent()}</div>`;
}
function unavailable() {
  const content = {
    empty: [
      "NO SCAN YET",
      "Your first finding starts with a question.",
      "Add a few buyer questions, then run a repeated scan. Missing data is not a zero score.",
      "Load sample scan",
    ],
    loading: [
      "LOADING PREVIEW",
      "Gathering the evidence.",
      "The real interface would wait for saved results. This is a static loading-state preview.",
      "Show completed sample",
    ],
    failed: [
      "SCAN FAILED",
      "No usable answers came back.",
      "Nothing has been counted as a missing mention. Check provider connections before retrying.",
      "Preview retry",
    ],
  }[state.view];
  return `<div class="wrap"><div class="eyebrow muted">${routes[current()].toUpperCase()}</div><div class="state-empty"><div class="eyebrow muted">${content[0]}</div><h1>${content[1]}</h1><p>${content[2]}</p>${state.view === "loading" ? '<div aria-hidden="true"><div class="loading-line"></div><div class="loading-line"></div></div>' : ""}<div class="buttons"><button class="primary" data-reset>${content[3]} ↗</button></div></div></div>`;
}
function render(focus = false) {
  if (state.view === "partial" && state.engine === 3) state.engine = 0;
  document.querySelector("#navigation").innerHTML = nav();
  main.innerHTML = ["empty", "loading", "failed"].includes(state.view)
    ? unavailable()
    : {
        overview,
        prompts: promptsPage,
        sources: sourcesPage,
        actions: actionsPage,
        reports: reportsPage,
      }[current()]();
  document.title = `Aelo — ${routes[current()]} · Design preview`;
  if (focus) {
    main.focus();
    window.scrollTo({ top: 0, behavior: "instant" });
  }
}
function announce(message) {
  const node = document.querySelector("#announcement");
  clearTimeout(toastTimer);
  node.textContent = message;
  node.classList.add("visible");
  toastTimer = setTimeout(() => node.classList.remove("visible"), 4500);
}
function show(title, body) {
  if (!dialog.open) opener = document.activeElement;
  dialogContent.innerHTML = `<h2 id="dialog-title">${title}</h2>${body}`;
  if (!dialog.open) dialog.showModal();
}
function close() {
  clearTimeout(scanTimer);
  dialog.close();
  if (opener?.isConnected) opener.focus();
}
function openDetail(name) {
  const details = {
    method: [
      "Read the number with its evidence.",
      "<p>Visibility is the share of completed, usable sampled answers that mention the tracked brand. Each engine is shown separately.</p><ul><li>Six prompts, four answers per prompt and engine. Failed answers are excluded from the denominator.</li><li>Intervals use the Wilson 95% method. They describe sampling uncertainty under its assumptions—not a probability that the brand is visible.</li><li>Repeated model outputs can be correlated. The interval does not capture all model, prompt or time variation.</li><li>Compare only compatible prompts, engines, models, region and scoring versions with enough samples.</li></ul><p>All values in this preview are fictional. Real models and citations are not connected.</p>",
    ],
    workspace: [
      "Northstar · sample workspace",
      '<p>This is a fictional agency-software brand used to review the design. Nothing here reads or changes your Aelo workspace.</p><div class="buttons">' +
        link("reports", "Workspace settings") +
        "</div>",
    ],
    menu: [
      "Where would you like to go?",
      '<nav aria-label="Mobile navigation">' + nav() + "</nav>",
    ],
    receipt: [
      "The answer behind the number.",
      `<p>Sample ${esc(`P${state.prompt + 1}-E${state.engine + 1}-S${state.sample + 1}`)} · ${engines[state.engine]} · India / English.</p><p>The displayed excerpt is fictional. A connected receipt should include the original answer, timestamp, provider model, scoring version, completion status and structured citation URLs.</p><p>Missing metadata should prevent an unsupported like-for-like comparison.</p>`,
    ],
    "source-method": [
      "A citation is not just a link.",
      "<p>Provider citations must come from the provider’s structured evidence. A URL appearing only in generated prose is a mentioned link, not a verified provider citation.</p><p>This preview uses fictional domain associations. It intentionally provides no invented citation URLs.</p>",
    ],
    "source-evidence": [
      sources[state.source].name + " · sample evidence",
      `<p>Fictional answer associations for this layout. No source URLs or real provider receipts are connected.</p><ul>${sources[
        state.source
      ].ids
        .filter((id) => sampleRows().some((row) => row.id === id))
        .slice(0, 5)
        .map((id) => `<li>${id} · Northstar omitted</li>`)
        .join(
          "",
        )}</ul><p>Showing up to five sample IDs. Inspecting the underlying page is required before recommending a correction.</p>`,
    ],
    billing: [
      "Billing is not connected.",
      "<p>The connected product should show the current plan, remaining scan allowance, billing provider and a safe route to manage the subscription.</p><p>No price, quota or payment action is fabricated in this mockup.</p>",
    ],
    connections: [
      "Check each engine before a scan.",
      "<p>The connected product should show availability, the configured model and the latest provider error for Gemini, ChatGPT, Claude and Perplexity.</p><p>This design preview never calls those providers.</p>",
    ],
    email: [
      "Email delivery needs a real check.",
      "<p>Before enabling scheduled reports, verify the sender, recipients, email-service configuration and an actual non-production delivery.</p><p>No messages are sent from this preview.</p>",
    ],
    key: [
      "Access should be deliberate.",
      "<p>A read-only key can inspect workspace evidence. Starting scans requires a separate write scope, valid entitlements and an available quota.</p><p>The real product must show a newly created secret once and support revocation. This mockup creates no key.</p>",
    ],
    invite: [
      "Preview an invitation",
      '<p>This form is illustrative. Submitting it sends no email.</p><form id="invite-form"><label>Email address<input type="email" required name="email" placeholder="teammate@example.com"></label><label>Role<select name="role"><option>Viewer — read evidence</option><option>Editor — manage prompts and scans</option></select></label><button class="primary">Preview invitation</button></form>',
    ],
    scan: [
      "Run another scan",
      '<p>Preview only: no provider calls, quota usage or new measurements. Choose a sample result to see the interface state.</p><label>Simulated outcome<select id="scan-outcome"><option value="complete">All four engines respond</option><option value="partial">Perplexity fails; three respond</option><option value="failed">All engines fail</option></select></label><button class="primary" id="simulate-scan">Start 2-second preview</button>',
    ],
    prompt: [
      "Add a draft buyer question",
      '<p>Saved locally in this tab. It will not change the existing sample scan.</p><form id="prompt-form"><label>Buyer question<textarea name="prompt" required maxlength="240" placeholder="What would your customer ask before choosing a tool?"></textarea></label><button class="primary">Save local draft</button></form>',
    ],
    "edit-prompt": [
      "Edit for the next scan",
      `<p>The original question and its historical answers stay unchanged.</p><form id="prompt-form" data-edit="${state.prompt}"><label>Buyer question<textarea name="prompt" required maxlength="240">${esc(state.drafts[state.prompt] || prompts[state.prompt])}</textarea></label><button class="primary">Save local draft</button></form>`,
    ],
    drafts: [
      "Local prompt drafts",
      Object.keys(state.drafts).length
        ? "<p>Drafts are not scanned and disappear when the page is reloaded.</p><ul>" +
          Object.values(state.drafts)
            .map((draft) => `<li>${esc(draft)}</li>`)
            .join("") +
          "</ul>"
        : "<p>No drafts yet. Add a question or edit a tracked prompt to prepare the next scan.</p>",
    ],
  };
  if (details[name]) show(...details[name]);
}
document.addEventListener("click", (event) => {
  const button = event.target.closest("button,a");
  if (!button) return;
  if (button.id === "theme-toggle") {
    applyTheme(
      document.documentElement.dataset.theme === "dark" ? "light" : "dark",
      true,
    );
  }
  if (button.matches('dialog a[href^="#"]')) close();
  if (button.dataset.dialog) openDetail(button.dataset.dialog);
  for (const [key, property] of [
    ["sample", "sample"],
    ["prompt", "prompt"],
    ["source", "source"],
  ])
    if (button.dataset[key] !== undefined) {
      state[property] = Number(button.dataset[key]);
      if (key === "prompt") state.sample = 0;
      render();
      document.querySelector(`[data-${key}="${state[property]}"]`)?.focus();
      if (innerWidth <= 800 && key !== "sample")
        document
          .querySelector(key === "prompt" ? ".inspection" : ".source-detail")
          ?.scrollIntoView({ block: "start", behavior: "instant" });
    }
  if (button.dataset.sourceLink !== undefined)
    state.source = Number(button.dataset.sourceLink);
  if (button.dataset.tab) {
    state.reportTab = button.dataset.tab;
    render();
    document.querySelector(`[data-tab="${state.reportTab}"]`).focus();
  }
  if (button.dataset.status !== undefined) {
    const i = Number(button.dataset.status),
      values = ["To investigate", "In progress", "Done"];
    state.statuses[i] = values[(values.indexOf(state.statuses[i]) + 1) % 3];
    render();
    (
      document.querySelector(`[data-status="${i}"]`) ||
      document.querySelector("#action-filter")
    ).focus();
    announce(
      "Local action status: " +
        state.statuses[i] +
        ". Visibility is unchanged.",
    );
  }
  if (button.dataset.action !== undefined) {
    const i = Number(button.dataset.action),
      action = actionCopy[i];
    show(
      action.title,
      `<p>${action.body}</p><ol>${action.steps.map((step) => `<li>${step}</li>`).join("")}</ol><p>Current status: ${state.statuses[i]}. This is a proposed investigation, not a promise of improved visibility.</p>`,
    );
  }
  if (button.hasAttribute("data-reset")) {
    state.view = "complete";
    document.querySelector("#preview-state").value = "complete";
    render(true);
    announce("Showing the fictional completed scan. No scan was run.");
  }
  if (button.id === "close-dialog") close();
  if (button.id === "simulate-scan") {
    const outcome = document.querySelector("#scan-outcome").value;
    show(
      "Previewing a scan…",
      '<p role="status">Simulating the waiting state. No requests are being sent to AI providers.</p>',
    );
    scanTimer = setTimeout(() => {
      state.view = outcome;
      document.querySelector("#preview-state").value = outcome;
      close();
      render(true);
      announce("Simulation complete. Showing " + outcome + " sample state.");
    }, 2000);
  }
  if (button.dataset.export) {
    const text = document.querySelector(".report").innerText;
    const url = URL.createObjectURL(
      new Blob([text], { type: "text/plain;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "aelo-fictional-sample-brief.txt";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    announce("Downloaded fictional sample brief. Nothing was shared online.");
  }
});
document.addEventListener("change", (event) => {
  const target = event.target;
  if (target.id === "preview-state") {
    state.view = target.value;
    render();
  }
  if (target.id === "engine-filter") {
    state.engine = Number(target.value);
    state.sample = 0;
    render();
    document.querySelector("#engine-filter").focus();
  }
  if (target.id === "action-filter") {
    state.actionFilter = target.value;
    render();
    document.querySelector("#action-filter").focus();
  }
});
document.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.target,
    data = new FormData(form);
  if (form.id === "prompt-form") {
    const prompt = String(data.get("prompt")).trim();
    if (!prompt) {
      form
        .querySelector("textarea")
        .setCustomValidity("Write a buyer question.");
      form.reportValidity();
      return;
    }
    state.drafts[
      form.dataset.edit ?? `new-${Object.keys(state.drafts).length}`
    ] = prompt;
    close();
    render();
    main.focus();
    announce("Draft saved in this tab. Existing scan evidence is unchanged.");
  }
  if (form.id === "workspace-form") {
    const workspace = String(data.get("workspace")).trim();
    if (!workspace) {
      form.querySelector("input").setCustomValidity("Enter a workspace name.");
      form.reportValidity();
      return;
    }
    state.workspace = workspace;
    state.region = String(data.get("region"));
    state.language = String(data.get("language"));
    announce(
      "Preferences saved in this tab only. Historical scan is unchanged.",
    );
  }
  if (form.id === "invite-form") {
    show(
      "Invitation preview—not sent.",
      `<p>${esc(data.get("email"))} would be invited as ${esc(data.get("role"))}.</p><p>No invitation, account or email was created.</p>`,
    );
  }
});
document.addEventListener("input", (event) => {
  if (event.target.matches("input,textarea"))
    event.target.setCustomValidity("");
});
dialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  close();
});
window.addEventListener("hashchange", () => {
  if (dialog.open) close();
  render(true);
});
render();
applyTheme(document.documentElement.dataset.theme);
