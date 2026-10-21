# 02 · Game Design

Dokumen ini adalah sumber kebenaran untuk semua aturan main. Kalau kode dan dokumen ini beda, salah satunya harus diperbaiki. Jangan dibiarkan beda.

---

## 1. Ringkasan loop

```
Buka game → Muncak Harian (7 soal) → tiap soal: ketik jawaban
   → jawaban diterima → tingkat & poin muncul → pendaki naik
   → lihat jawaban langka yang terlewat → soal berikutnya
→ hasil akhir: ketinggian (mdpl), gunung yang dicapai, gelar
→ share ke WA / bandingkan di Rombongan → balik besok
```

---

## 2. Muncak Harian (mode inti)

| Aturan | Nilai |
|---|---|
| Jumlah soal per hari | 7 |
| Soal sama untuk semua pemain | Ya |
| Reset | 00.00 WIB (UTC+7) |
| Waktu per soal | 25 detik |
| Kesempatan main per hari | 1 kali |
| Urutan soal | Dari yang paling gampang ke yang paling susah |

### 2.1 Alur satu ronde

1. Soal tampil, misalnya **"Sebutkan provinsi di Indonesia"**. Timer 25 detik mulai jalan.
2. Pemain mengetik jawaban, lalu tekan Enter atau tombol **Daki**.
3. Sistem mencocokkan jawaban (detail di [05-teknis.md](05-teknis.md) bagian Pencocokan):

| Hasil | Yang terjadi |
|---|---|
| **Diterima** | Ronde selesai. Tingkat dan poin muncul, pendaki naik. |
| **Ditolak dengan alasan** (ada di daftar `rejected`) | Muncul alasannya, misalnya "Irian Jaya itu nama lama yang dulu mencakup seluruh Papua". Waktu dipotong 2 detik. |
| **Tidak dikenal** | Muncul "Belum ada di daftar kami". Waktu dipotong 2 detik. Jawaban dicatat untuk ditinjau editor. |
| **Jawaban salah yang sama diketik ulang** | Diabaikan, tanpa potongan waktu. |

4. Kalau waktu habis sebelum ada jawaban yang diterima, muncul **"Kabut turun! 🌫️"**, poin 0, pendaki tidak naik.
5. **Layar ungkap** (selalu tampil setelah ronde selesai):
   - Jawaban pemain + tingkatnya
   - 3 jawaban **Basecamp** paling umum ("Yang paling banyak dijawab")
   - 2–3 jawaban **Puncak** ("Jawaban langka yang terlewat")
   - Jawaban **Edelweiss** + fakta singkatnya
   - Tombol **Lanjut**

> Satu ronde = satu jawaban yang diterima. Strateginya ada di situ: jawab cepat yang aman, atau ambil waktu buat mikirin yang langka?

### 2.2 Tingkat jawaban & poin

| Tingkat | ID kode | Ikon | Arti | Poin |
|---|---|---|---|---|
| Basecamp | `basecamp` | 🥾 | Jawaban paling umum | 10 |
| Pos Camp | `camp` | ⛺ | Umum tapi nggak langsung kepikiran | 30 |
| Batas Vegetasi | `treeline` | 🌲 | Jarang | 60 |
| Puncak | `summit` | 🏔️ | Sangat jarang | 85 |
| Edelweiss | `edelweiss` | 🌼 | 1 jawaban rahasia per soal, dipilih editor | 100 |
| Kabut | — | 🌫️ | Waktu habis | 0 |

- Tiap soal punya **tepat satu** jawaban Edelweiss.
- Cara menentukan tingkat (manual dulu, lalu berbasis data) dijelaskan di [05-teknis.md](05-teknis.md) bagian Kelangkaan.
- **Tingkat dibekukan per hari.** Pembaruan kelangkaan berlaku mulai jadwal berikutnya, supaya semua pemain di hari yang sama dinilai dengan aturan yang sama.

**Pesan khusus Edelweiss:** saat pemain menemukan Edelweiss, tampilkan animasi spesial dan teks *"Edelweiss! Cukup difoto, jangan dipetik 🌼"*. Ini nyambung ke etika pendaki di Indonesia.

### 2.3 Poin jadi mdpl

```
ketinggian (mdpl) = total poin × 7
```

- Skor maksimum: 7 × 100 = 700 poin = **4.900 mdpl**
- Puncak Jaya (Cartenz) di 4.884 mdpl cuma bisa dicapai dengan skor sempurna (7 Edelweiss). Itu memang sengaja jadi pencapaian legendaris.

### 2.4 Checkpoint gunung

Pendaki melewati gunung-gunung ini sesuai ketinggiannya. Hasil akhir menampilkan **gunung tertinggi yang ketinggiannya ≤ skor pemain**.

