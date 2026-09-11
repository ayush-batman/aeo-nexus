import { NextRequest, NextResponse } from 'next/server';
import { fetchQuery } from 'convex/nextjs';
import type { FunctionReturnType } from 'convex/server';
import { api } from '@/convex/_generated/api';
import { currentIndexEdition } from '@/lib/india-index';
import { convexRouteError } from '@/lib/convex/http';
export async function GET(request: NextRequest) {
  const brand=request.nextUrl.searchParams.get('brand');
  const edition=request.nextUrl.searchParams.get('edition') || currentIndexEdition();
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(edition)) return NextResponse.json({error:'invalid edition'},{status:400});
  if(!brand || brand.length>200) return NextResponse.json({error:'unknown brand'},{status:404});
  try {
    const scans: FunctionReturnType<typeof api.indiaIndex.receipts>['scans'] = [];
    let offset: number|null=0;
    do {
      const page: FunctionReturnType<typeof api.indiaIndex.receipts> = await fetchQuery(api.indiaIndex.receipts,{edition,brand,offset});
      scans.push(...page.scans); offset=page.nextOffset;
    } while(offset!==null);
    return NextResponse.json({brand,scans});
  } catch(error) {return convexRouteError(error);}
}
