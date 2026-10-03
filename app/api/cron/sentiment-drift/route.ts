import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { internal } from '@/convex/_generated/api';
import { callInternal } from '@/lib/convex/admin';
export async function GET(request: Request) {
  const secret=process.env.CRON_SECRET;
  if(!secret)return NextResponse.json({error:'cron_not_configured'},{status:503});
  const expected=Buffer.from(`Bearer ${secret}`),received=Buffer.from(request.headers.get('authorization')||'');
  if(expected.length!==received.length || !timingSafeEqual(expected,received))return NextResponse.json({error:'Unauthorized'},{status:401});
  try{
    const queued=await callInternal('mutation',internal.weekly.dispatch,{kind:'sentiment_drift'});
    return NextResponse.json({success:true,queued,message:'Preparation queued; email delivery is tracked separately.'},{status:202});
  }catch{return NextResponse.json({error:'Weekly dispatcher unavailable'},{status:503});}
}
