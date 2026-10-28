# 04 · Art & UI

Gaya visualnya pixel art yang hangat, nuansa pendakian pagi hari: kabut, langit oranye, hutan hijau. Identitasnya harus beda dari Krillion. Jangan pakai palet biru laut gelap mereka, dan jangan tiru layout mereka.

---

## 1. Prinsip visual

1. **Mobile dulu, layar potret.** Lebar acuan 360 px (HP Android kebanyakan).
2. **Pixel tetap tajam.** Semua gambar diperbesar dengan kelipatan bulat (2×, 3×, 4×) memakai `image-rendering: pixelated`. Jangan pernah 1,5×.
3. **Teks tetap gampang dibaca.** Font pixel hanya untuk judul & angka. Teks soal pakai font pixel yang lebih bersahaja.
4. **Warna tidak pernah jadi satu-satunya penanda.** Tiap tingkat selalu punya ikon + label, bukan cuma warna.
5. **Ringan.** Semua sprite digabung jadi spritesheet PNG. Target total aset gambar < 300 KB.

---

## 2. Tata letak

```
┌──────────────────────────┐
│  ADEGAN PIXEL (canvas)   │  ← 180×120 px logis, diperbesar 2× = 360×240
│  langit, gunung, pendaki │
├──────────────────────────┤
│  UI HTML                 │  ← teks, input, tombol (DOM biasa,
│  soal, timer, input      │     bukan digambar di canvas)
└──────────────────────────┘
```

- **Adegan:** `<canvas>` 180×120 px logis, diperbesar dengan kelipatan bulat terbesar yang muat. Di layar 360 px jadi 2×. Di desktop maksimal 3× dan diletakkan di tengah.
- **UI:** HTML + CSS biasa supaya teks tajam, aksesibel, dan input keyboard HP berjalan normal.
- **Lebar konten maksimal** 540 px di desktop, di tengah layar.
- **Saat keyboard HP muncul:** adegan menyusut atau disembunyikan sebagian supaya soal + input + timer tetap terlihat. Pakai `visualViewport` untuk mendeteksi tinggi layar yang tersisa.

---

## 3. Palet "Kabut Pagi" (16 warna)

| # | Nama | Hex | Dipakai untuk |
|---|---|---|---|
| 1 | Malam | `#1B1F3B` | Latar UI utama, teks gelap |
| 2 | Lembah | `#2E3A5C` | Kartu, panel |
| 3 | Langit | `#4A6FA5` | Langit siang, tingkat Puncak |
| 4 | Kabut | `#8FB8DE` | Kabut, aksen sekunder |
| 5 | Awan | `#E8F1F2` | Teks terang, awan |
| 6 | Mentari | `#F4D58D` | Matahari, highlight |
| 7 | Senja | `#F29E4C` | Tombol utama, tingkat Pos Camp |
| 8 | Carrier | `#D1495B` | Tas pendaki, peringatan, timer < 5 dtk |
| 9 | Merah Tua | `#8C2F39` | Bayangan merah |
| 10 | Hutan | `#2D6A4F` | Hutan jauh |
| 11 | Daun | `#52B788` | Hutan dekat, tingkat Batas Vegetasi |
| 12 | Lumut | `#95D5B2` | Highlight hijau |
| 13 | Tanah | `#6B4F3A` | Jalur, tanah |
| 14 | Batu | `#A68A64` | Batu, tingkat Basecamp |
| 15 | Abu | `#9AA0A6` | Teks nonaktif, Kabut (gagal) |
| 16 | Edelweiss | `#FFF3B0` | Tingkat Edelweiss, kilau spesial |

**Warna tingkat:**

| Tingkat | Warna | Ikon |
|---|---|---|
| 🥾 Basecamp | Batu `#A68A64` | sepatu |
| ⛺ Pos Camp | Senja `#F29E4C` | tenda |
| 🌲 Batas Vegetasi | Daun `#52B788` | pohon cemara |
| 🏔️ Puncak | Langit `#4A6FA5` | puncak bersalju/berbatu |
| 🌼 Edelweiss | Edelweiss `#FFF3B0` + kilau | bunga |
| 🌫️ Kabut | Abu `#9AA0A6` | awan tebal |

