# 03 · Konten Soal

Konten adalah bagian paling berat sekaligus paling menentukan di game ini. Kodenya bisa selesai dalam beberapa minggu, tapi bank soal yang bagus harus dirawat terus.

---

## 1. Kriteria soal yang bagus

Soal harus lolos **semua** syarat ini:

| # | Syarat | Contoh lolos | Contoh gagal |
|---|---|---|---|
| 1 | **Jawabannya banyak.** Minimal 50 untuk soal terbuka, minimal 30 untuk soal tertutup. | "Sebutkan jenis sambal" | "Sebutkan presiden Indonesia" (cuma 8) |
| 2 | **Bisa dicek faktanya.** Benar atau salahnya sebuah jawaban tidak bergantung opini. | "Sebutkan tarian daerah" | "Sebutkan makanan paling enak" |
| 3 | **Tidak ambigu.** Batas kategorinya jelas. | "Sebutkan unsur kimia" | "Sebutkan benda yang berbahaya" |
| 4 | **Tidak cepat basi.** Jawabannya tidak berubah tiap musim. | "Sebutkan pemenang Ballon d'Or" (sepanjang masa) | "Sebutkan klub liga musim ini" |
| 5 | **Ada jawaban langka yang seru.** Ada jawaban yang bikin orang bilang "oh iya!" | "Sebutkan bulan di tata surya" (Miranda, Nereid) | Soal yang semua jawabannya sama terkenalnya |
| 6 | **Aman.** Tidak memancing SARA, tidak menyangkut politik terkini, tidak menyinggung tragedi. | | "Sebutkan partai politik" |

**Soal tertutup** artinya daftar jawabannya pasti dan lengkap (provinsi, unsur kimia). **Soal terbuka** artinya daftarnya bisa terus bertambah (sambal, jajanan pasar). Soal terbuka butuh antrean tinjauan jawaban yang lebih aktif (lihat bagian 7).

---

## 2. Format file soal

- Satu soal = satu file JSON di `content/prompts/<id>.json`.
- **Key JSON pakai bahasa Inggris** (konvensi kode). Teks yang tampil ke pemain pakai bahasa Indonesia.
- Skema divalidasi otomatis dengan `npm run validate:content` (detail di [05-teknis.md](05-teknis.md)).

### 2.1 Skema

| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `id` | string | ✅ | `<kategori>-<slug>-<nomor>`, contoh `nusantara-provinsi-001` |
| `prompt` | string | ✅ | Teks soal, selalu diawali "Sebutkan" |
| `category` | enum | ✅ | `nusantara` · `global` · `kuliner` · `sejarah` · `alam` · `pop` · `bola` · `sains` |
| `difficulty` | 1–5 | ✅ | 1 = paling gampang. Dipakai untuk mengurutkan soal harian. |
| `closedSet` | boolean | ✅ | `true` kalau daftar jawabannya pasti dan lengkap |
| `pool` | enum | — | `daily` (default) untuk Muncak Harian, `bank` untuk Ekspedisi & Paket Tema (lihat bagian 10) |
| `optionalPrefixes` | string[] | — | Kata depan yang boleh ada atau tidak, misalnya `["provinsi"]`, `["sambal"]`, `["gunung"]` |
| `answers` | Answer[] | ✅ | Semua jawaban yang diterima |
| `rejected` | Rejected[] | — | Jawaban yang sering diketik tapi salah, beserta alasannya |
| `edelweissFact` | string | ✅ | Fakta singkat tentang jawaban Edelweiss (maks. 160 karakter) |
| `sources` | string[] | ✅ | Link atau referensi yang dipakai untuk verifikasi |
| `status` | enum | ✅ | `draft` · `review` · `verified` · `retired` |
| `author` | string | ✅ | Penulis soal |
| `verifiedBy` | string | — | Peninjau, wajib diisi saat status `verified` |
| `validAsOf` | tanggal | ✅ | Data benar per tanggal ini |

**Answer**

| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `id` | string | ✅ | Slug unik dalam soal ini |
| `text` | string | ✅ | Nama resmi/baku, yang tampil di layar ungkap |
| `aliases` | string[] | — | Nama lain yang juga diterima |
| `tier` | enum | ✅ | Tingkat manual: `basecamp` · `camp` · `treeline` · `summit` · `edelweiss` |

**Rejected**

| Field | Tipe | Wajib | Keterangan |
|---|---|---|---|
| `text` | string | ✅ | Jawaban yang ditolak |
| `aliases` | string[] | — | Variasi lainnya |
| `reason` | string | ✅ | Alasan yang tampil ke pemain (maks. 120 karakter, nadanya ramah) |

### 2.2 Contoh lengkap: soal tertutup

`content/prompts/nusantara-provinsi-001.json`

```json
{
  "id": "nusantara-provinsi-001",
  "prompt": "Sebutkan provinsi di Indonesia",
  "category": "nusantara",
  "difficulty": 1,
  "closedSet": true,
  "optionalPrefixes": ["provinsi", "prov"],
  "answers": [
    { "id": "aceh", "text": "Aceh", "aliases": ["nad", "nanggroe aceh darussalam", "daerah istimewa aceh"], "tier": "basecamp" },
    { "id": "sumut", "text": "Sumatera Utara", "aliases": ["sumut", "sumatra utara"], "tier": "basecamp" },
    { "id": "sumbar", "text": "Sumatera Barat", "aliases": ["sumbar", "sumatra barat"], "tier": "camp" },
    { "id": "riau", "text": "Riau", "aliases": [], "tier": "camp" },
    { "id": "kepri", "text": "Kepulauan Riau", "aliases": ["kepri"], "tier": "treeline" },
    { "id": "jambi", "text": "Jambi", "aliases": [], "tier": "treeline" },
    { "id": "sumsel", "text": "Sumatera Selatan", "aliases": ["sumsel", "sumatra selatan"], "tier": "camp" },
    { "id": "babel", "text": "Kepulauan Bangka Belitung", "aliases": ["babel", "bangka belitung"], "tier": "treeline" },
    { "id": "bengkulu", "text": "Bengkulu", "aliases": [], "tier": "treeline" },
    { "id": "lampung", "text": "Lampung", "aliases": [], "tier": "camp" },
    { "id": "jakarta", "text": "DKI Jakarta", "aliases": ["jakarta", "dki", "daerah khusus ibukota jakarta", "daerah khusus jakarta", "dkj"], "tier": "basecamp" },
    { "id": "jabar", "text": "Jawa Barat", "aliases": ["jabar"], "tier": "basecamp" },
    { "id": "banten", "text": "Banten", "aliases": [], "tier": "camp" },
    { "id": "jateng", "text": "Jawa Tengah", "aliases": ["jateng"], "tier": "basecamp" },
    { "id": "diy", "text": "DI Yogyakarta", "aliases": ["yogyakarta", "jogja", "jogjakarta", "yogya", "jogya", "diy", "daerah istimewa yogyakarta"], "tier": "basecamp" },
    { "id": "jatim", "text": "Jawa Timur", "aliases": ["jatim"], "tier": "basecamp" },
    { "id": "bali", "text": "Bali", "aliases": [], "tier": "basecamp" },
    { "id": "ntb", "text": "Nusa Tenggara Barat", "aliases": ["ntb"], "tier": "camp" },
    { "id": "ntt", "text": "Nusa Tenggara Timur", "aliases": ["ntt"], "tier": "camp" },
    { "id": "kalbar", "text": "Kalimantan Barat", "aliases": ["kalbar"], "tier": "camp" },
    { "id": "kalteng", "text": "Kalimantan Tengah", "aliases": ["kalteng"], "tier": "treeline" },
    { "id": "kalsel", "text": "Kalimantan Selatan", "aliases": ["kalsel"], "tier": "treeline" },
    { "id": "kaltim", "text": "Kalimantan Timur", "aliases": ["kaltim"], "tier": "camp" },
    { "id": "kaltara", "text": "Kalimantan Utara", "aliases": ["kaltara"], "tier": "treeline" },
    { "id": "sulut", "text": "Sulawesi Utara", "aliases": ["sulut"], "tier": "camp" },
    { "id": "gorontalo", "text": "Gorontalo", "aliases": [], "tier": "treeline" },
    { "id": "sulteng", "text": "Sulawesi Tengah", "aliases": ["sulteng"], "tier": "treeline" },
    { "id": "sulbar", "text": "Sulawesi Barat", "aliases": ["sulbar"], "tier": "summit" },
    { "id": "sulsel", "text": "Sulawesi Selatan", "aliases": ["sulsel"], "tier": "camp" },
    { "id": "sultra", "text": "Sulawesi Tenggara", "aliases": ["sultra"], "tier": "treeline" },
    { "id": "maluku", "text": "Maluku", "aliases": [], "tier": "camp" },
    { "id": "malut", "text": "Maluku Utara", "aliases": ["malut"], "tier": "treeline" },
    { "id": "papua", "text": "Papua", "aliases": [], "tier": "basecamp" },
    { "id": "pabar", "text": "Papua Barat", "aliases": ["pabar"], "tier": "treeline" },
    { "id": "pbd", "text": "Papua Barat Daya", "aliases": ["pbd"], "tier": "edelweiss" },
    { "id": "pasel", "text": "Papua Selatan", "aliases": [], "tier": "summit" },
    { "id": "pateng", "text": "Papua Tengah", "aliases": [], "tier": "summit" },
    { "id": "papeg", "text": "Papua Pegunungan", "aliases": [], "tier": "summit" }
  ],
  "rejected": [
    { "text": "Irian Jaya", "aliases": ["irian"], "reason": "Nama lama yang dulu mencakup seluruh Papua. Sekarang sudah jadi 6 provinsi, coba sebut salah satunya!" },
    { "text": "Timor Timur", "aliases": ["timtim"], "reason": "Sejak 2002 sudah jadi negara sendiri, Timor-Leste." },
    { "text": "Jawa", "aliases": [], "reason": "Itu pulau. Di Jawa ada 6 provinsi." },
    { "text": "Sumatera", "aliases": ["sumatra"], "reason": "Itu pulau. Di Sumatera ada 10 provinsi." },
    { "text": "Kalimantan", "aliases": ["borneo"], "reason": "Itu pulau. Bagian Indonesianya ada 5 provinsi." },
    { "text": "Sulawesi", "aliases": ["celebes"], "reason": "Itu pulau. Di Sulawesi ada 6 provinsi." },
    { "text": "Nusa Tenggara", "aliases": [], "reason": "Dulu satu provinsi, sekarang jadi NTB dan NTT." },
    { "text": "IKN", "aliases": ["nusantara", "ibu kota nusantara"], "reason": "IKN itu ibu kota, bukan provinsi." }
  ],
  "edelweissFact": "Papua Barat Daya adalah provinsi ke-38, yang paling bungsu di Indonesia. Ibu kotanya Sorong.",
  "sources": ["[ISI: daftar provinsi resmi Kemendagri]", "[ISI: UU pembentukan Provinsi Papua Barat Daya]"],
  "status": "draft",
  "author": "[ISI]",
  "validAsOf": "2026-10-21"
}
```

