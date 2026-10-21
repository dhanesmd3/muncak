# 05 · Teknis

---

## 1. Ringkasan stack

| Lapisan | Pilihan | Alasan |
|---|---|---|
| Bahasa | **TypeScript** (strict) | Aman, modul pencocokan bisa dipakai bareng di frontend & backend |
| UI | **Preact** + Vite | API mirip React tapi jauh lebih kecil, penting untuk HP spek rendah |
| Adegan pixel | **Canvas 2D** biasa + `requestAnimationFrame` | Tidak perlu game engine untuk parallax & sprite sederhana |
| State | `useReducer` + Context | Cukup untuk game sekecil ini, tanpa library tambahan |
| Validasi data | **zod** | Skema konten dicek saat build & di CI |
| PWA | **vite-plugin-pwa** | Bisa di-install ke layar HP dan jalan offline |
| Hosting frontend | **Cloudflare Pages** | Gratis, CDN cepat di Indonesia, ada deploy hook |
| Backend (fase 2) | **Cloudflare Workers + D1** (SQLite) | Satu vendor dengan hosting, free tier cukup untuk awal |
| Test | **Vitest** (unit), **Playwright** (e2e) | |
| CI/CD | **GitHub Actions** | Gratis untuk repo publik, dengan kuota untuk repo privat |

> Alternatif backend: **Supabase** (Postgres + API instan). Pilih salah satu, jangan dua-duanya. Batas free tier tiap layanan bisa berubah, jadi cek halaman harga terbaru sebelum mulai.

---

## 2. Struktur folder

```
muncak/
├── content/
│   ├── prompts/                 # 1 file JSON per soal (sumber, diedit manusia)
│   ├── schedule/2026-11.json    # jadwal harian per bulan
│   ├── packs/                   # definisi paket tema (fase 2)
│   ├── mountains.json           # checkpoint gunung + fakta + sumber
│   └── rarity.json              # hasil hitung kelangkaan (fase 2, digenerate)
├── public/
│   ├── fonts/                   # woff2, di-host sendiri
│   ├── sprites/                 # spritesheet PNG + JSON
│   ├── sfx/
│   └── assets/CREDITS.md
├── src/
│   ├── main.tsx
│   ├── app/                     # layar: Home, Round, Reveal, Result, Stats, Group, Settings, About
│   ├── components/              # tombol, timer bar, ikon tingkat, dll
│   ├── game/
│   │   ├── constants.ts         # SEMUA angka tuning (lihat 02-game-design.md §8)
│   │   ├── types.ts
│   │   ├── normalize.ts
│   │   ├── match.ts
│   │   ├── scoring.ts           # poin, mdpl, checkpoint, gelar
│   │   ├── date.ts              # tanggal WIB, nomor hari, hitung mundur
│   │   ├── daily.ts             # memuat soal harian
│   │   └── reducer.ts           # state machine ronde
│   ├── scene/                   # canvas: parallax, sprite, kamera
│   ├── storage/                 # localStorage + migrasi versi
│   ├── share/                   # teks share, Web Share API, WA fallback
│   ├── api/                     # klien backend (fase 2)
│   ├── styles/tokens.css        # palet & ukuran sebagai CSS custom properties
│   └── i18n/id.ts               # semua teks UI bahasa Indonesia
├── scripts/
│   ├── validate-content.ts
│   ├── build-daily.ts           # content → public/daily/*.json
│   ├── plan-schedule.ts         # bantu susun jadwal bulanan
│   └── compute-rarity.ts        # fase 2
├── worker/                      # Cloudflare Worker (fase 2)
│   ├── src/index.ts
│   └── migrations/*.sql
├── tests/
│   ├── unit/
│   ├── e2e/
│   └── fixtures/                # payload harian palsu untuk test
└── docs/
```

Aturan penting: **`src/game/` tidak boleh import apa pun dari UI atau browser API** (kecuali `date.ts` yang menerima `now` sebagai parameter). Dengan begitu modul ini bisa dipakai ulang oleh Worker dan gampang dites.

---

## 3. Model data

