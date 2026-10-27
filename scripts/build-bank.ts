// Bank prompts → public/bank/expedition.json and public/packs/ (Ekspedisi & Paket Tema).
// Only prompts with pool "bank" are published, never daily prompts, so playing these modes
// can never reveal a future Muncak Harian (docs/03-konten-soal.md §10).
//
//   tsx scripts/build-bank.ts             real content (used by `npm run build`)
//   tsx scripts/build-bank.ts --fixture   fake prompts from tests/fixtures (local play only)
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { encodePayload } from '../src/game/payload';
import type { BankPayload, PackInfo, PackPayload, Prompt } from '../src/game/types';
import { bankPrompts, byDifficulty, loadContent, printReport } from './content';
import { fixturePrompts, payloadKey, useFixture } from './env';

for (const dir of ['bank', 'packs']) {
  rmSync(join('public', dir), { recursive: true, force: true });
  mkdirSync(join('public', dir), { recursive: true });
}

let bank: Prompt[];
let packs: PackPayload[];
if (useFixture) {
  console.warn('build-bank: using FIXTURE prompts (not real content). Do not deploy this.');
  bank = fixturePrompts().map((p) => ({ ...p, pool: 'bank' as const }));
  packs = [
    {
      id: 'contoh',
      title: 'Paket Contoh',
      description: 'Paket latihan dari soal palsu untuk main di lokal.',
      prompts: byDifficulty(bank),
    },
  ];
} else {
  const { content, report } = loadContent('content');
  if (report.errors.length > 0) {
    printReport({ errors: report.errors, warnings: [] });
    console.error('build-bank: content has errors, run `npm run validate:content`');
    process.exit(1);
  }
  bank = bankPrompts(content);
  packs = content.packs.map((pack) => ({
    id: pack.id,
    title: pack.title,
    description: pack.description,
    ...(pack.season ? { season: pack.season } : {}),
    prompts: byDifficulty(pack.prompts.map((id) => content.prompts.get(id)!)),
  }));
}

const expedition: BankPayload = { prompts: bank };
writeFileSync(join('public', 'bank', 'expedition.json'), encodePayload(expedition, payloadKey));
const index: PackInfo[] = packs.map(({ id, title, description, season }) => ({
  id,
  title,
  description,
  ...(season ? { season } : {}),
}));
writeFileSync(join('public', 'packs', 'index.json'), JSON.stringify(index));
for (const pack of packs) {
  writeFileSync(join('public', 'packs', `${pack.id}.json`), encodePayload(pack, payloadKey));
}
console.log(`build-bank: ${bank.length} Ekspedisi prompts, ${packs.length} packs`);