> Status contoh ini masih `draft` karena sumbernya belum diisi. Begitu dua sumber resmi sudah dicek dan ada peninjau kedua, ubah ke `verified`.

### 2.3 Contoh singkat: soal terbuka

Cuplikan `content/prompts/kuliner-sambal-001.json` (daftar lengkapnya target 80+ jawaban):

```json
{
  "id": "kuliner-sambal-001",
  "prompt": "Sebutkan jenis sambal",
  "category": "kuliner",
  "difficulty": 2,
  "closedSet": false,
  "optionalPrefixes": ["sambal", "sambel"],
  "answers": [
    { "id": "terasi", "text": "Sambal Terasi", "aliases": ["terasi"], "tier": "basecamp" },
    { "id": "matah", "text": "Sambal Matah", "aliases": ["matah"], "tier": "basecamp" },
    { "id": "bawang", "text": "Sambal Bawang", "aliases": [], "tier": "basecamp" },
    { "id": "ijo", "text": "Sambal Ijo", "aliases": ["sambal hijau", "lado mudo", "sambal lado mudo"], "tier": "camp" },
    { "id": "dabu", "text": "Sambal Dabu-dabu", "aliases": ["dabu dabu", "dabudabu"], "tier": "camp" },
    { "id": "roa", "text": "Sambal Roa", "aliases": [], "tier": "treeline" },
    { "id": "tempoyak", "text": "Sambal Tempoyak", "aliases": [], "tier": "treeline" },
    { "id": "andaliman", "text": "Sambal Andaliman", "aliases": [], "tier": "summit" },
    { "id": "colo", "text": "Sambal Colo-colo", "aliases": ["colo colo"], "tier": "summit" },
    { "id": "luat", "text": "Sambal Luat", "aliases": ["se'i luat", "luat"], "tier": "edelweiss" }
  ],
  "rejected": [
    { "text": "Saus Tomat", "aliases": ["saos tomat"], "reason": "Saus tomat bukan sambal, sabar ya 😄" }
  ],
  "edelweissFact": "Sambal Luat berasal dari Timor, NTT. Dibuat dari cabai, jeruk nipis, dan daun kemangi, cocok dengan se'i.",
  "sources": ["[ISI]"],
  "status": "draft",
  "author": "[ISI]",
  "validAsOf": "2026-10-21"
}
```

