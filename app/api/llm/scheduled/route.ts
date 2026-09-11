import { NextRequest, NextResponse } from 'next/server';
import { GET as list, POST as create } from '../schedules/route';
export async function GET() {
  const response = await list();
  if (!response.ok) return response;
  return NextResponse.json({ schedules: await response.json() });
}
export async function POST(request: NextRequest) {
  const response = await create(request);
  if (!response.ok) return response;
  return NextResponse.json({ schedule: await response.json() }, { status: 201 });
}