```ts
// src/game/types.ts
export type Tier = 'basecamp' | 'camp' | 'treeline' | 'summit' | 'edelweiss';
export type Category = 'nusantara' | 'global' | 'kuliner' | 'sejarah' | 'alam' | 'pop' | 'bola' | 'sains';

export interface Answer {
  id: string;
  text: string;
  aliases?: string[];
  tier: Tier;
}

export interface Rejected {
  text: string;
  aliases?: string[];
  reason: string;
}

export interface Prompt {
  id: string;
  prompt: string;
  category: Category;
  difficulty: 1 | 2 | 3 | 4 | 5;
  closedSet: boolean;
  optionalPrefixes?: string[];
  answers: Answer[];
  rejected?: Rejected[];
  edelweissFact: string;
  sources: string[];
  status: 'draft' | 'review' | 'verified' | 'retired';
  author: string;
  verifiedBy?: string;
  validAsOf: string; // YYYY-MM-DD
}

/** Payload yang dikirim ke browser untuk satu hari. */
export interface DailyPayload {
  date: string;       // YYYY-MM-DD (WIB)
  dayNumber: number;  // #42
  prompts: Prompt[];  // 7 soal, sudah urut, tier sudah dibekukan untuk hari ini
}

export interface Mountain {
  id: string;
  name: string;       // "Gunung Semeru"
  altitude: number;   // mdpl
  province: string;
  fact: string;       // ≤ 140 karakter
  source: string;
}
```

Skema zod di `scripts/validate-content.ts` mencerminkan tipe di atas, ditambah aturan berikut:
- `status: verified` wajib punya `verifiedBy` dan minimal 1 `sources` yang bukan placeholder `[ISI`.
- Tepat **satu** jawaban dengan `tier: 'edelweiss'`.
- Soal terbuka minimal 50 jawaban, soal tertutup minimal 30 (kalau kurang, keluarkan **peringatan**, bukan error).
- Setelah dinormalisasi, tidak boleh ada kunci yang sama untuk dua jawaban berbeda, atau jawaban yang bertabrakan dengan `rejected`.
- `id` file = nama file.
- Jadwal: tiap tanggal tepat 7 id soal, semuanya berstatus `verified`, dan tidak ada soal yang muncul lagi kurang dari 30 hari sejak terakhir tampil.

---

## 4. Tanggal & reset harian

WIB tidak punya daylight saving, jadi cukup geser +7 jam dari UTC. **Jangan pernah pakai jam lokal perangkat** untuk menentukan tanggal soal.

```ts
// src/game/date.ts
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Tanggal hari ini menurut WIB, format YYYY-MM-DD. */
export function todayWIB(now: Date = new Date()): string {
  return new Date(now.getTime() + WIB_OFFSET_MS).toISOString().slice(0, 10);
}

/** Nomor hari sejak rilis. Hari rilis = 1. */
export function dayNumber(date: string, launchDate: string): number {
  return Math.round((Date.parse(date) - Date.parse(launchDate)) / DAY_MS) + 1;
}

/** Milidetik sampai 00.00 WIB berikutnya. */
export function msUntilNextReset(now: Date = new Date()): number {
  const wib = now.getTime() + WIB_OFFSET_MS;
  const nextMidnightWib = Math.floor(wib / DAY_MS) * DAY_MS + DAY_MS;
  return nextMidnightWib - wib;
}
```

**Jam HP yang dimajukan:** di fase 1 file soal hari depan memang belum dipublikasikan (lihat §9), jadi memajukan jam tidak berguna. Di fase 2, Worker mengirim waktu server lewat header `Date`, dan klien memakainya kalau selisih dengan jam perangkat lebih dari 5 menit.

---

## 5. Pencocokan jawaban

### 5.1 Normalisasi

```ts
// src/game/normalize.ts
export function normalizeBase(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')          // buang diakritik: é → e
    .toLowerCase()
    .replace(/['’`]/g, '')           // buang apostrof: se'i → sei
    .replace(/[^\p{L}\p{N}]+/gu, ' ') // tanda baca & tanda hubung → spasi
    .trim()
    .replace(/\s+/g, ' ');
}

