export function normalizeBase(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/\p{M}/gu, '') // strip diacritics: é → e
    .toLowerCase()
    .replace(/['’`]/g, '') // strip apostrophes: se'i → sei
    .replace(/[^\p{L}\p{N}]+/gu, ' ') // punctuation & hyphens → space
    .trim()
    .replace(/\s+/g, ' ');
}

export function normalize(input: string, prefixes: readonly string[] = []): string {
  const s = normalizeBase(input);
  // Longest prefix first, e.g. "gunung api" before "gunung".
  const sorted = prefixes.map(normalizeBase).sort((a, b) => b.length - a.length);
  for (const p of sorted) {
    if (p && s.startsWith(p + ' ')) return s.slice(p.length + 1);
  }
  return s;
}