> Alias `"se'i luat"` dan isi fakta Edelweiss di atas **wajib dicek dulu**. Ini contoh format, belum konten final.

---

## 3. Aturan teks, alias & typo

### 3.1 Yang sudah ditangani otomatis oleh sistem (tidak perlu ditulis sebagai alias)
- Huruf besar/kecil: `JAWA BARAT` = `jawa barat`
- Aksen/diakritik: `São Tomé` = `sao tome`
- Tanda baca & tanda hubung: `dabu-dabu` = `dabu dabu`. **Tapi** `dabudabu` (tanpa spasi) harus ditulis sebagai alias.
- Spasi berlebih
- Kata depan opsional dari `optionalPrefixes`: `sambal matah` = `matah`
- Typo kecil, dengan toleransi sesuai panjang kata (lihat [05-teknis.md](05-teknis.md))

### 3.2 Yang harus ditulis sebagai alias
- **Singkatan umum:** Jabar, NTT, Kepri, DIY
- **Ejaan alternatif:** Sumatra/Sumatera, Jogja/Yogya/Jogjakarta, sambel/sambal
- **Nama populer/lokal:** "Atap Jawa" untuk Semeru (kalau soalnya tentang gunung)
- **Ejaan lama**, kalau masih merujuk entitas yang sama: Djokjakarta → Yogyakarta
- **Salah eja yang umum** tapi melewati batas toleransi typo: "Jogya"

### 3.3 Kebijakan nama lama

| Kondisi | Keputusan | Contoh |
|---|---|---|
| Nama lama, **entitasnya sama persis** | ✅ Terima sebagai alias | Ujung Pandang → Makassar (soal kota) |
| Nama lama, **entitasnya sudah pecah/berubah** | ❌ Tolak dengan alasan | Irian Jaya (sekarang 6 provinsi) |
| **Sudah bukan bagian** dari kategori | ❌ Tolak dengan alasan | Timor Timur |
| Level geografi salah (pulau ≠ provinsi) | ❌ Tolak dengan alasan | Jawa, Kalimantan |

### 3.4 Aturan anti-tabrakan
- Satu alias **tidak boleh** dipakai oleh dua jawaban di soal yang sama. Validator akan gagal kalau ini terjadi.
- Alias tidak boleh sama dengan entri `rejected`.
- Hati-hati dengan nama yang mirip, misalnya "Papua Barat" dan "Papua Barat Daya". Sistem akan mencocokkan yang persis dulu sebelum mencoba toleransi typo.