export function normalize(input: string, prefixes: string[] = []): string {
  const s = normalizeBase(input);
  // Prefix terpanjang dicek duluan, misalnya "gunung api" sebelum "gunung".
  const sorted = prefixes.map(normalizeBase).sort((a, b) => b.length - a.length);
  for (const p of sorted) {
    if (s.startsWith(p + ' ')) return s.slice(p.length + 1);
  }
  return s;
}
```

Normalisasi yang **sama persis** diterapkan ke input pemain dan ke semua `text`/`aliases` saat indeks dibangun.

### 5.2 Algoritma

```
1. n = normalize(input, prompt.optionalPrefixes)
2. Kalau n.length < 2               → TOO_SHORT (tanpa potongan waktu)
3. Kalau n sudah pernah dicoba ronde ini → DUPLICATE (tanpa potongan waktu)
4. Cari persis di indeks (Map<kunci, entri>)
     ketemu jawaban  → ACCEPTED
     ketemu rejected → REJECTED (+ alasan)
5. Kalau tidak ketemu, coba toleransi typo:
     batas = 0 kalau panjang n ≤ 4
             1 kalau 5–8
             2 kalau ≥ 9
     hitung jarak Damerau-Levenshtein (OSA) n ke semua kunci
     ambil jarak terkecil d ≤ batas
     kalau kandidat dengan jarak d menunjuk ke >1 entri berbeda → UNKNOWN (ambigu)
     kalau tepat 1 entri → ACCEPTED / REJECTED sesuai entrinya
6. Selain itu → UNKNOWN
```

```ts
// src/game/match.ts (bentuk hasil)
export type MatchResult =
  | { kind: 'accepted'; answerId: string; tier: Tier; fuzzy: boolean }
  | { kind: 'rejected'; reason: string }
  | { kind: 'unknown' }
  | { kind: 'too_short' }
  | { kind: 'duplicate' };
```

- Indeks dibangun sekali per soal saat payload dimuat. Satu soal paling banyak ±1.000 kunci (jawaban + alias), jadi perbandingan linear masih di bawah 5 ms bahkan di HP murah.
- Hentikan perhitungan jarak lebih awal begitu melewati `batas` (early exit) supaya hemat CPU.
- **Wajib ada unit test** untuk: diakritik, apostrof, prefix opsional, alias, typo 1 & 2 huruf, transposisi ("Sulawesi Barta"), kasus ambigu, dan pasangan rawan seperti "Papua Barat" vs "Papua Barat Daya".

---

## 6. Poin, mdpl, checkpoint

```ts
// src/game/constants.ts
export const ROUNDS_PER_DAY = 7;
export const ROUND_SECONDS = 25;
export const WRONG_PENALTY_SECONDS = 2;
export const METERS_PER_POINT = 7;
export const POINTS: Record<Tier, number> = {
  basecamp: 10, camp: 30, treeline: 60, summit: 85, edelweiss: 100,
};
export const EXPEDITION_START_SECONDS = 45;
export const EXPEDITION_BONUS: Record<Tier, number> = {
  basecamp: 5, camp: 7, treeline: 9, summit: 12, edelweiss: 16,
};
export const EXPEDITION_SKIP_PENALTY = 3;
export const RESET_TIMEZONE = 'Asia/Jakarta';
export const GROUP_MAX_MEMBERS = 50;
export const GROUP_MAX_PER_PLAYER = 10;

export const TITLES = [
  { min: 0, title: 'Pendaki Pemula' },
  { min: 1000, title: 'Pendaki Akhir Pekan' },
  { min: 2000, title: 'Anak Gunung' },
  { min: 3000, title: 'Pemburu Puncak' },
  { min: 4000, title: 'Legenda Jalur' },
  { min: 4900, title: 'Penakluk Cartenz' },
] as const;
```

```ts
// src/game/scoring.ts (inti)
export const altitude = (points: number) => points * METERS_PER_POINT;

/** Gunung tertinggi dengan altitude ≤ skor. mountains sudah urut naik. */
export function reachedMountain(alt: number, mountains: Mountain[]): Mountain {
  let best = mountains[0]; // Basecamp, altitude 0
  for (const m of mountains) if (m.altitude <= alt) best = m;
  return best;
}
```

---

## 7. State ronde

Satu ronde diatur oleh state machine sederhana di `reducer.ts`:

```
idle ──start──► playing ──accepted──► reveal ──next──► playing (ronde berikut)
                   │                                    │
                   └──timeout──► reveal(kabut)          └─(ronde 7)─► finished
