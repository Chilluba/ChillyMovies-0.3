import Aria2 from 'aria2';

const ARIA2_HOST = process.env.ARIA2_HOST || 'localhost';
const ARIA2_PORT = process.env.ARIA2_PORT || 6800;
const ARIA2_SECRET = process.env.ARIA2_SECRET || '';
const ARIA2_SECURE = process.env.ARIA2_SECURE === 'true';

const aria2 = new Aria2({
  host: ARIA2_HOST,
  port: ARIA2_PORT,
  secure: ARIA2_SECURE,
  secret: ARIA2_SECRET,
  path: '/jsonrpc',
});

export async function openAria2() {
  if (!aria2.opened) {
    await aria2.open();
  }
}

export async function addUri(uris: string[], options: any = {}) {
  await openAria2();
  return aria2.call('addUri', uris, options);
}

export async function tellActive() {
  await openAria2();
  return aria2.call('tellActive');
}

export async function tellWaiting(offset = 0, num = 1000) {
  await openAria2();
  return aria2.call('tellWaiting', offset, num);
}

export async function tellStopped(offset = 0, num = 1000) {
  await openAria2();
  return aria2.call('tellStopped', offset, num);
}

export async function tellStatus(gid: string) {
  await openAria2();
  return aria2.call('tellStatus', gid);
}

export async function pause(gid: string) {
  await openAria2();
  return aria2.call('pause', gid);
}

export async function resume(gid: string) {
  await openAria2();
  return aria2.call('unpause', gid);
}

export async function remove(gid: string) {
  await openAria2();
  return aria2.call('remove', gid);
}

// @ts-ignore
// eslint-disable-next-line
declare module 'aria2';