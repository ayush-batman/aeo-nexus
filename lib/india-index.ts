import { fetchQuery } from 'convex/nextjs';
import type { FunctionReturnType } from 'convex/server';
import { api } from '../convex/_generated/api';
export type IndiaCategory = 'SaaS' | 'D2C' | 'Fintech' | 'EdTech' | 'Consumer';

export interface IndiaBrandEntry {
    rank: number;
    brand: string;
    category: IndiaCategory;
    website: string | null;
    mentionRatePct: number;   // 0–100: fraction of scans where the brand was named
    avgPosition: number | null; // 1 = first named; null if never mentioned
    scanCount: number;
    verdict: 'dominant' | 'strong' | 'contested' | 'invisible';
    sentiment: 'positive' | 'neutral' | 'negative' | null;
    intervalLower: number;
    intervalUpper: number;
}

export interface IndiaEdition {
    slug: string;               // '2026-07'
    label: string;              // 'July 2026'
    publishedAt: string;        // ISO
    isPreview: boolean;
    brandCount: number;
    categoriesTracked: IndiaCategory[];
    entries: IndiaBrandEntry[];
}


export function currentIndexEdition() { return new Date().toISOString().slice(0,7); }
export async function loadCurrentEdition(): Promise<IndiaEdition> {
  const slug = currentIndexEdition();
  const published: FunctionReturnType<typeof api.indiaIndex.entries>['page'] = [];
  let cursor: string | null = null;
  do {
    const page: FunctionReturnType<typeof api.indiaIndex.entries> = await fetchQuery(api.indiaIndex.entries, { edition:slug, paginationOpts:{numItems:100,cursor} });
    published.push(...page.page); cursor=page.isDone?null:page.continueCursor;
  } while(cursor);
  const entries: IndiaBrandEntry[] = published.sort((a,b)=>b.mentionRatePct-a.mentionRatePct).map((row,index)=>({
    ...row, rank:index+1, verdict:row.mentionRatePct===0?'invisible':row.mentionRatePct>=90 && (row.avgPosition??99)<=2?'dominant':row.mentionRatePct>=60?'strong':'contested',
  }));
  return { slug,label:new Date(slug+'-01T00:00:00Z').toLocaleDateString('en-US',{month:'long',year:'numeric',timeZone:'UTC'}),
    publishedAt:new Date(published.length?Math.max(...published.map(row=>row.publishedAt)):Date.parse(slug+'-01T00:00:00Z')).toISOString(),
    isPreview:true,brandCount:entries.length,categoriesTracked:[...new Set(entries.map(row=>row.category))],entries };
}