```

- `startedAt` disimpan dalam epoch ms begitu ronde mulai. Sisa waktu = `ROUND_SECONDS*1000 − (now − startedAt) − penalti`.
- Timer di layar dihitung ulang dari `startedAt` di setiap frame, **bukan** dengan mengurangi counter. Cara ini tahan terhadap tab yang di-background dan `setInterval` yang melambat.
- Tiap perubahan state langsung ditulis ke storage (lihat §8).

---

## 8. Penyimpanan di perangkat

Semua key diberi prefix versi supaya bisa dimigrasi.

| Key | Isi |
|---|---|
| `muncak:v1:device` | `{ id: uuid, createdAt }`, dibuat sekali |
| `muncak:v1:settings` | suara, musik, getar, kurangi animasi, kontras tinggi, sudah onboarding |
| `muncak:v1:daily:<YYYY-MM-DD>` | progres harian: tiap ronde `{ promptId, startedAt, attempts[], result, finishedAt }` |
| `muncak:v1:stats` | dimainkan, streak, streak terbaik, tanggal terakhir selesai, total & tertinggi mdpl, distribusi tingkat, gunung yang pernah dicapai, jumlah edelweiss |
| `muncak:v1:expedition` | rekor Ekspedisi |
| `muncak:v1:packs` | skor terbaik per paket |
| `muncak:v1:groups` | daftar `{ code, name, nickname }` |

- Semua baca/tulis dibungkus `try/catch`. Kalau storage tidak tersedia (mode privat, kuota penuh), game tetap jalan dengan state di memori dan menampilkan peringatan kecil "Progres tidak tersimpan".
- Entri `daily:*` yang umurnya lebih dari 14 hari dihapus saat aplikasi dibuka.
- **Streak:** kalau `lastCompletedDate` = kemarin (WIB), streak +1. Kalau sama dengan hari ini, tidak berubah. Selain itu streak di-reset ke 1.
- Tombol **Hapus data saya** menghapus semua key `muncak:*` dan, di fase 2, memanggil `DELETE /api/v1/me`.

---

## 9. Pipeline konten & deploy (fase 1, tanpa backend)

```
content/prompts/*.json ─┐
content/schedule/*.json ├─► validate-content ─► build-daily ─► public/daily/<tanggal>.json
content/mountains.json ─┘                                   └► vite build ─► Cloudflare Pages
```

- `build-daily.ts` hanya membuat file untuk **hari ini dan besok** (WIB). Cadangan 1 hari ini perlu untuk jaga-jaga deploy telat.
- **Deploy otomatis setiap hari:** GitHub Actions cron jalan pukul **16:45 UTC (23:45 WIB)**, lalu build dan deploy, sehingga file hari berikutnya muncul tepat sebelum tengah malam. Kalau Actions gagal, file "besok" dari deploy kemarin masih ada.
- Payload diberi **obfuscation ringan** (misalnya JSON → di-XOR dengan kunci tetap → base64) supaya jawaban tidak langsung kebaca di tab Network. Ini **bukan keamanan**, cuma supaya tidak kebaca sekilas. Pencocokan yang aman dari curang baru ada di fase 2 (§10.4).
- Klien memuat `/daily/<todayWIB>.json`. Kalau 404 (deploy telat), tampilkan "Soal hari ini sedang disiapkan, coba lagi sebentar" dan coba ulang tiap 60 detik.

```yaml
# .github/workflows/daily-deploy.yml (cuplikan)
on:
  schedule:
    - cron: '45 16 * * *'   # 23:45 WIB
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: lts/* }
      - run: npm ci
      - run: npm run validate:content
      - run: npm test
      - run: npm run build   # termasuk build-daily
      # lalu deploy ke Cloudflare Pages (wrangler pages deploy) dengan secret API token
```

---

## 10. Backend (fase 2)

### 10.1 Identitas tanpa login

- Perangkat membuat `deviceId` (UUID acak) dan menyimpannya di localStorage.
- Klien mengirimnya lewat header `X-Muncak-Device`.
- Server **tidak pernah menyimpan deviceId mentah**:
  - `member_id = HMAC(DEVICE_SECRET, deviceId)` untuk Rombongan & skor (tetap, bisa dihapus)
  - `device_hash = HMAC(salt_harian, deviceId)` untuk log jawaban. `salt_harian` dibuat acak tiap hari dan **dihapus** setelah 2 hari, sehingga log lama tidak bisa dikaitkan ke perangkat mana pun.

### 10.2 Tabel D1

```sql
-- worker/migrations/0001_init.sql
CREATE TABLE answer_logs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  prompt_id   TEXT NOT NULL,
  play_date   TEXT NOT NULL,          -- YYYY-MM-DD WIB
  mode        TEXT NOT NULL,          -- daily | expedition | pack
  input_norm  TEXT NOT NULL,          -- jawaban yang sudah dinormalisasi, maks 60 karakter
  outcome     TEXT NOT NULL,          -- accepted | rejected | unknown
  answer_id   TEXT,                   -- terisi kalau accepted
  device_hash TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_logs_prompt_outcome ON answer_logs (prompt_id, outcome);
CREATE INDEX idx_logs_date ON answer_logs (play_date);

CREATE TABLE daily_salts (
  play_date TEXT PRIMARY KEY,
  salt      TEXT NOT NULL
);

CREATE TABLE groups (
  code           TEXT PRIMARY KEY,    -- MCK-XXXX
  name           TEXT NOT NULL,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  last_active_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE group_members (
  group_code TEXT NOT NULL REFERENCES groups(code) ON DELETE CASCADE,
  member_id  TEXT NOT NULL,
  nickname   TEXT NOT NULL,
  joined_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (group_code, member_id)
);

CREATE TABLE daily_scores (
  member_id TEXT NOT NULL,
  play_date TEXT NOT NULL,
  altitude  INTEGER NOT NULL,
  tiers     TEXT NOT NULL,            -- contoh "basecamp,edelweiss,treeline,summit,camp,fog,summit"
  PRIMARY KEY (member_id, play_date)
);

CREATE TABLE suggestions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  prompt_id  TEXT NOT NULL,
  input_norm TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### 10.3 Endpoint

| Method | Path | Isi | Catatan |
|---|---|---|---|
| GET | `/api/v1/daily` | Payload hari ini | Menggantikan file statis. Soal besok tidak bisa diambil. |
| POST | `/api/v1/plays` | `{ date, mode, rounds: [{ promptId, attempts: [inputRaw] }] }` | Dikirim **sekali** di akhir sesi. Server menormalisasi, mencocokkan ulang, mencatat log, dan menghitung skor. |
| POST | `/api/v1/groups` | `{ name, nickname }` → `{ code }` | |
| POST | `/api/v1/groups/:code/join` | `{ nickname }` | Cek batas anggota |
| GET | `/api/v1/groups/:code?date=` | Klasemen | Skor anggota lain **hanya dikirim kalau peminta sudah punya skor di tanggal itu** |
| DELETE | `/api/v1/groups/:code/me` | Keluar dari Rombongan | |
| POST | `/api/v1/suggestions` | `{ promptId, input }` | Usulan jawaban |
| DELETE | `/api/v1/me` | Hapus semua data member | Log jawaban lama sudah anonim, jadi tidak ikut terhapus (dijelaskan di kebijakan privasi) |

- **Skor Rombongan dihitung di server.** Klien mengirim jawaban mentah, lalu Worker menjalankan modul `src/game/match.ts` + `scoring.ts` yang sama. Klien tidak bisa asal mengirim "4.900 mdpl". Yang tidak bisa diverifikasi server cuma kecepatan menjawab, dan itu bisa diterima untuk game santai.
- Satu `member_id` hanya boleh punya satu `daily_scores` per tanggal. Kiriman kedua ditolak.
- **Pembatasan request:** pakai fitur rate limiting Cloudflare yang tersedia di paket yang dipakai, plus batas sederhana di Worker (misal maksimal 20 `plays` per perangkat per hari).
- Nama Rombongan & nama panggilan: maksimal 20 karakter, disaring dengan daftar kata kasar (`worker/src/badwords.ts`).
- Cron harian Worker (00:00 WIB): buat `salt` baru, hapus salt yang lebih tua dari 2 hari, bekukan snapshot tingkat untuk hari ini, lalu jalankan retensi data sesuai [07-privasi.md](07-privasi.md) §2: Rombongan 90 hari tidak aktif, member & skor 12 bulan, log jawaban 24 bulan (diringkas jadi agregat).

### 10.4 Menghitung kelangkaan

Dijalankan **mingguan** oleh `scripts/compute-rarity.ts` (atau cron Worker), hasilnya ditulis ke `content/rarity.json`.

Untuk tiap soal `p`, hanya pakai log `mode = 'daily'` dan `outcome = 'accepted'`:

```
N        = jumlah ronde yang diterima untuk soal p
count_a  = berapa kali jawaban a menjadi jawaban yang diterima

Kalau N < 200 → tetap pakai tingkat manual (data belum cukup).

prior_a  = nilai tengah tingkat manual a:
           basecamp 0.15 · camp 0.06 · treeline 0.02 · summit 0.005
k        = 50   (bobot prior; makin kecil makin cepat percaya data)

share_a  = (count_a + k × prior_a) / (N + k)

tingkat baru:
  share_a ≥ 0.10          → basecamp
  0.03 ≤ share_a < 0.10   → camp
  0.01 ≤ share_a < 0.03   → treeline
  share_a < 0.01          → summit
  Edelweiss tidak pernah berubah (tetap pilihan editor)
```

- Ambang & `k` ditaruh di konstanta dan disetel setelah ada data nyata.
- Tingkat baru berlaku mulai **jadwal berikutnya** (dibekukan per hari).
- Simpan riwayat `rarity.json` di git supaya perubahannya bisa dilacak.
- Laporan mingguan juga mengeluarkan **20 jawaban `unknown` terbanyak per soal** untuk antrean tinjauan editor (lihat [03-konten-soal.md](03-konten-soal.md) §7).

---

## 11. PWA & performa

| Target | Nilai |
|---|---|
| JS awal (gzip) | ≤ 120 KB |
| Total aset gambar | ≤ 300 KB |
| Font (woff2, subset Latin) | ≤ 60 KB total |
| LCP di HP murah + 4G lambat | < 2,5 dtk |
| Main ulang saat offline | Paket Tema yang sudah pernah diunduh & layar statistik |

- **Service worker:** precache shell aplikasi, font, sprite, SFX. File `daily/*.json` dan API pakai strategi *network-first*.
- Uji di Chrome DevTools dengan throttling "Slow 4G" + CPU 4× slowdown, plus satu HP Android murah beneran kalau ada.
- `manifest.webmanifest`: nama, ikon, `display: standalone`, `orientation: portrait`, `theme_color` Malam `#1B1F3B`.

---

## 12. Analitik & pemantauan

- **Analitik halaman:** Cloudflare Web Analytics (tanpa cookie).
- **Event game (fase 2):** endpoint sendiri yang cuma menyimpan **hitungan agregat** per hari: sesi dimulai, sesi selesai, tombol share ditekan, Rombongan dibuat. Tanpa ID perangkat.
- **Error:** log di Worker + `window.onerror` yang dikirim ke endpoint sendiri (pesan error & versi aplikasi saja). Kalau nanti pakai layanan pihak ketiga seperti Sentry, perbarui [07-privasi.md](07-privasi.md).

---

## 13. Pengujian

| Jenis | Cakupan | Kapan jalan |
|---|---|---|
| Unit (Vitest) | `normalize`, `match`, `scoring`, `date`, reducer, streak | Tiap push |
| Validasi konten | Seluruh `content/` | Tiap push + sebelum deploy harian |
| E2E (Playwright) | Main 1 hari penuh dengan payload fixture: jawab benar, salah, waktu habis, refresh di tengah ronde, share | Tiap PR |
| Manual | Checklist rilis di [06-roadmap.md](06-roadmap.md) | Sebelum rilis |

Kasus uji tanggal yang wajib ada: 23:59:59 WIB vs 00:00:00 WIB, perangkat dengan zona waktu selain WIB (misal `America/New_York`), dan pergantian tahun.

---

## 14. Variabel lingkungan

| Nama | Di mana | Contoh |
|---|---|---|
| `VITE_LAUNCH_DATE` | Frontend | `2026-12-01` |
| `VITE_API_BASE` | Frontend (fase 2) | `/api/v1` |
| `VITE_PAYLOAD_KEY` | Frontend | kunci obfuscation ringan |
| `DEVICE_SECRET` | Worker secret | string acak 32 byte |
| `CLOUDFLARE_API_TOKEN` | GitHub Actions secret | untuk deploy |

Jangan pernah commit secret. Simpan contoh nilainya di `.env.example`.
