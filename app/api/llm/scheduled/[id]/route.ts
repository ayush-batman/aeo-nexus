import { NextRequest, NextResponse } from 'next/server';
import { PATCH as update, DELETE as remove } from '../../schedules/[id]/route';
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const response = await update(request, context);
  if (!response.ok) return response;
  return NextResponse.json({ schedule: await response.json() });
}
export const DELETE = remove;
