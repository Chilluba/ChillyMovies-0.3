import { NextRequest } from 'next/server';
import ytdl from 'ytdl-core';
import { PassThrough } from 'stream';
import { spawn } from 'child_process';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { url, quality, audioOnly } = await request.json();
    if (!url || !ytdl.validateURL(url)) {
      return new Response(JSON.stringify({ error: 'Invalid YouTube URL' }), { status: 400 });
    }
    const info = await ytdl.getInfo(url);
    const title = info.videoDetails.title.replace(/[^a-zA-Z0-9-_\.]/g, '_');
    let stream;
    let contentType = 'video/mp4';
    let filename = `${title}.mp4`;
    if (audioOnly) {
      // Pipe through ffmpeg to convert to mp3
      contentType = 'audio/mpeg';
      filename = `${title}.mp3`;
      // Find best audio format
      const audioFormat = ytdl.chooseFormat(info.formats, { quality: 'highestaudio' });
      const ytdlStream = ytdl(url, { format: audioFormat });
      const ffmpeg = spawn('ffmpeg', [
        '-i', 'pipe:0',
        '-f', 'mp3',
        '-ab', '192000',
        '-vn',
        'pipe:1',
      ]);
      ytdlStream.pipe(ffmpeg.stdin);
      stream = ffmpeg.stdout;
    } else {
      // Find the format matching the requested quality
      let itag;
      if (quality === '360p') itag = 18;
      else if (quality === '720p') itag = 22;
      else if (quality === '1080p') itag = 137; // Note: 137 is video-only, 22 is 720p+audio
      // If 1080p, fallback to best if not available
      let format = ytdl.chooseFormat(info.formats, { quality: itag ? String(itag) : 'highest', filter: 'audioandvideo' });
      if (!format || !format.url) {
        format = ytdl.chooseFormat(info.formats, { quality: 'highest', filter: 'audioandvideo' });
      }
      stream = ytdl(url, { format });
    }
    const pass = new PassThrough();
    stream.pipe(pass);
    return new Response(pass as any, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), { status: 500 });
  }
}