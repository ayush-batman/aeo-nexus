export const ACTION_STATUSES = ['planned', 'in_progress', 'completed', 'measured'] as const;
export type ActionStatus = (typeof ACTION_STATUSES)[number];
export type ActionPriority = 'high' | 'medium' | 'low';

const TRANSITIONS: Record<ActionStatus, readonly ActionStatus[]> = {
  planned: ['in_progress', 'completed'],
  in_progress: ['planned', 'completed'],
  completed: ['in_progress', 'measured'],
  measured: [],
};

export function canTransitionAction(from: ActionStatus, to: ActionStatus): boolean {
  return from === to || TRANSITIONS[from].includes(to);
}

function optionalHttpUrl(value: unknown, label: string): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || value.length > 2_048) throw new Error(`${label} is invalid.`);
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') throw new Error();
    return parsed.toString();
  } catch {
    throw new Error(`${label} must be an http or https URL.`);
  }
}

function optionalText(value: unknown, max: number): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') throw new Error('Expected text.');
  const text = value.trim();
  if (!text || text.length > max) throw new Error(`Text must be between 1 and ${max} characters.`);
  return text;
}

export function normalizeActionInput(input: Record<string, unknown>) {
  const title = optionalText(input.title, 180);
  const hypothesis = optionalText(input.hypothesis, 1_000);
  if (!title) throw new Error('Title is required.');
  if (!hypothesis) throw new Error('Hypothesis is required.');

  const status = input.status ?? 'planned';
  if (!ACTION_STATUSES.includes(status as ActionStatus) || status === 'measured') {
    throw new Error('Status must be planned, in progress, or completed.');
  }
  const priority = input.priority ?? 'medium';
  if (!['high', 'medium', 'low'].includes(String(priority))) throw new Error('Priority is invalid.');

  const prompts = Array.isArray(input.target_prompts)
    ? [...new Set(input.target_prompts.map(value => String(value).trim()).filter(Boolean))]
    : [];
  if (prompts.length > 20 || prompts.some(prompt => prompt.length > 500)) {
    throw new Error('Target prompts are invalid.');
  }

  const engines = Array.isArray(input.target_engines)
    ? [...new Set(input.target_engines.map(value => String(value).trim()).filter(Boolean))]
    : [];
  if (engines.length > 8 || engines.some(engine => engine.length > 40)) {
    throw new Error('Target engines are invalid.');
  }

  return {
    title,
    hypothesis,
    description: optionalText(input.description, 4_000),
    source_url: optionalHttpUrl(input.source_url, 'Source URL'),
    action_url: optionalHttpUrl(input.action_url, 'Action URL'),
    owner_id: optionalText(input.owner_id, 80),
    insight_key: optionalText(input.insight_key, 180),
    priority: priority as ActionPriority,
    status: status as Exclude<ActionStatus, 'measured'>,
    target_prompts: prompts,
    target_engines: engines,
  };
}

export function actionFromInsight(insight: {
  id: string;
  title: string;
  detail: string;
  priority: ActionPriority;
  actionHref: string;
  targetPrompt?: string;
}) {
  return {
    title: insight.title,
    hypothesis: insight.detail,
    description: `Suggested by Aelo. Recommended next step: ${insight.actionHref}`,
    insight_key: `insight:${insight.id}`,
    priority: insight.priority,
    status: 'planned' as const,
    target_prompts: insight.targetPrompt ? [insight.targetPrompt] : [],
    target_engines: [],
  };
}
