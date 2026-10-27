// Static files for Ekspedisi and Paket Tema, built by scripts/build-bank.ts.
import { isPrompt } from '../game/daily';
import { DEFAULT_PAYLOAD_KEY, decodePayload } from '../game/payload';
import type { BankPayload, PackInfo, PackPayload } from '../game/types';

const KEY = import.meta.env.VITE_PAYLOAD_KEY || DEFAULT_PAYLOAD_KEY;
const url = (path: string) => `${import.meta.env.BASE_URL}${path}`;

async function text(path: string): Promise<string> {
  const res = await fetch(url(path), { cache: 'no-cache' });
  const isHtml = (res.headers.get('content-type') ?? '').includes('text/html');
  if (!res.ok || isHtml) throw new Error(`${path}: ${res.status}`);
  return res.text();
}

export async function loadBank(): Promise<BankPayload> {
  const v = decodePayload(await text('bank/expedition.json'), KEY) as BankPayload;
  if (!v || !Array.isArray(v.prompts) || !v.prompts.every(isPrompt)) {
    throw new Error('Invalid bank');
  }
  return v;
}

export async function loadPackIndex(): Promise<PackInfo[]> {
  const v = JSON.parse(await text('packs/index.json')) as unknown;
  if (!Array.isArray(v)) throw new Error('Invalid pack index');
  return v.filter(
    (p): p is PackInfo =>
      !!p &&
      typeof p.id === 'string' &&
      typeof p.title === 'string' &&
      typeof p.description === 'string',
  );
}

export async function loadPack(id: string): Promise<PackPayload> {
  const v = decodePayload(await text(`packs/${encodeURIComponent(id)}.json`), KEY) as PackPayload;
  if (!v || v.id !== id || !Array.isArray(v.prompts) || !v.prompts.every(isPrompt)) {
    throw new Error('Invalid pack');
  }
  return v;
}
