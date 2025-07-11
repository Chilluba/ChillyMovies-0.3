import { NextRequest } from 'next/server';
import ytdl from 'ytdl-core';
import { PassThrough } from 'stream';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    if (!url || !ytdl.validateURL(url)) {
      return new Response(JSON.stringify({ error: 'Invalid YouTube URL' }), { status: 400 });
    }
    const info = await ytdl.getInfo(url);
    const title = info.videoDetails.title.replace(/[^a-zA-Z0-9-_\.]/g, '_');
    const stream = ytdl(url, { quality: 'highest', filter: 'audioandvideo' });
    const pass = new PassThrough();
    stream.pipe(pass);
    return new Response(pass as any, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="${title}.mp4"`,
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), { status: 500 });
  }
}