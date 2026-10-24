// Light obfuscation for the daily payload: JSON → UTF-8 → XOR with a fixed key → base64.
// This is NOT security. It only keeps answers from being readable at a glance in the
// Network tab (docs/05-teknis.md §9).

export const DEFAULT_PAYLOAD_KEY = 'muncak';

export interface PayloadFile {
  v: 1;
  data: string;
}

function xor(bytes: Uint8Array, key: string): Uint8Array {
  const k = new TextEncoder().encode(key || DEFAULT_PAYLOAD_KEY);
  const out = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) out[i] = bytes[i]! ^ k[i % k.length]!;
  return out;
}

function toBase64(bytes: Uint8Array): string {
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

function fromBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function encodePayload(value: unknown, key: string): string {
  const bytes = xor(new TextEncoder().encode(JSON.stringify(value)), key);
  const file: PayloadFile = { v: 1, data: toBase64(bytes) };
  return JSON.stringify(file);
}

/** Decode a payload file. Throws on malformed input. */
export function decodePayload(text: string, key: string): unknown {
  const file = JSON.parse(text) as Partial<PayloadFile>;
  if (file.v !== 1 || typeof file.data !== 'string') throw new Error('Unknown payload format');
  return JSON.parse(new TextDecoder().decode(xor(fromBase64(file.data), key)));
}
