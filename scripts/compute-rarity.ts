// Weekly: player data → content/rarity.json + an editor report (docs/05-teknis.md §10.4).
//
//   MUNCAK_API_URL=https://<domain>/api/v1 MUNCAK_ADMIN_TOKEN=… tsx scripts/compute-rarity.ts
//   tsx scripts/compute-rarity.ts --data rarity-data.json     (offline, from a saved response)
//
// New tiers only reach players from the next schedule onward: the Worker freezes each
// day's tiers on its first request (tier_snapshots).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { RARITY_MIN_ROUNDS } from '../src/game/constants';
import { todayWIB } from '../src/game/date';
import { computeTiers, type TierMap } from '../src/game/rarity';
import { tierName } from '../src/i18n/id';
import type { RarityData } from '../worker/src/admin';
import { loadContent, poolOf, printReport, type RarityFile } from './content';
import { args, env, scriptNow } from './env';

async function fetchData(): Promise<RarityData> {
  const i = args.indexOf('--data');
  if (i >= 0 && args[i + 1]) return JSON.parse(readFileSync(args[i + 1]!, 'utf8')) as RarityData;
  const base = env.MUNCAK_API_URL;
  const token = env.MUNCAK_ADMIN_TOKEN;
  if (!base || !token) {
    console.error(
      'compute-rarity: set MUNCAK_API_URL and MUNCAK_ADMIN_TOKEN, or pass --data <file>',
    );
    process.exit(1);
  }
  const res = await fetch(`${base.replace(/\/$/, '')}/admin/rarity`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    console.error(`compute-rarity: admin endpoint answered ${res.status}`);
    process.exit(1);
  }
  return (await res.json()) as RarityData;
}

const now = scriptNow('compute-rarity');
const { content, report } = loadContent('content');
if (report.errors.length > 0) {
  printReport({ errors: report.errors, warnings: [] });
  console.error('compute-rarity: content has errors, run `npm run validate:content`');
  process.exit(1);
}
const data = await fetchData();

const prompts: Record<string, TierMap> = {};
const lines: string[] = [`# Laporan kelangkaan ${todayWIB(now)}`, ''];
for (const p of [...content.prompts.values()].sort((a, b) => a.id.localeCompare(b.id))) {
  if (poolOf(p) !== 'daily') continue;
  const counts = data.prompts[p.id] ?? { rounds: 0, counts: {} };
  const unknown = data.unknown[p.id] ?? [];
  const suggestions = data.suggestions[p.id] ?? [];
  if (counts.rounds === 0 && unknown.length === 0 && suggestions.length === 0) continue;

  lines.push(`## ${p.id} · ${p.prompt}`, '', `Ronde diterima: ${counts.rounds}`);
  if (counts.rounds >= RARITY_MIN_ROUNDS) {
    // Priors come from the manual tiers in the prompt file, never from older data tiers.
    const tiers = computeTiers(p.answers, counts);
    prompts[p.id] = tiers;
    const changes = p.answers.filter((a) => tiers[a.id] !== a.tier);
    lines.push('', changes.length ? 'Perubahan tingkat:' : 'Tidak ada perubahan tingkat.');
    for (const a of changes) {
      lines.push(
        `- ${a.text}: ${tierName[a.tier]} → ${tierName[tiers[a.id]!]} (${counts.counts[a.id] ?? 0}×)`,
      );
    }
  } else {
    lines.push('', `Data belum cukup (< ${RARITY_MIN_ROUNDS}), tingkat manual tetap dipakai.`);
  }
  if (unknown.length) {
    lines.push('', 'Jawaban tidak dikenal terbanyak (≥ 3 perangkat):');
    for (const u of unknown) lines.push(`- ${u.input} — ${u.count}× dari ${u.devices} perangkat`);
  }
  if (suggestions.length) {
    lines.push('', '**Usulan pemain (prioritas):**');
    for (const s of suggestions) lines.push(`- ${s.input} — ${s.count}×`);
  }
  lines.push('');
}

const rarity: RarityFile = { generatedAt: now.toISOString(), prompts };
writeFileSync(join('content', 'rarity.json'), JSON.stringify(rarity, null, 2) + '\n');
mkdirSync('reports', { recursive: true });
const reportFile = join('reports', `rarity-${todayWIB(now)}.md`);
writeFileSync(reportFile, lines.join('\n'));
console.log(
  `compute-rarity: ${Object.keys(prompts).length} prompts re-tiered → content/rarity.json, report → ${reportFile}`,
);
