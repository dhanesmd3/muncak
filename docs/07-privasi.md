# 07 · Privasi & Data

> ⚠️ Dokumen ini panduan desain, bukan nasihat hukum. Sebelum fase 2 (saat mulai mengumpulkan data di server), sebaiknya minta pendapat orang yang paham hukum, misalnya klinik hukum kampus.

---

## 1. Prinsip

1. **Kumpulkan seminimal mungkin.** Tanpa akun, nama asli, email, nomor HP, lokasi, maupun kontak.
2. **Anonim sejak awal.** Log jawaban tidak bisa dikaitkan kembali ke perangkat setelah 2 hari (lihat [05-teknis.md](05-teknis.md) §10.1).
3. **Transparan.** Kebijakan privasi ditulis dalam bahasa sehari-hari dan bisa dibuka dari Pengaturan.
4. **Pemain pegang kendali.** Ada tombol **Hapus data saya** yang benar-benar menghapus data.

### Kenapa ini penting
Indonesia punya **UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP)**. Game ini juga kemungkinan besar dimainkan pelajar di bawah 18 tahun, dan UU PDP punya aturan khusus untuk data anak (antara lain soal persetujuan orang tua/wali). Cara paling aman adalah **tidak mengumpulkan data pribadi sama sekali**, dan desain di bawah sudah mengarah ke situ.

---

## 2. Data per fase

### Fase 1 (tanpa backend)

| Data | Disimpan di | Dikirim ke server? |
|---|---|---|
| Progres, statistik, pengaturan | Perangkat pemain (localStorage) | ❌ Tidak |
| ID perangkat acak | Perangkat pemain | ❌ Tidak (belum dipakai) |
| Kunjungan halaman | Cloudflare Web Analytics (tanpa cookie, agregat) | ✅ Agregat saja |
| Alamat IP | Diproses Cloudflare untuk mengirim halaman (bagian dari layanan hosting) | Tidak disimpan oleh Muncak |

**Ringkasnya:** di fase 1, Muncak sendiri tidak menyimpan data pemain apa pun.

### Fase 2 (dengan backend)

| Data | Untuk apa | Bentuk | Retensi |
|---|---|---|---|
| Jawaban yang diketik (sudah dinormalisasi, maks. 60 karakter) + ID soal + tanggal + hasil (diterima/ditolak/tidak dikenal) | Menghitung kelangkaan, memperbaiki daftar jawaban | Dengan `device_hash` yang salt-nya dihapus setelah 2 hari, sehingga **anonim** | 24 bulan, lalu hanya disimpan sebagai hitungan agregat |
| `member_id` (HMAC dari ID perangkat) | Rombongan & skor harian | Pseudonim | Selama pemain aktif. Dihapus saat **Hapus data saya** atau setelah 12 bulan tidak aktif. |
| Nama panggilan Rombongan | Tampil di klasemen | Teks bebas, maks. 20 karakter | Sama dengan `member_id` |
| Nama Rombongan | Tampil ke anggota | Teks bebas, maks. 20 karakter | Dihapus setelah 90 hari tidak aktif |
| Skor harian (mdpl + ikon tingkat) | Klasemen Rombongan | | 12 bulan |
| Usulan jawaban | Antrean tinjauan editor | Tanpa ID apa pun | Sampai selesai ditinjau |
| Error aplikasi | Memperbaiki bug | Pesan error + versi aplikasi, tanpa ID | 30 hari |
| Hitungan event (sesi selesai, share ditekan) | Memahami pemakaian | Agregat per hari, tanpa ID | Tanpa batas (sudah agregat) |

**Yang tidak pernah dikumpulkan:** nama asli, email, nomor HP, tanggal lahir, lokasi GPS, daftar kontak, foto, sidik jari perangkat (fingerprinting), cookie iklan.

---

## 3. Risiko & mitigasi

| Risiko | Mitigasi |
|---|---|
| Pemain mengetik data pribadi sebagai jawaban (misal nama atau nomor HP) | Input dibatasi 60 karakter. Log mentah anonim. Di laporan mingguan, hanya jawaban yang muncul ≥ 3 kali dari perangkat berbeda yang ditampilkan ke editor. |
| Nama panggilan berisi nama asli anak | UI menyarankan "Pakai nama panggilan, jangan nama lengkap". Nama hanya terlihat oleh anggota Rombongan yang sama. |
| Nama Rombongan/panggilan berisi kata kasar | Filter kata kasar + anggota bisa melaporkan |
| Kebocoran database | Tidak ada data yang langsung mengidentifikasi orang. Secret disimpan di Worker secrets. Akses dashboard Cloudflare memakai 2FA. |
| Pihak ketiga (font, CDN, analitik) | Font di-host sendiri. Analitik tanpa cookie. Tidak ada SDK iklan atau pelacak. |