---

## 4. Memilih tingkat manual

Sebelum ada data pemain, tingkat ditentukan editor. Pedomannya:

| Tingkat | Pertanyaan pedoman | Perkiraan porsi jawaban |
|---|---|---|
| 🥾 Basecamp | "Hampir semua orang langsung kepikiran ini" | ±25% |
| ⛺ Pos Camp | "Orang tahu, tapi bukan yang pertama disebut" | ±30% |
| 🌲 Batas Vegetasi | "Orang yang lumayan paham bakal kepikiran" | ±30% |
| 🏔️ Puncak | "Cuma yang benar-benar paham atau orang daerah situ" | ±15% |
| 🌼 Edelweiss | Satu jawaban per soal, lihat bagian 5 | 1 jawaban |

**Tips:** minta 3–5 teman menulis jawaban sebanyak-banyaknya dalam 60 detik tanpa melihat daftar. Jawaban yang muncul di hampir semua kertas = Basecamp. Jawaban yang tidak ada di kertas siapa pun = kandidat Puncak.

Setelah ada cukup data pemain, tingkat diperbarui otomatis (lihat [05-teknis.md](05-teknis.md) bagian Kelangkaan).

---

## 5. Memilih Edelweiss

Edelweiss itu jawaban rahasia yang paling bernilai. Syaratnya:

1. **Benar tanpa keraguan.** Diverifikasi minimal **2 sumber independen**.
2. **Bisa diketik.** Ejaannya tidak terlalu rumit dan aliasnya lengkap.
3. **Bikin "oh iya!"** Langka, tapi begitu disebut, orang merasa harusnya bisa kepikiran.
4. **Punya cerita.** Ada fakta menarik untuk ditulis di `edelweissFact`.
5. **Tidak berulang.** Hindari memakai daerah atau tema yang sama sebagai Edelweiss beberapa hari berturut-turut.

---

## 6. Alur produksi & cek fakta

```
draft ──► review ──► verified ──► (tampil di jadwal) ──► retired
  ▲          │
  └──────────┘ (dikembalikan kalau ada masalah)
```

| Tahap | Siapa | Yang dilakukan |
|---|---|---|
| **draft** | Penulis | Pilih soal, susun daftar jawaban, alias, rejected, tingkat manual, Edelweiss |
| **review** | Peninjau (orang kedua) | Cek tiap jawaban ke sumber, cek ejaan, cek alias tidak bertabrakan, uji 3 jawaban acak di build lokal |
| **verified** | Peninjau | Isi `verifiedBy`, ubah status. Hanya soal `verified` yang boleh masuk jadwal. |
| **retired** | Editor | Soal yang sudah basi atau bermasalah. Tidak dihapus, cuma tidak dijadwalkan lagi. |

### 6.1 Sumber yang dianjurkan
1. **Sumber resmi:** situs kementerian atau lembaga (Kemendagri, BPS, Kemensos untuk pahlawan nasional, Kemendikbud untuk budaya, taman nasional atau PVMBG untuk gunung)
2. **Ensiklopedia & buku referensi**
3. **Wikipedia** sebagai titik awal, tapi wajib dicocokkan ke sumber lain, terutama untuk jawaban Puncak dan Edelweiss

### 6.2 Kalau pakai AI untuk draf
AI sangat membantu untuk menyusun draf daftar jawaban yang panjang, tapi:
- **AI sering mengarang jawaban yang langka**, padahal justru itu jenis jawaban yang paling penting (Puncak dan Edelweiss). Semua jawaban langka wajib dicek manual.
- Jangan pernah langsung memasukkan hasil AI dengan status `verified`.

Contoh prompt draf:

```
Buat daftar jenis sambal dari seluruh Indonesia, sebanyak mungkin (target 100).
Untuk tiap item tulis: nama baku, nama lain/singkatan, daerah asal,
dan seberapa terkenal (1 = semua orang tahu, 5 = hanya orang daerah itu).
Tandai item yang kamu kurang yakin kebenarannya.
Format: tabel.
```

