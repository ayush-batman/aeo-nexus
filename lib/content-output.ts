function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid_content_output');
  return value as Record<string, unknown>;
}
function text(value: unknown, max = 2000): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error('invalid_content_output');
  return value.trim();
}
function array(value: unknown, max: number): unknown[] {
  if (!Array.isArray(value) || value.length > max) throw new Error('invalid_content_output');
  return value;
}
function choice<T extends string>(value: unknown, values: readonly T[]): T {
  const found = values.find(v => v === value);
  if (!found) throw new Error('invalid_content_output');
  return found;
}
export function parseContentJson(value: string): unknown {
  return JSON.parse(value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''));
}
export function promptDrafts(value: unknown) {
  return array(value, 50).map(row => {
    const data = object(row);
    return { category: text(data.category, 100), prompt: text(data.prompt, 500) };
  });
}
export function questionDrafts(value: unknown, input: string, source: string) {
  const data = object(value);
  const questions = array(data.questions, 50).map(row => {
    const q = object(row);
    const question = text(q.text, 500);
    const sourceQuote = source === 'brainstorm' ? null : text(q.sourceQuote, 2000);
    // Extracted questions must be grounded in an exact quote of the supplied
    // text; brainstorming is labelled separately and never counts as demand.
    if (sourceQuote && !input.includes(sourceQuote)) throw new Error('ungrounded_question');
    return { text: question, source, topic: text(q.topic, 200),
      type: choice(q.type, ['comparison', 'how-to', 'recommendation', 'troubleshooting', 'feature', 'pricing', 'integration', 'general']),
      priority: choice(q.priority, ['high', 'medium', 'low']), hasExistingContent: null, sourceQuote,
      evidenceStatus: source === 'brainstorm' ? 'unverified_suggestion' : 'supplied_text_extract' };
  });
  return { questions, topics: [...new Set(questions.map(q => q.topic))] };
}
export function topicDraft(value: unknown) {
  const data = object(value), pillar = object(data.pillar);
  const count = (value: unknown) => {
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1 || value > 200000) throw new Error('invalid_content_output');
    return value;
  };
  const slug = (value: unknown) => {
    const s = text(value, 150);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s)) throw new Error('invalid_content_output');
    return s;
  };
  const main = { title: text(pillar.title, 300), slug: slug(pillar.slug), outline: array(pillar.outline, 20).map(v => text(v, 500)),
    targetWordCount: count(pillar.targetWordCount), brief: text(pillar.brief, 3000) };
  const subTopics = array(data.subTopics, 30).map(row => {
    const item = object(row);
    return { title: text(item.title, 300), slug: slug(item.slug), questions: array(item.questions, 10).map(v => text(v, 500)), brief: text(item.brief),
      priority: choice(item.priority, ['high', 'medium', 'low']), type: choice(item.type, ['how-to', 'comparison', 'guide', 'faq', 'case-study']),
      linksTo: array(item.linksTo, 30).map(slug) };
  });
  const slugs = new Set([main.slug, ...subTopics.map(s => s.slug)]);
  if (slugs.size !== subTopics.length + 1 || subTopics.some(s => s.linksTo.some(link => !slugs.has(link) || link === s.slug))) throw new Error('invalid_content_output');
  const internalLinks = array(data.internalLinks, 100).map(row => {
    const link = object(row), from = slug(link.from), to = slug(link.to);
    if (!slugs.has(from) || !slugs.has(to) || from === to) throw new Error('invalid_content_output');
    return { from, to, anchorText: text(link.anchorText, 300) };
  });
  return { pillar: main, subTopics, internalLinks, totalEstimatedWords: count(data.totalEstimatedWords),
    estimatedTimeToCreate: text(data.estimatedTimeToCreate, 200), evidenceStatus: 'unverified_plan' };
}
