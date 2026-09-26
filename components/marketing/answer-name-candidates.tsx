import type { AnswerNameCandidate } from '@/lib/ai/answer-name-candidates';

export function AnswerNameCandidates({ candidates }: { candidates: AnswerNameCandidate[] }) {
  return (
    <section aria-labelledby="answer-names-heading" className="mb-6 rounded-md border border-[var(--border-default)] bg-[var(--bg-raised)] px-4 py-4">
      <h2 id="answer-names-heading" className="text-sm font-medium text-[var(--text-primary)]">Other names to review</h2>
      <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
        {candidates.length > 0
          ? 'These names were pulled from formatted text in this answer. They are not verified competitors or recommendations.'
          : 'Rival tracking was not configured for this free scan. An empty list does not mean the answer named no alternatives.'}
      </p>
      {candidates.length > 0 && (
        <ul className="mt-3 space-y-2">
          {candidates.map((candidate) => (
            <li key={`${candidate.name}:${candidate.evidence}`} className="border-l-2 border-[var(--border-default)] pl-3">
              <p className="text-sm font-medium text-[var(--text-primary)]">{candidate.name}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-[var(--text-secondary)]">“{candidate.evidence}”</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
