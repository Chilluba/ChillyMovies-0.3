// src/app/api/aria2/add/route.ts
// This API route is removed as Aria2 integration is being stripped for the UI template.
import { NextRequest, NextResponse } from 'next/server';
import { addUri } from '@/lib/aria2';

export async function POST(request: NextRequest) {
  try {
    const { uri, options } = await request.json();
    if (!uri) {
      return NextResponse.json({ error: 'No URI provided' }, { status: 400 });
    }
    const result = await addUri([uri], options || {});
    return NextResponse.json({ result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
