# 06 · Roadmap

Perkiraan waktu di bawah dihitung untuk **1 orang yang mengerjakan paruh waktu**. Kalau ada partner untuk konten atau gambar, waktunya bisa lebih pendek.

```
Minggu 1–2   Fase 0  Uji konten
Minggu 3–8   Fase 1  Versi pertama (rilis)
Bulan 3–4    Fase 2  Data kelangkaan, Ekspedisi, Paket Tema, Rombongan
Bulan 5+     Fase 3  Komunitas & Mode Kelas
```

---

## Fase 0 · Uji konten (minggu 1–2)

**Tujuan:** membuktikan game ini seru **sebelum** menulis kode.

- [ ] Tulis 30 soal di spreadsheet: soal, jawaban, alias, tingkat manual, Edelweiss
- [ ] Main manual bareng 5–10 teman: satu orang jadi "host" yang membacakan soal dan memakai timer HP, pemain menjawab di chat
- [ ] Tes 60 detik "tulis sebanyak-banyaknya" untuk kalibrasi tingkat (lihat [03-konten-soal.md](03-konten-soal.md) §4)
- [ ] Catat: soal mana yang paling seru, mana yang membingungkan, jawaban apa yang sering diperdebatkan
- [ ] Putuskan nama final & cek ketersediaan domain
- [ ] Buat repo, tambahkan semua dokumen ini

**Lanjut ke fase berikutnya kalau:**
- ≥ 7 dari 10 penguji bilang mau main lagi besok
- Momen "oh iya!" muncul di sebagian besar soal
- Satu sesi 7 soal selesai dalam < 5 menit

---

## Fase 1 · Versi pertama (minggu 3–8)

### Minggu 3–4: inti game
- [ ] Setup Vite + Preact + TS, lint, Vitest, struktur folder ([05-teknis.md](05-teknis.md) §2)
- [ ] `normalize.ts` + `match.ts` + unit test lengkap
- [ ] `scoring.ts`, `date.ts`, `constants.ts` + unit test
- [ ] Skema zod + `validate-content.ts` + `build-daily.ts`
- [ ] Reducer ronde, timer berbasis `startedAt`, simpan/lanjut progres
- [ ] Layar: Soal, Ungkap, Hasil (masih kotak-kotak tanpa gambar)

### Minggu 5–6: tampilan & rasa
- [ ] Palet, font, komponen UI dasar
- [ ] Sprite pendaki (diam, jalan, lompat, kedinginan)
- [ ] Adegan parallax 5 lapisan + kamera naik
- [ ] Ikon 6 tingkat, papan pos, edelweiss, bendera
- [ ] Animasi & SFX inti
- [ ] Layar Beranda, Onboarding, Statistik, Pengaturan, Tentang
- [ ] Share: Web Share API → WA → salin

### Minggu 7–8: konten, uji, rilis
- [ ] **120 soal `verified`** + jadwal 30 hari pertama
- [ ] `mountains.json` dengan ketinggian terverifikasi + sumber
- [ ] PWA: manifest, ikon, service worker
- [ ] GitHub Actions: CI + deploy harian 23:45 WIB
- [ ] Tombol **Laporkan soal** (fase 1 cukup membuka Google Form atau `mailto:`)
- [ ] Halaman Kebijakan Privasi ([07-privasi.md](07-privasi.md))
- [ ] Uji tertutup 1 minggu dengan 20–50 orang
- [ ] Checklist rilis (di bawah) ✅
- [ ] **Rilis** 🚀

---

## Fase 2 · Data & sosial (bulan 3–4)

- [ ] Cloudflare Worker + D1, migrasi tabel ([05-teknis.md](05-teknis.md) §10)
- [ ] `GET /daily` dari server (menggantikan file statis)
- [ ] `POST /plays`, log jawaban anonim, salt harian
- [ ] `compute-rarity.ts` mingguan + laporan jawaban `unknown`
- [ ] Antrean tinjauan editor + tombol **Usulkan jawaban**
- [ ] **Rombongan**: bikin, gabung, klasemen harian & mingguan
- [ ] **Ekspedisi** (mode tanpa batas)
- [ ] **Paket Tema**: Nusantara, Global, Bola, Kuliner, Musik & Film, Sains, Sejarah
- [ ] Animasi tambahan: foto edelweiss, kibar bendera, zona ketinggian
- [ ] Kartu koleksi 12 gunung
- [ ] Perbarui Kebijakan Privasi untuk fase 2
- [ ] Bank soal mencapai **210+**

---

## Fase 3 · Komunitas (bulan 5+)