> **Kontras (WCAG AA, minimal 4,5:1 untuk teks).** Hasil cek awal:
> - ✅ Awan di atas Malam 14,0 · Edelweiss di atas Malam 14,3 · Malam di atas Senja 7,5 · Abu di atas Malam 6,1 · Batu di atas Malam 4,9
> - ❌ **Langit di atas Malam cuma 3,2**, jadi jangan dipakai untuk teks label "Puncak". Pakai warna Langit untuk ikon saja, dan pakai Kabut `#8FB8DE` (kontras 7,7 di atas Malam) untuk teks labelnya. Teks Awan di atas latar Langit juga cuma 4,4, jadi hindari kombinasi itu.
> - ❌ Putih di atas Senja 2,2. Tombol Senja harus pakai teks Malam.

---

## 4. Tipografi

| Peran | Font | Ukuran | Catatan |
|---|---|---|---|
| Logo & judul | **Press Start 2P** | 16 / 24 / 32 px | Ukuran kelipatan 8 supaya tajam |
| Angka skor & mdpl | **Press Start 2P** | 24–40 px | |
| Teks soal | **Pixelify Sans** | 20–22 px | Wajib gampang dibaca |
| Teks biasa, tombol | **Pixelify Sans** | 16–18 px | |
| Input jawaban | **Pixelify Sans** | **minimal 16 px** | Di bawah 16 px, iPhone otomatis zoom in |

- Semua font di atas gratis dengan lisensi SIL Open Font License, tersedia di Google Fonts.
- **Host sendiri** file `.woff2`-nya di `public/fonts/` (jangan ambil dari CDN Google) supaya tetap jalan offline (PWA) dan tidak mengirim data pemain ke pihak ketiga.
- Cantumkan kredit font di halaman Tentang.
- Alternatif kalau Pixelify Sans kurang cocok: **Silkscreen** (judul) atau **VT323** (teks).

---

## 5. Daftar aset

### 5.1 Sprite pendaki (16×24 px per frame)

| Animasi | Frame | Kecepatan | Kapan | Prioritas |
|---|---|---|---|---|
| Diam | 4 | 4 fps | Menunggu jawaban | MVP |
| Jalan naik | 6 | 10 fps | Setelah jawaban diterima | MVP |
| Lompat senang | 4 | 8 fps | Puncak / Edelweiss | MVP |
| Kedinginan | 3 | 6 fps | Kabut (waktu habis) | MVP |
| Foto edelweiss | 6 | 8 fps | Edelweiss | Fase 2 |
| Kibar bendera | 4 | 6 fps | Sampai di Cartenz | Fase 2 |

Ciri khas pendaki: tas carrier merah (warna Carrier), topi rimba, sepatu cokelat. Nuansanya pendaki lokal, bukan pendaki Barat.

### 5.2 Adegan (latar parallax 180×120 px)

| Lapisan | Gerak relatif | Isi | Prioritas |
|---|---|---|---|
| 1. Langit | 0 | Gradasi pagi | MVP |
| 2. Awan | 0,1 | Awan pelan bergerak | MVP |
| 3. Gunung jauh | 0,2 | Siluet pegunungan | MVP |
| 4. Kabut | 0,4 | Pita kabut transparan | MVP |
| 5. Hutan/jalur | 1,0 | Pohon, batu, jalur setapak | MVP |
| 6. Variasi zona | — | Hutan → semak → batu → puncak, berubah sesuai ketinggian | Fase 2 |
| 7. Waktu | — | Palet pagi/siang/sore/malam sesuai jam WIB | Fase 3 |

**Palet waktu (lapisan 7)** mengikuti jam WIB, apa pun zona waktu HP (`timeOfDayWIB()` di `src/game/date.ts`, tema di `src/scene/themes.ts`):

| Waktu | Jam WIB | Langit |
|---|---|---|
| Pagi | 05.00–09.59 | Langit → Kabut → Mentari, matahari rendah (palet "Kabut Pagi" asli) |
| Siang | 10.00–14.59 | Langit → Kabut, matahari tinggi |
| Sore | 15.00–17.59 | Lembah → Langit → Senja → Mentari, matahari terbenam di barat |
| Malam | 18.00–04.59 | Malam → Lembah → Langit di cakrawala, bulan dan bintang; tanah, pohon, dan awan digelapkan satu tingkat |

Semua warnanya tetap dari 16 warna di §3. Pendaki, bendera, dan Edelweiss tidak ikut digelapkan supaya tetap jelas.