| mdpl | Gunung | Lokasi | Poin minimum |
|---|---|---|---|
| 0 | Basecamp | — | 0 |
| 700 | Gunung Api Purba Nglanggeran | DI Yogyakarta | 100 |
| 1.717 | Gunung Batur | Bali | 246 |
| 2.084 | Gunung Tangkuban Parahu | Jawa Barat | 298 |
| 2.329 | Gunung Bromo | Jawa Timur | 333 |
| 2.565 | Gunung Prau | Jawa Tengah | 367 |
| 2.958 | Gunung Gede | Jawa Barat | 423 |
| 3.145 | Gunung Merbabu | Jawa Tengah | 450 |
| 3.428 | Gunung Slamet | Jawa Tengah | 490 |
| 3.676 | Gunung Semeru | Jawa Timur | 526 |
| 3.726 | Gunung Rinjani | NTB | 533 |
| 3.805 | Gunung Kerinci | Jambi | 544 |
| 4.884 | Puncak Jaya (Cartenz) | Papua Tengah | 698 (praktis 700) |

> ⚠️ **Wajib verifikasi sebelum rilis.** Ketinggian gunung sering beda beberapa meter antar sumber (contoh: Rinjani ditulis 3.726 atau 3.727). Pakai satu sumber acuan yang konsisten, misalnya data resmi taman nasional atau PVMBG, lalu catat sumbernya di `content/mountains.json`.

Tiap checkpoint punya **1 fakta singkat** (maks. 140 karakter) yang muncul saat pendaki melewatinya.
Contoh: *"Semeru, 3.676 mdpl. Atap Pulau Jawa, puncaknya bernama Mahameru."*

### 2.5 Gelar hasil akhir

| Ketinggian | Gelar |
|---|---|
| 0–999 | Pendaki Pemula |
| 1.000–1.999 | Pendaki Akhir Pekan |
| 2.000–2.999 | Anak Gunung |
| 3.000–3.999 | Pemburu Puncak |
| 4.000–4.899 | Legenda Jalur |
| 4.900 | Penakluk Cartenz |

### 2.6 Lanjut main setelah keluar

- Progres disimpan di perangkat (localStorage).
- **Timer tetap jalan saat tab ditutup.** Waktu mulai ronde disimpan. Saat dibuka lagi, sisa waktu = 25 detik − waktu yang sudah lewat. Kalau sudah habis, ronde itu jadi Kabut. Ini supaya pemain nggak bisa keluar, googling, lalu balik.
- Soal yang sudah selesai tidak bisa diulang.

---

## 3. Layar hasil akhir

Isi:
- Ketinggian besar: **3.676 mdpl**
- Gunung yang dicapai + ilustrasinya: **Semeru**
- Gelar: **Pemburu Puncak**
- Baris ikon 7 ronde: 🥾🌼🌲🏔️⛺🌫️🏔️
- Tombol: **Bagikan ke WA**, **Salin hasil**, **Lihat Rombongan**, **Statistik**
- Hitung mundur ke soal berikutnya: "Soal baru dalam 06:12:40"

### 3.1 Format share

```
Muncak #42 🏔️
3.676 mdpl · Semeru
🥾🌼🌲🏔️⛺🌫️🏔️
[ISI: domain]
```