- [ ] **Mode Kelas** untuk guru
- [ ] Paket musiman: 17 Agustus, Ramadan, Akhir Tahun
- [ ] Palet adegan mengikuti jam WIB (pagi/siang/sore/malam)
- [ ] Program kontributor soal (kredit nama penulis di layar ungkap)
- [ ] Halaman donasi sukarela (Saweria/Trakteer) kalau biaya server mulai muncul
- [ ] Pertimbangkan versi bahasa daerah atau paket per provinsi

---

## Checklist rilis

### Konten
- [ ] ≥ 120 soal `verified`, jadwal 30 hari lolos validasi
- [ ] Semua Edelweiss diverifikasi 2 sumber
- [ ] Ketinggian semua checkpoint diverifikasi dari satu sumber acuan
- [ ] Cek sebaran Edelweiss per pulau di jadwal 30 hari pertama
- [ ] Baca ulang semua teks `rejected.reason` dan `edelweissFact` (typo, nada ramah)

### Teknis
- [ ] Semua unit test & e2e lulus
- [ ] Diuji di: Android murah (Chrome), iPhone (Safari), desktop (Chrome, Firefox)
- [ ] Diuji di zona waktu non-WIB & di sekitar tengah malam
- [ ] Refresh di tengah ronde → timer melanjutkan dengan benar
- [ ] Mode pesawat setelah soal dimuat → game tetap bisa diselesaikan
- [ ] localStorage diblokir → game tetap jalan dengan peringatan
- [ ] Ukuran bundle sesuai target ([05-teknis.md](05-teknis.md) §11)
- [ ] Deploy harian otomatis sudah jalan minimal 3 hari berturut-turut

### Tampilan & aksesibilitas
- [ ] Kontras ≥ 4,5:1 di semua teks
- [ ] Input tidak tertutup keyboard di Android & iPhone
- [ ] `prefers-reduced-motion` dihormati
- [ ] Preview link (Open Graph) tampil bagus di WhatsApp

### Legal & identitas
- [ ] Nama, logo, aset, dan teks orisinal (tidak meniru Krillion)
- [ ] Kredit font & aset pihak ketiga di halaman Tentang
- [ ] Kebijakan Privasi online & ditautkan dari Pengaturan

---

## Metrik yang dipantau

| Metrik | Artinya | Target awal (tebakan, disesuaikan setelah ada data) |
|---|---|---|
| Tingkat selesai | % sesi harian yang selesai 7 soal | ≥ 80% |
| Tingkat share | % sesi selesai yang menekan tombol share | ≥ 15% |
| Retensi D1 / D7 | % pemain yang kembali hari ke-1 / ke-7 | ≥ 35% / ≥ 20% |
| Rata-rata mdpl | Kalibrasi kesulitan | 1.500–2.500 |
| % Kabut per soal | Soal terlalu sulit kalau > 25% | < 15% |
| % `unknown` per soal | Daftar jawaban kurang lengkap kalau tinggi | Turun tiap minggu |
| % pemain di Rombongan (fase 2) | Kekuatan pilar sosial | ≥ 30% |

---

## Rencana promosi (gratis)

1. **Uji tertutup:** teman, grup WA kampus/kantor. Minta mereka share hasil setiap hari.
2. **Rilis lunak:** X/Twitter dan Threads dengan contoh hasil share. Konten "jawaban paling langka kemarin" setiap hari.
3. **TikTok/Reels:** format "Tebak jawaban yang cuma dipilih 1% orang Indonesia". Rekam reaksi teman.
4. **Komunitas pendaki:** grup & akun pendakian, karena tema gunung relate dengan mereka.
5. **Guru & komunitas pendidikan:** setelah Mode Kelas siap (fase 3).
6. **Forum:** r/indonesia, komunitas developer lokal (ceritakan proses pembuatannya).

---

## Risiko

| Risiko | Dampak | Penanganan |
|---|---|---|
| Produksi soal tidak terkejar | Jadwal kosong | Rilis dengan stok 120, aturan pengulangan 30 hari, produksi batch tiap akhir pekan |
| Kesalahan fakta | Pemain kesal, kredibilitas turun | Alur 2 peninjau, tombol Laporkan soal, perbaiki dalam 24 jam |
| Mendadak viral | Kuota gratis habis | Fase 1 full statis (CDN), cache agresif, siapkan halaman donasi |
| Curang di Rombongan | Klasemen tidak adil | Skor dihitung di server, 1 skor per member per hari |
| Kelelahan kreator | Proyek berhenti | Otomatisasi deploy, cari 1–2 kontributor konten sejak awal |
| Klaim kemiripan dengan Krillion | Masalah hukum | Identitas, aset, dan teks orisinal; mekanik umum saja yang mirip |