### 5.3 Objek & ikon

| Aset | Ukuran | Prioritas |
|---|---|---|
| Ikon 5 tingkat + Kabut | 16×16 | MVP |
| Ikon tingkat versi besar (layar ungkap) | 32×32 | MVP |
| Papan pos (nama checkpoint) | 32×16 | MVP |
| Tenda dome | 32×24 | MVP |
| Edelweiss besar + kilau (4 frame) | 32×32 | MVP |
| Bendera merah putih di puncak | 16×24 | MVP |
| Kartu gunung (koleksi), 12 gunung | 48×32 masing-masing | Fase 2 |
| Ikon PWA | 192×192, 512×512, maskable | MVP |
| Gambar preview link (Open Graph) | 1200×630 | MVP |

### 5.4 Suara (chiptune)

Bisa dibuat gratis dengan **jsfxr**. Format `.ogg` + `.mp3` cadangan, masing-masing < 20 KB.

| SFX | Durasi |
|---|---|
| Ketik (sangat pelan, opsional) | 30 ms |
| Diterima: 5 nada berbeda per tingkat (makin langka makin tinggi) | 200–400 ms |
| Salah | 150 ms |
| Tik-tok 5 detik terakhir | 100 ms × 5 |
| Edelweiss: jingle spesial | ±1,2 dtk |
| Sampai di checkpoint | 500 ms |
| Kabut turun | 600 ms |

---

## 6. Sketsa layar

### 6.1 Beranda

```
┌──────────────────────────┐
│ [adegan: pendaki diam di │
│  basecamp, kabut pagi]   │
├──────────────────────────┤
│        M U N C A K       │
│  Makin langka, makin     │
│  tinggi.                 │
│                          │
│  ┌────────────────────┐  │
│  │  ▶ MUNCAK HARIAN   │  │  ← tombol utama (Senja)
│  │     #42 · 7 soal   │  │
│  └────────────────────┘  │
│  [ Ekspedisi ] [ Paket ] │  ← fase 2
│  [ Rombongan ]           │
│                          │
│  🔥 Streak 5 hari         │
│  📊 Statistik   ⚙️  ❓     │
└──────────────────────────┘
```

### 6.2 Layar soal

```
┌──────────────────────────┐
│ [adegan: pendaki diam,   │
│  ketinggian 1.250 mdpl]  │
├──────────────────────────┤
│ Soal 3/7      ⏱ 00:18    │
│ ████████████░░░░░░        │  ← bar timer, merah di < 5 dtk
│                          │
│  Sebutkan jenis sambal   │  ← Pixelify 22px
│                          │
│ ┌──────────────────┐┌──┐ │
│ │ ketik jawaban... ││⛰│ │  ← tombol "Daki"
│ └──────────────────┘└──┘ │
│                          │
│ ✗ saus tomat             │  ← percobaan salah
│   Saus tomat bukan       │
│   sambal, sabar ya 😄     │
└──────────────────────────┘
```

### 6.3 Layar ungkap (setelah tiap ronde)

```
┌──────────────────────────┐
│ [adegan: pendaki jalan   │
│  naik, angka mdpl naik]  │
├──────────────────────────┤
│   🏔️  PUNCAK  +85         │
│   "Sambal Andaliman"     │
│   Wih, jarang yang tahu! │
│                          │
│ Paling banyak dijawab    │
│  🥾 Terasi · Matah ·      │
│     Bawang               │
│ Jawaban langka lainnya   │
│  🏔️ Colo-colo · Roa       │
│ 🌼 Edelweiss: Sambal Luat │
│  Dari Timor, NTT. Cocok  │
│  dengan se'i.            │
│                          │
│ [Usulkan jawaban]        │
│ [      LANJUT ▶       ]  │
└──────────────────────────┘
```

### 6.4 Hasil akhir

```
┌──────────────────────────┐
│ [adegan: pendaki di      │
│  puncak Semeru, bendera] │
├──────────────────────────┤
│        3.676 mdpl        │  ← Press Start 2P 32px
│     ▲ GUNUNG SEMERU      │
│      Pemburu Puncak      │
│                          │
│   🥾 🌼 🌲 🏔️ ⛺ 🌫️ 🏔️      │
│                          │
│ [ 📤 BAGIKAN KE WA ]      │
│ [ Salin ] [ Rombongan ]  │
│                          │
│ Soal baru dalam 06:12:40 │
└──────────────────────────┘
```

