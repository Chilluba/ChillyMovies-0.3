import { NextRequest, NextResponse } from 'next/server';
import { tellActive, tellWaiting, tellStopped } from '@/lib/aria2';

export async function GET(_request: NextRequest) {
  try {
    const active = await tellActive();
    const waiting = await tellWaiting();
    const stopped = await tellStopped();
    return NextResponse.json({ active, waiting, stopped });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}