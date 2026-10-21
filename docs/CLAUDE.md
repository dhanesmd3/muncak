# CLAUDE.md

Instruksi untuk AI coding assistant yang bekerja di repo ini.

## Proyek

Muncak adalah game trivia harian berbahasa Indonesia bergaya pixel art. Pemain menjawab 7 soal "Sebutkan ___", jawaban yang lebih langka dapat poin lebih tinggi, dan poin dikonversi jadi ketinggian (mdpl) pendakian gunung Indonesia.

**Baca dulu sebelum mengubah apa pun:**
- Aturan main & angka → `docs/02-game-design.md`
- Format konten → `docs/03-konten-soal.md`
- Arsitektur, algoritma, model data → `docs/05-teknis.md`
- Batasan data pemain → `docs/07-privasi.md`

Kalau permintaan bertentangan dengan dokumen-dokumen itu, tanyakan dulu. Jangan diam-diam menyimpang.

## Stack

TypeScript (strict) · Preact + Vite · Canvas 2D · zod · vite-plugin-pwa · Vitest · Playwright · Cloudflare Pages · (fase 2) Cloudflare Workers + D1

Jangan menambah dependensi baru tanpa alasan kuat. Ukuran bundle adalah fitur (target JS awal ≤ 120 KB gzip).

## Perintah

```bash
npm run dev               # server lokal
npm run test              # Vitest
npm run test:e2e          # Playwright
npm run lint              # ESLint + Prettier check
npm run typecheck         # tsc --noEmit
npm run validate:content  # validasi semua file di content/
npm run build             # build-daily + vite build
```

Sebelum menyatakan pekerjaan selesai: `lint`, `typecheck`, `test`, dan (kalau menyentuh content/) `validate:content` harus lulus.

## Konvensi

- **Kode, nama variabel, key JSON:** bahasa Inggris.
- **Semua teks yang tampil ke pemain:** bahasa Indonesia, disimpan di `src/i18n/id.ts`, tidak di-hardcode di komponen. Sapaan pakai "kamu".
- **Tingkat jawaban (ID kode):** `basecamp`, `camp`, `treeline`, `summit`, `edelweiss`. Kabut (waktu habis) = `fog`.
- **Angka tuning** hanya ada di `src/game/constants.ts`. Kalau ada yang diubah, perbarui juga tabel di `docs/02-game-design.md` §8.
- `src/game/` adalah logika murni: tidak boleh import Preact, DOM, `window`, atau `localStorage`. Fungsi yang butuh waktu menerima `now` sebagai parameter.
- Komponen fungsional + hooks. State game lewat `useReducer` di `src/game/reducer.ts`.

## Aturan domain yang sering salah

1. **Tanggal soal selalu WIB** (UTC+7), dihitung dengan `todayWIB()` di `src/game/date.ts`. Jangan pakai `new Date().getDate()` atau jam lokal perangkat.
2. **Timer dihitung dari `startedAt`** yang disimpan, bukan counter yang dikurangi tiap detik.
3. **Normalisasi harus identik** untuk input pemain dan untuk jawaban/alias. Selalu pakai `normalize()` dari `src/game/normalize.ts`.
4. **Pencocokan:** cocokkan persis dulu, baru toleransi typo. Kalau typo cocok ke dua entri berbeda dengan jarak yang sama, hasilnya `unknown`.
5. **Tingkat dibekukan per hari.** Jangan menghitung ulang tingkat di klien.
6. **Akses `localStorage` selalu dalam `try/catch`.** Game harus tetap bisa dimainkan tanpa storage.
7. **Jangan pernah mengirim atau me-log `deviceId` mentah** ke server atau console di produksi.

## Pixel art

- Canvas adegan 180×120 px logis, diperbesar dengan kelipatan **bulat** saja.
- `image-rendering: pixelated` di canvas dan semua `<img>` sprite. `imageSmoothingEnabled = false` di context 2D.
- Warna hanya dari palet "Kabut Pagi" di `docs/04-art-ui.md` §3 (didefinisikan sebagai CSS custom properties di `src/styles/tokens.css`).
- Hormati `prefers-reduced-motion`.

## Test

- Setiap perubahan di `normalize.ts`, `match.ts`, `scoring.ts`, `date.ts` wajib disertai unit test.
- Kasus tanggal wajib: 23:59:59 vs 00:00:00 WIB, zona waktu non-WIB, pergantian tahun.
- E2E memakai payload fixture di `tests/fixtures/`, jangan memakai konten asli.

## Konten

- Jangan mengubah file di `content/prompts/` kecuali diminta.
- Jangan pernah mengubah `status` soal menjadi `verified`. Itu keputusan manusia.
- Kalau diminta membuat draf soal: status `draft`, tandai jawaban yang kurang yakin, dan isi `sources` dengan referensi nyata (bukan karangan).

## Git

- Commit kecil dengan pesan bahasa Inggris berformat Conventional Commits (`feat:`, `fix:`, `content:`, `docs:`, `chore:`).
- Jangan commit secret atau `.env`.