### 6.5 Rombongan (fase 2)

```
┌──────────────────────────┐
│ ⛺ Anak IF 2024  MCK-7K3Q │
│ [Hari ini] [Minggu ini]  │
├──────────────────────────┤
│ 1. Rina    4.130 Kerinci │
│ 2. Kamu    3.676 Semeru  │
│ 3. Dodi    3.150 Merbabu │
│ 4. Andi    —  belum main │
│                          │
│ 🌼 Edelweiss hari ini:    │
│    Rina, Dodi            │
│                          │
│ [ Bagikan link grup ]    │
└──────────────────────────┘
```

### 6.6 Layar lainnya

| Layar | Isi singkat |
|---|---|
| Cara Main | 3 slide onboarding (lihat [02-game-design.md](02-game-design.md) bagian 6) |
| Statistik | Angka-angka + grafik batang distribusi tingkat + album gunung |
| Paket Tema | Grid kartu paket, tiap kartu menampilkan skor terbaik |
| Pengaturan | Suara, musik, getar, kurangi animasi, kontras tinggi, **Hapus data saya** |
| Tentang | Kredit, kebijakan privasi, link donasi (opsional), kontak |

---

## 7. Animasi & transisi

| Momen | Animasi | Durasi |
|---|---|---|
| Jawaban diterima | Ikon tingkat "pop" (scale 0 → 1,2 → 1), angka mdpl naik bertahap | 600 ms |
| Pendaki naik | Kamera bergeser ke atas, parallax berjalan | 800–1.500 ms (makin tinggi poin makin lama) |
| Edelweiss | Layar berkilau, partikel kelopak, jingle | 1.500 ms |
| Lewat checkpoint | Papan pos muncul + fakta gunung | 2.000 ms (bisa ditap untuk lewati) |
| Jawaban salah | Input bergoyang horizontal | 250 ms |
| Kabut | Lapisan kabut menutup adegan | 800 ms |

- Hormati `prefers-reduced-motion`: ganti semua gerakan dengan fade sederhana.
- Semua animasi panjang bisa dilewati dengan tap.

---

## 8. Gaya bahasa UI

- Sapaan pakai **"kamu"**: santai, tapi tetap nyaman untuk semua daerah dan umur. "Lu/gw" terasa terlalu Jakarta.
- Kalimat pendek, ramah, sedikit jenaka. Tidak pernah mengejek.

| Situasi | Contoh teks |
|---|---|
| Basecamp | "Aman! Semua orang juga kepikiran ini." |
| Pos Camp | "Lumayan, mulai naik nih." |
| Batas Vegetasi | "Mantap, ini mulai jarang!" |
| Puncak | "Wih, jarang yang tahu!" |
| Edelweiss | "Edelweiss! Cukup difoto, jangan dipetik 🌼" |
| Kabut | "Kabut turun! Istirahat dulu, lanjut soal berikutnya." |
| Tidak dikenal | "Belum ada di daftar kami. Coba yang lain?" |
| Sudah main hari ini | "Kamu sudah muncak hari ini. Sampai jumpa besok pagi!" |

---

## 9. Aksesibilitas

- Kontras teks minimal 4,5:1.
- Area sentuh minimal 44×44 px.
- Input jawaban punya `<label>` (boleh tersembunyi secara visual).
- Timer: `aria-live="polite"` yang mengumumkan sisa waktu di 10 dan 5 detik, bukan setiap detik.
- Hasil ronde diumumkan lewat `aria-live`.
- Mode kontras tinggi: latar hitam, teks putih, ikon tingkat diberi garis tepi.
- Semua bisa dimainkan dengan keyboard saja (desktop).

---

## 10. Alat kerja

| Kebutuhan | Alat | Biaya |
|---|---|---|
| Gambar & animasi sprite | Piskel (browser), LibreSprite | Gratis |
| | Aseprite | Berbayar, atau compile sendiri dari source |
| Referensi palet | Lospec | Gratis |
| SFX | jsfxr | Gratis |
| Aset tambahan | itch.io, OpenGameArt (**pilih yang CC0**, catat lisensinya di `public/assets/CREDITS.md`) | Gratis |
| Gabung spritesheet | Fitur export Aseprite/LibreSprite, atau free-tex-packer | Gratis |