---

## 4. Hak pemain

| Hak | Cara |
|---|---|
| Tahu data apa yang dikumpulkan | Halaman Kebijakan Privasi |
| Menghapus data | Pengaturan → **Hapus data saya**: menghapus localStorage + `DELETE /api/v1/me` (member, nama panggilan, skor, keanggotaan Rombongan) |
| Keluar dari Rombongan | Tombol **Keluar** di layar Rombongan |
| Bertanya / mengajukan keberatan | Email kontak `[ISI]` |

Log jawaban yang sudah anonim tidak bisa dihapus per orang, karena memang sudah tidak bisa dikaitkan ke siapa pun. Hal ini dijelaskan terus terang di kebijakan privasi.

---

## 5. Draf Kebijakan Privasi (untuk halaman di game)

> **Kebijakan Privasi Muncak**
> Terakhir diperbarui: `[ISI tanggal]`
>
> Muncak adalah game gratis tanpa akun. Kami berusaha mengumpulkan data sesedikit mungkin.
>
> **Yang disimpan di HP kamu**
> Progres permainan, statistik, dan pengaturan disimpan di browser kamu sendiri. Kami tidak bisa melihatnya. Kamu bisa menghapusnya kapan saja lewat Pengaturan → Hapus data saya.
>
> **Yang kami terima** *(berlaku setelah fitur Rombongan & statistik kelangkaan aktif)*
> - **Jawaban yang kamu ketik**, beserta soal dan tanggalnya. Kami pakai untuk menghitung seberapa langka tiap jawaban dan untuk memperbaiki daftar jawaban. Data ini anonim: setelah 2 hari kami tidak bisa lagi tahu jawaban itu berasal dari perangkat mana.
> - **Kalau kamu ikut Rombongan:** nama panggilan yang kamu pilih dan skor harianmu, supaya teman satu Rombonganmu bisa melihat klasemen. Pakai nama panggilan, jangan nama lengkap.
> - **Laporan error** tanpa identitas, untuk memperbaiki bug.
> - **Statistik kunjungan** tanpa cookie dan tanpa identitas, melalui Cloudflare Web Analytics.
>
> **Yang tidak pernah kami kumpulkan**
> Nama asli, email, nomor HP, lokasi, kontak, atau data untuk iklan. Muncak tidak memasang iklan dan tidak menjual data.
>
> **Berapa lama disimpan**
> Data Rombongan dihapus kalau tidak aktif 90 hari (Rombongan) atau 12 bulan (pemain). Log jawaban anonim disimpan maksimal 24 bulan, lalu hanya tersisa dalam bentuk angka statistik.
>
> **Menghapus data**
> Pengaturan → Hapus data saya akan menghapus data di HP kamu dan data Rombongan kamu di server kami. Jawaban yang sudah anonim tidak bisa dihapus per orang karena memang sudah tidak terhubung ke kamu.
>
> **Pihak lain**
> Muncak di-host di Cloudflare. Cloudflare memproses alamat IP untuk mengirim halaman ke perangkatmu, sesuai kebijakan privasi Cloudflare.
>
> **Untuk pemain di bawah 18 tahun**
> Muncak tidak meminta data pribadi. Kalau kamu ikut Rombongan, pakai nama panggilan saja. Orang tua/wali yang ingin data anaknya dihapus bisa menghubungi kami.
>
> **Kontak**
> `[ISI email]`
>
> Kebijakan ini bisa berubah. Perubahan penting akan kami umumkan di dalam game.

---

## 6. Checklist sebelum fase 2

- [ ] Kebijakan privasi diperbarui & tanggalnya diganti
- [ ] Tombol **Hapus data saya** menghapus data di server (diuji)
- [ ] Salt harian benar-benar terhapus setelah 2 hari (diuji)
- [ ] Cron retensi berjalan (Rombongan 90 hari, member 12 bulan, log 24 bulan)
- [ ] Tidak ada log Worker yang mencetak `deviceId` mentah
- [ ] 2FA aktif di akun Cloudflare & GitHub
- [ ] Minta pendapat ahli hukum (opsional tapi disarankan)
