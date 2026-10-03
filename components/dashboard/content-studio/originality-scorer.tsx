"use client";
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { OriginalityResult } from '@/lib/ai/originality-scorer';

export function OriginalityScorer() {
    const [content, setContent] = useState('');
    const [topic, setTopic] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<OriginalityResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    async function review() {
        setLoading(true); setError(null); setResult(null);
        try {
            const response = await fetch('/api/content/originality', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content, topic }) });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Review failed. Please retry.');
            if (data.evidenceStatus !== 'subjective_ai_review') throw new Error('The review could not be verified. Please retry.');
            setResult(data);
        } catch (error) { setError(error instanceof Error ? error.message : 'Review unavailable. Please retry.'); }
        finally { setLoading(false); }
    }
    return <div className="space-y-6">
        <Card><CardHeader><CardTitle>Editorial review</CardTitle><CardDescription>
            AI feedback on your draft—not a plagiarism check, comparison with search results, or proof of originality.
            Scores are subjective suggestions, separate from Aelo’s measured visibility.
        </CardDescription></CardHeader><CardContent className="space-y-4">
            <label htmlFor="review-topic" className="block text-sm">Topic or buyer question</label>
            <input id="review-topic" maxLength={1000} value={topic} onChange={e => setTopic(e.target.value)}
                className="w-full min-h-11 rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] px-3" />
            <label htmlFor="review-content" className="block text-sm">Draft content</label>
            <textarea id="review-content" maxLength={50000} value={content} onChange={e => setContent(e.target.value)}
                className="w-full h-48 rounded-lg border border-[var(--border-default)] bg-[var(--bg-base)] p-3" />
            <p className="text-xs text-[var(--text-secondary)]">Up to the first 12,000 characters are reviewed. No outside sources are checked.</p>
            <Button onClick={review} disabled={loading || !content.trim()} className="min-h-11">{loading ? 'Reviewing…' : 'Review draft'}</Button>
            {error && <p role="alert" className="text-[var(--data-red)]">{error}</p>}
            {loading && <p role="status">Waiting for the AI review…</p>}
        </CardContent></Card>
        {result && <Card><CardHeader><CardTitle>Subjective AI feedback</CardTitle><CardDescription>
            Reviewed {result.reviewedCharacters.toLocaleString()} of {result.totalCharacters.toLocaleString()} characters.
        </CardDescription></CardHeader><CardContent className="space-y-4">
            <p>{result.verdict}</p>
            <p>Editorial score: {result.score}/100 · Estimated information gain: {result.informationGain}/100</p>
            <p className="text-sm text-[var(--text-secondary)]">These are model opinions, not verified measurements. A high score does not establish originality or predict AI mentions.</p>
            <h3 className="font-medium">Suggested evidence to add</h3>
            {result.uniqueAngles.length ? <ul className="list-disc pl-5">{result.uniqueAngles.map((s, i) => <li key={i}>{s}</li>)}</ul> : <p>No suggestions returned.</p>}
            <h3 className="font-medium">Phrases to reconsider</h3>
            {result.genericPhrases.length ? <ul className="list-disc pl-5">{result.genericPhrases.map((s, i) => <li key={i}>{s}</li>)}</ul> : <p>No matching phrases flagged. This does not prove originality.</p>}
        </CardContent></Card>}
    </div>;
}