- `#42` = nomor hari sejak tanggal rilis (hari rilis = #1).
- Jangan bocorkan jawaban di teks share.
- Urutan tombol: **Web Share API** (lembar share bawaan HP) → kalau tidak didukung, link `https://wa.me/?text=...` → kalau gagal juga, salin ke clipboard.

---

## 4. Statistik pemain

Disimpan di perangkat, tampil di layar Statistik:

| Statistik | Keterangan |
|---|---|
| Hari dimainkan | Jumlah Muncak Harian yang diselesaikan |
| Streak saat ini | Hari berturut-turut menyelesaikan harian (berdasarkan tanggal WIB) |
| Streak terbaik | |
| Rata-rata ketinggian | mdpl |
| Ketinggian tertinggi | mdpl + gunungnya |
| Distribusi tingkat | Berapa kali dapat 🥾 ⛺ 🌲 🏔️ 🌼 🌫️ |
| Koleksi gunung | Gunung yang pernah dicapai, ditampilkan seperti album stiker |
| Koleksi Edelweiss | Jumlah Edelweiss yang pernah ditemukan |

---

## 5. Mode lain

### 5.1 Ekspedisi (mode tanpa batas) · fase 2

| Aturan | Nilai |
|---|---|
| Soal | Acak dari bank soal, tidak termasuk soal harian hari ini |
| Timer | Satu timer **Logistik** 45 detik untuk seluruh sesi, terus berkurang |
| Jawaban diterima | Tambah logistik: 🥾 +5 dtk · ⛺ +7 · 🌲 +9 · 🏔️ +12 · 🌼 +16 |
| Jawaban salah | −2 detik |
| Lewati soal | Boleh, −3 detik |
| Selesai | Saat logistik habis |
| Skor | Total mdpl (poin × 7), tanpa batas atas. Lewat 4.884 tetap lanjut, ditampilkan "1,3× Cartenz". |

Yang disimpan: rekor pribadi Ekspedisi.

### 5.2 Paket Tema · fase 2

- 7 soal per paket dengan aturan sama seperti Harian.
- Bisa dimainkan kapan saja dan boleh diulang. Yang disimpan cuma skor terbaik.
- Paket awal: **Nusantara**, **Global**, **Bola**, **Kuliner**, **Musik & Film**, **Sains & Teknologi**, **Sejarah**.
- Paket musiman: **17 Agustus**, **Ramadan**, **Akhir Tahun**.

### 5.3 Rombongan (main bareng grup) · fase 2

Tujuan: satu link untuk grup WA, dengan klasemen harian.

**Alur:**
1. Pemain A tekan **Bikin Rombongan**, isi nama (misal "Anak IF 2024"), lalu dapat kode `MCK-7K3Q` dan link `[ISI: domain]/r/MCK-7K3Q`.
2. A membagikan link ke grup WA.
3. Pemain B buka link, isi **nama panggilan** (tanpa login), lalu bergabung.
4. Setiap kali anggota menyelesaikan Muncak Harian, skornya otomatis terkirim ke semua Rombongan yang ia ikuti.
5. Layar Rombongan menampilkan:
   - **Klasemen hari ini** berdasarkan mdpl. Skor anggota lain baru terlihat setelah kita sendiri selesai main, supaya tidak ada spoiler.
   - **Klasemen minggu ini** (total mdpl Senin–Minggu)
   - "Edelweiss hari ini ditemukan oleh: Rina, Dodi"

**Aturan:**
- Maksimal 50 anggota per Rombongan. Satu pemain bisa ikut maksimal 10 Rombongan.
- Identitas = ID perangkat acak + nama panggilan. Ganti HP berarti harus gabung lagi.
- Nama panggilan maksimal 20 karakter, disaring dari kata kasar.
- Rombongan yang 90 hari tidak aktif dihapus otomatis.
- Yang dikirim ke server cuma skor dan ikon tingkat per ronde. Teks jawaban tidak dikirim ke Rombongan.

### 5.4 Mode Kelas · fase 3 (ide)

- Guru membuat sesi, siswa bergabung pakai kode, semua menjawab soal yang sama secara bersamaan, lalu hasil ditampilkan di proyektor.
- Ada bank soal khusus per mata pelajaran (IPS, IPA, Bahasa).

---

## 6. Onboarding

Tiga layar singkat saat pertama kali main. Bisa dilewati.

1. **"Sebutkan sesuatu. Semua jawaban benar diterima."** Contoh soal + jawaban.
2. **"Makin langka, makin tinggi."** Tabel 5 tingkat dengan ikon.
3. **"Tiap hari 7 soal. Daki sampai Cartenz!"** Animasi pendaki.

Lalu langsung masuk soal pertama. Soal pertama hari itu selalu yang paling gampang.

---

## 7. Suara & getar

- SFX chiptune pendek: ketik, diterima (beda nada tiap tingkat), salah, waktu hampir habis (5 detik terakhir), Edelweiss (jingle spesial), sampai di checkpoint.
- Musik latar opsional, default **mati**.
- Getar (`navigator.vibrate`) saat dapat Edelweiss, kalau perangkat mendukung.
- Semua bisa dimatikan di Pengaturan.

---

## 8. Parameter yang bisa disetel

Semua angka ini ditaruh di satu file konstanta (`src/game/constants.ts`) supaya gampang di-tuning. Kalau ada yang diubah, ubah juga tabel ini.

| Parameter | Nilai awal |
|---|---|
| `ROUNDS_PER_DAY` | 7 |
| `ROUND_SECONDS` | 25 |
| `WRONG_PENALTY_SECONDS` | 2 |
| `POINTS` | basecamp 10, camp 30, treeline 60, summit 85, edelweiss 100 |
| `METERS_PER_POINT` | 7 |
| `EXPEDITION_START_SECONDS` | 45 |
| `EXPEDITION_BONUS` | 5 / 7 / 9 / 12 / 16 |
| `EXPEDITION_SKIP_PENALTY` | 3 |
| `RESET_TIMEZONE` | `Asia/Jakarta` |
| `GROUP_MAX_MEMBERS` | 50 |
| `GROUP_MAX_PER_PLAYER` | 10 |

---

## 9. Pertanyaan desain yang masih terbuka

- [ ] Perlu fitur **petunjuk** (misal huruf pertama) dengan potongan poin? Saran: tidak untuk versi pertama.
- [ ] Pemain WITA/WIT dapat soal baru jam 01.00/02.00 waktu setempat. Ini wajar, tapi perlu disebut di FAQ.
- [ ] Perlu batas minimal panjang jawaban untuk mencegah tebak acak 1–2 huruf? Saran: jawaban di bawah 2 karakter selalu ditolak tanpa potongan waktu.
- [ ] Kalau 25 detik ternyata terlalu cepat buat pengguna HP (ngetik lebih lambat), naikkan ke 30 detik setelah playtest.
