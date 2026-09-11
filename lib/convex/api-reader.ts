import 'server-only';
import type { FunctionReturnType } from 'convex/server';
import { internal } from '@/convex/_generated/api';
import type { ApiKeyContext } from '@/lib/api-auth';
import type { LLMScan } from '@/lib/types';
import { callInternal } from './admin';
import { legacyScan } from './records';

export function apiReader(context: ApiKeyContext) {
  return {
    workspace: () => callInternal('query', internal.apiReads.workspace, { keyId: context.keyId }),
    scans: async (opts: { since?: number; before?: number; prompt?: string } = {}): Promise<LLMScan[]> => {
      const rows: LLMScan[] = [];
      let cursor: string | null = null;
      do {
        const page: FunctionReturnType<typeof internal.apiReads.scans> = await callInternal('query', internal.apiReads.scans, {
          keyId: context.keyId, since: opts.since, before: opts.before, paginationOpts: { numItems: 100, cursor },
        });
        rows.push(...page.page.filter((row) => !opts.prompt || row.prompt === opts.prompt).map((row) => legacyScan(row, context.workspaceId)));
        cursor = page.isDone ? null : page.continueCursor;
      } while (cursor);
      return rows;
    },
    prompts: async () => {
      const rows: FunctionReturnType<typeof internal.apiReads.prompts>['page'] = [];
      let cursor: string | null = null;
      do {
        const page: FunctionReturnType<typeof internal.apiReads.prompts> = await callInternal('query', internal.apiReads.prompts, {
          keyId: context.keyId, paginationOpts: { numItems: 100, cursor },
        });
        rows.push(...page.page);
        cursor = page.isDone ? null : page.continueCursor;
      } while (cursor);
      return rows;
    },
    accuracy: async (since: number) => (await callInternal('query', internal.apiReads.accuracy, { keyId: context.keyId, since }))
      .map((row) => ({ claim_text: row.claimText, verdict: row.verdict, confidence: row.confidence,
        evidence_url: row.evidenceUrl, evidence_snippet: row.evidenceSnippet, reasoning: row.reasoning,
        created_at: new Date(row.createdAt).toISOString() })),
  };
}
export type ApiReader = ReturnType<typeof apiReader>;
