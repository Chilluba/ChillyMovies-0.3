import { NextRequest, NextResponse } from 'next/server';
import { resume } from '@/lib/aria2';

export async function POST(request: NextRequest) {
  try {
    const { gid } = await request.json();
    if (!gid) {
      return NextResponse.json({ error: 'No gid provided' }, { status: 400 });
    }
    const result = await resume(gid);
    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}