---

## 7. Antrean tinjauan jawaban yang ditolak

Mulai fase 2, semua jawaban "tidak dikenal" dicatat. Seminggu sekali editor membuka **20 jawaban tidak dikenal terbanyak per soal**, lalu memutuskan:

| Keputusan | Tindakan |
|---|---|
| Ternyata benar | Tambah ke `answers`. Tingkat awal `summit` sampai ada data. |
| Variasi penulisan jawaban yang sudah ada | Tambah ke `aliases` |
| Salah tapi sering diketik | Tambah ke `rejected` dengan alasan yang ramah |
| Typo acak / iseng | Abaikan |

Pemain juga bisa menekan **"Usulkan jawaban ini"** di layar ungkap. Usulan tersebut masuk ke antrean yang sama dengan penanda prioritas.

---

## 8. Pedoman kepekaan

- **Langka ≠ kurang penting.** Teks UI selalu merayakan jawaban langka ("Wih, jarang yang tahu!") dan tidak pernah merendahkan ("Daerah terpencil").
- **Sebaran daerah.** Dalam satu minggu jadwal harian, Edelweiss sebaiknya tersebar dari berbagai pulau, jangan didominasi Jawa.
- **Hindari:** agama sebagai kategori soal, suku sebagai bahan lelucon, partai/tokoh politik aktif, bencana dan tragedi, isu sensitif yang lagi hangat.
- **Merek dagang:** boleh disebut sebagai jawaban (misalnya merek mie instan), tapi hindari soal yang terkesan promosi atau bisa basi karena merek tutup.
- **Tokoh hidup:** boleh selama netral (atlet, musisi). Hindari tokoh yang sedang tersangkut kontroversi.

---

## 9. Bank soal & jadwal

### 9.1 Target jumlah
| Kapan | Target soal `verified` |
|---|---|
| Fase 0 (uji konten) | 30 |
| Hari rilis | **120** (cukup untuk ±17 hari) |
| Hari ke-30 setelah rilis | **210** |
| Produksi rutin | ≥ 25 soal/minggu |

**Aturan pengulangan:** satu soal boleh muncul lagi di Muncak Harian minimal **30 hari** setelah terakhir tampil. Kelangkaannya biasanya sudah bergeser, dan pemain lama pun tetap tertantang mencari jawaban yang lebih langka.

### 9.2 Komposisi 7 soal harian
| Slot | Isi | Kesulitan |
|---|---|---|
| 1 | Pemanasan, kategori bebas | 1 |
| 2 | Nusantara | 1–2 |
| 3 | Global | 2 |
| 4 | Kuliner / Alam | 2–3 |
| 5 | Pop / Bola / Sains | 3 |
| 6 | Nusantara / Sejarah | 3–4 |
| 7 | Penutup tersulit, kategori bebas | 4–5 |

Jadwal disusun per bulan di `content/schedule/YYYY-MM.json` dengan skrip pembantu (lihat [05-teknis.md](05-teknis.md)).

### 9.3 Ide bank soal awal

**Nusantara: geografi**
- Sebutkan provinsi di Indonesia *(tertutup)*
- Sebutkan gunung di Indonesia
- Sebutkan danau di Indonesia
- Sebutkan pulau di Indonesia
- Sebutkan sungai di Indonesia
- Sebutkan taman nasional di Indonesia
- Sebutkan kabupaten/kota di Jawa Barat *(tertutup)*

**Nusantara: budaya**
- Sebutkan tarian daerah
- Sebutkan lagu daerah
- Sebutkan alat musik tradisional
- Sebutkan rumah adat
- Sebutkan senjata tradisional
- Sebutkan suku di Indonesia
- Sebutkan bahasa daerah
- Sebutkan motif batik
- Sebutkan permainan tradisional

