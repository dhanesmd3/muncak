# Muncak 🏔️

> **Makin langka, makin tinggi.**

Muncak adalah game tebak-tebakan harian berbahasa Indonesia dengan gaya pixel art. Tiap hari ada 7 soal "Sebutkan ___". Makin jarang jawaban lu dipilih pemain lain, makin tinggi lu mendaki. Skor dihitung dalam **mdpl**, dan puncak tertingginya adalah **Puncak Jaya (Cartenz), 4.884 mdpl**.

Gampangnya: **Family 100 kebalikan, sambil naik gunung.**

- Gratis, tanpa iklan, tanpa akun, tanpa install
- Soal campuran: Nusantara + global
- Main bareng grup WhatsApp lewat mode **Rombongan**
- Ringan, bisa jalan di HP spek rendah dan sinyal pas-pasan (PWA)

> ⚠️ "Muncak" masih nama kerja. Nama final, domain, dan email kontak ditandai `[ISI]` di seluruh dokumen.

---

## Status

| Fase | Isi | Status |
|---|---|---|
| 0 | Uji konten (30 soal, playtest manual) | ⏳ Belum mulai |
| 1 | Versi pertama: Muncak Harian, share hasil, statistik | ⏳ |
| 2 | Kelangkaan berbasis data, Ekspedisi, Paket Tema, Rombongan | ⏳ |
| 3 | Komunitas, Mode Kelas, PWA penuh | ⏳ |

Detailnya ada di [docs/06-roadmap.md](docs/06-roadmap.md).

---

## Menjalankan di lokal

Stack lengkapnya ada di [docs/05-teknis.md](docs/05-teknis.md).

Prasyarat: Node.js versi LTS terbaru dan npm.

```bash
npm install
cp .env.example .env     # isi VITE_LAUNCH_DATE dan VITE_PAYLOAD_KEY
npm run dev:fixture      # main di lokal dengan 7 soal palsu dari tests/fixtures/
npm run dev              # server lokal dengan jadwal asli (butuh soal verified)
npm run test             # unit test (matching, scoring, tanggal, reducer, konten)
npm run test:e2e         # Playwright (sekali saja: npx playwright install chromium)
npm run lint             # ESLint + Prettier
npm run typecheck        # tsc
npm run validate:content # cek semua file soal sesuai skema
npm run plan:schedule -- 2026-12          # usulan jadwal sebulan dari soal verified
npm run build            # build-daily + build produksi ke dist/
```

`npm run dev:fixture` menulis payload palsu ke `public/daily/` (folder hasil generate, tidak di-commit). Jangan deploy hasilnya; `npm run build` selalu membersihkan folder itu dulu.

---

## Dokumentasi

| File | Isi |
|---|---|
| [docs/01-konsep.md](docs/01-konsep.md) | Kenapa game ini ada: kalimat inti, USP, target pemain |
| [docs/02-game-design.md](docs/02-game-design.md) | Aturan main, poin, mdpl, checkpoint, mode, format share |
| [docs/03-konten-soal.md](docs/03-konten-soal.md) | Cara bikin soal, format JSON, alias, jawaban ditolak, cek fakta |
| [docs/04-art-ui.md](docs/04-art-ui.md) | Palet, font, sprite, daftar aset, sketsa layar |
| [docs/05-teknis.md](docs/05-teknis.md) | Stack, struktur kode, model data, algoritma, backend |
| [docs/06-roadmap.md](docs/06-roadmap.md) | Tahapan, checklist rilis, metrik, rencana promosi |
| [docs/07-privasi.md](docs/07-privasi.md) | Data yang dicatat, retensi, UU PDP, draf Kebijakan Privasi |
| [CLAUDE.md](CLAUDE.md) | Instruksi untuk AI coding assistant |

---

## Struktur repo

```
muncak/
├── README.md
├── CLAUDE.md
├── docs/            # semua dokumen desain
├── content/         # soal, jadwal harian, data kelangkaan
├── public/          # sprite, font, ikon PWA
├── src/             # kode aplikasi
├── scripts/         # validasi konten, generate jadwal, hitung kelangkaan
├── worker/          # backend (fase 2)
└── tests/
```

---

## Lisensi

`[ISI]`. Saran awal:

- **Kode:** MIT
- **Konten soal & aset gambar:** hak cipta dilindungi (all rights reserved) atau CC BY-NC 4.0, supaya bank soal tidak bisa dicomot untuk kepentingan komersial
- **Font pihak ketiga:** SIL Open Font License, wajib cantumkan kredit (lihat [docs/04-art-ui.md](docs/04-art-ui.md))

## Kredit

Terinspirasi dari mekanik "jawaban langka" pada game trivia harian seperti Krillion. Muncak tidak berafiliasi dengan Krillion dan tidak memakai nama, aset, maupun konten mereka.