**Kuliner**
- Sebutkan jenis sambal
- Sebutkan jajanan pasar
- Sebutkan jenis soto
- Sebutkan jenis sate
- Sebutkan minuman tradisional Indonesia
- Sebutkan jenis kerupuk
- Sebutkan buah tropis
- Sebutkan bumbu dapur & rempah

**Sejarah**
- Sebutkan pahlawan nasional
- Sebutkan kerajaan di Nusantara
- Sebutkan candi di Indonesia
- Sebutkan tokoh pergerakan nasional

**Alam**
- Sebutkan hewan khas Indonesia
- Sebutkan jenis burung di Indonesia
- Sebutkan jenis ikan laut konsumsi
- Sebutkan bunga

**Pop & bola**
- Sebutkan film Indonesia
- Sebutkan band Indonesia
- Sebutkan acara TV anak 90-an/2000-an
- Sebutkan pemain bulu tangkis Indonesia
- Sebutkan pemain timnas sepak bola Indonesia (sepanjang masa)
- Sebutkan pemenang Ballon d'Or *(tertutup)*

**Global**
- Sebutkan negara di Afrika *(tertutup)*
- Sebutkan negara di Amerika Selatan *(tertutup, cuma 12, jadi cocoknya buat soal pemanasan)*
- Sebutkan ibu kota negara Eropa *(tertutup)*
- Sebutkan mata uang dunia
- Sebutkan cabang olahraga Olimpiade
- Sebutkan ras kucing
- Sebutkan ras anjing
- Sebutkan jenis keju
- Sebutkan bahasa di dunia

**Sains & teknologi**
- Sebutkan unsur kimia *(tertutup)*
- Sebutkan bulan (satelit alami) di tata surya
- Sebutkan dinosaurus
- Sebutkan bahasa pemrograman
- Sebutkan ilmuwan terkenal
- Sebutkan organ tubuh manusia
- Sebutkan rasi bintang *(tertutup, 88)*

**Sehari-hari (hati-hati, batasnya sering kabur)**
- Sebutkan profesi/pekerjaan
- Sebutkan benda di dapur
- Sebutkan alat transportasi

> Catatan: "negara di Amerika Selatan" melanggar syarat minimal 30 jawaban. Boleh dipakai sesekali sebagai soal pemanasan slot 1, tapi jangan jadi kebiasaan.

---

## 10. Bank soal Ekspedisi & Paket Tema

Ekspedisi dan Paket Tema bisa dimainkan kapan saja, jadi soalnya harus dikirim ke browser lebih dulu. Supaya tidak membocorkan Muncak Harian, soal untuk dua mode ini **terpisah** dari soal Harian:

- Tandai soalnya dengan `"pool": "bank"`. Validator menolak soal `bank` di jadwal Harian dan soal `daily` di Paket Tema.
- Ekspedisi memakai **semua** soal `bank` berstatus `verified`, diacak.
- Satu Paket Tema = satu file `content/packs/<id>.json`:

```json
{
  "id": "kuliner",
  "title": "Kuliner",
  "description": "Sambal, soto, kerupuk, dan teman-temannya.",
  "prompts": ["kuliner-sambal-101", "kuliner-soto-101", "…7 id soal bank…"]
}
```

| Field | Keterangan |
|---|---|
| `id` | Slug, sama dengan nama file |
| `title` | Maks. 40 karakter |
| `description` | Maks. 140 karakter |
| `prompts` | Tepat 7 id soal `bank` berstatus `verified`, tidak boleh dobel |
| `season` | Opsional, `{ "from": "08-01", "to": "08-31" }` (MM-DD, WIB, boleh melewati akhir tahun seperti `12-15` s/d `01-05`). Di luar musimnya paket tidak tampil. |

Paket awal yang direncanakan: Nusantara, Global, Bola, Kuliner, Musik & Film, Sains & Teknologi, Sejarah. Paket musiman: 17 Agustus, Ramadan, Akhir Tahun. Tanggal Ramadan berubah tiap tahun, jadi `season`-nya harus diperbarui tiap tahun.

