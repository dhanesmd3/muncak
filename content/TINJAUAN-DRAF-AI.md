# Tinjauan draf soal buatan AI (28 soal, 2026-10-28)

28 soal di `content/prompts/` dengan `"author": "Draf AI (Claude), wajib ditinjau"` dibuat AI sebagai **draf**. Semuanya berstatus `draft`. Status `verified` hanya boleh diisi peninjau manusia sesuai [docs/03-konten-soal.md](../docs/03-konten-soal.md) §6.

Ingat peringatan §6.2: **AI paling sering salah justru di jawaban langka** (Puncak dan Edelweiss). File ini menandai bagian yang paling perlu dicek.

## Yang sudah dicek otomatis

- `npm run validate:content` lulus tanpa error: tidak ada alias yang bertabrakan dan tiap soal punya tepat 1 Edelweiss.
- Semua URL di `sources` sudah dicek (HTTP 200, 28 Oktober 2026).
- Fakta Edelweiss dicocokkan dengan teks halaman sumbernya. Satu yang belum terkonfirmasi: **Sarabba** (halaman Wikipedia-nya rintisan dan tidak menyebut jahe).
- Pencocokan sudah diuji dengan contoh ketikan pemain: typo, singkatan, ejaan Inggris, dan kata depan opsional.

## Yang wajib dikerjakan peninjau untuk tiap soal

1. Cek setiap jawaban **Puncak** dan **Edelweiss** ke 2 sumber independen (§5, §6.1).
2. Kalibrasi tingkat dengan tes 60 detik bersama 3–5 orang (§4). **Tingkat di draf ini hanya perkiraan AI.**
3. Isi `author` dengan nama penulis/peninjau dan `verifiedBy`, lalu tambah sumber kedua di `sources`.

## Catatan per soal

| Soal | Perlu dicek / diputuskan |
|---|---|
| `pop-penyanyipria-001` | Kurang yakin: Darso, Thomas Arya, Deddy Dores, Iwan Abdulrachman, Pance Pondaag, Obbie Messakh, Hedi Yunus, Ihsan Tarore, Dikta. "Hindia" adalah nama proyek solo Baskara Putra. **Sengaja tidak dimasukkan** (§8 tokoh politik/kontroversi): Rhoma Irama, Anang Hermansyah, Anji, Virgoun, Tri Suaka. |
| `pop-penyanyiwanita-001` | **Krisdayanti sedang menjabat anggota DPR**: putuskan tetap atau hapus (§8). Mulan Jameela sengaja tidak dimasukkan. Kurang yakin dengan tingkat: Ermy Kullit, Rita Effendy, Iga Mawarni, Trie Utami (vokalis Krakatau, juga solo). |
| `pop-band-001` | NOAH menerima alias "peterpan" (nama lama, entitas sama, sesuai §3.3). Cek: Utopia, Ten2Five, Potret, Elpamas, Lomba Sihir, The Sigit. SM*SH dan JKT48 ditolak karena bukan band. |
| `nusantara-tarian-001` | Kurang yakin: Lego-Lego (Alor), Sigeh Pengunten & Bedana (Lampung), Hudoq/Gantar/Mandau (Dayak), Gending Sriwijaya sebagai tari, asal Poco-Poco. |
| `nusantara-lagudaerah-001` | **Asal daerah perlu dicek**: Lalan Belek (Bengkulu?), Yo Miak (Bangka?), Peia Tawa-Tawa (Sultra?), Tenggang Tenggang Lopi (Sulbar?), Huhatee & Ayo Mama (Maluku?), Lipang Lipangdang (Lampung?), Indung-Indung (Kaltim?). "Naik-Naik ke Puncak Gunung" dan "Ondel-Ondel" sering diperdebatkan sebagai lagu daerah. |
| `nusantara-alatmusik-001` | Kurang yakin: Doli-Doli (Nias), Garantung, Dol (Bengkulu), Ganrang & Keso-Keso (Sulsel), Foy Doa (Ngada), Tehyan, Panting, Tahuri. |
| `nusantara-pulau-001` | Papua menerima alias "nugini/new guinea" karena itu pulau yang sama. Cek nama: Untung Jawa, Kabaena, Peleng, Siau, Maratua, Taliabu. |
| `nusantara-danau-001` | **Situ Cileunca kemungkinan danau buatan**: pindahkan ke `rejected` kalau benar. Kurang yakin: Kaco, Dendam Tak Sudah, Linow, Moat, Sidihoni, Aneuk Laot, Lido, Kakaban. Ejaan Diatas/Dibawah. |
| `nusantara-gunung-001` | Kurang yakin: Abang (Bali), Lamongan, Butak, Puncak Mandala. Marapi (Sumbar) dan Merapi (Jateng/DIY) sengaja dua jawaban terpisah. |
| `nusantara-permainan-001` | **Hanya 27 jawaban** (target ≥ 50). Tambah dari daftar daerah. |
| `kuliner-soto-001` | **Hanya 29 jawaban** (target ≥ 50). Kurang yakin: Soto Kuning (Bogor), Soto Garing (Blora), Soto Kemiri (Pati), Soto Bathok, Soto Kadipiro. Rawon, sop buntut, dan bakso ditolak. |
| `kuliner-jajananpasar-001` | Kurang yakin: Rangi, Grontol, Jongkong, Pepe, Sengkulun, Sawut, Gandos, Barongko, Lapek. Rengginang, bakpia, dan sosis solo masuk "jajanan pasar"? |
| `kuliner-minuman-001` | **Hanya 33 jawaban** (target ≥ 50). **Minuman beralkohol (tuak, arak, sopi, ballo) sengaja tidak dimasukkan** (§8). Cek: Air Guraka (Ternate), Es Oyen, Lahang, Es Pala. **Fakta Edelweiss Sarabba belum terkonfirmasi sumber.** |
| `sejarah-kerajaan-001` | Jawaban "mataram" diarahkan ke Mataram Islam; Mataram Kuno diterima sebagai jawaban terpisah. Kurang yakin: Kanjuruhan, Lamuri, Jenggala, Selaparang, Paser, Mempawah. Salakanagara sengaja tidak dimasukkan (keberadaannya diperdebatkan). |
| `sejarah-candi-001` | Ratu Boko lebih tepat disebut situs/keraton, bukan candi: putuskan. Cek: Candi Asu, Kedaton (Muaro Jambi), Pari, Belahan, Gunung Kawi (candi tebing). |
| `sejarah-pahlawan-001` | **Setiap nama wajib dicocokkan ke daftar resmi Kemensos (SK Presiden).** Daftar ini belum lengkap, jadi `closedSet` sengaja `false`. **Sengaja tidak dimasukkan**: tokoh yang baru diusulkan atau baru ditetapkan, dan tokoh yang dekat dengan politik masa kini. Cek SK terbaru 2024–2026 lalu putuskan. |
| `alam-hewanendemik-001` | **Hanya 29 jawaban**. Kata "endemik" dipakai supaya bisa dicek fakta. Orangutan (tanpa keterangan), cendrawasih, bekantan, tapir, dan kasuari ditolak dengan alasan. Cek: Musang Sulawesi, Elang Flores, Kuskus Beruang, Celepuk Rinjani, Babi Kutil, Kakatua Seram, Cendrawasih Merah/Botak. |
| `bola-bulutangkis-001` | Cek ejaan nama dan tingkat pemain muda. |
| `bola-ballondor-001` | **Pastikan pemenang 2025 (Ousmane Dembélé) dan tambahkan pemenang 2026 kalau sudah diumumkan**, karena soal tertutup harus lengkap. George Weah juga mantan presiden Liberia (§8). "luis suarez" diterima karena Luis Suárez Miramontes (Spanyol) menang tahun 1960. |
| `global-negaraafrika-001` | 54 negara anggota PBB. Somaliland dan Sahara Barat sengaja tidak dimasukkan (status politik). |
| `global-ibukotaeropa-001` | **Keputusan batas Eropa perlu disetujui**: Moskow, Nikosia, Tbilisi, Yerevan, dan Baku diterima. Ankara ditolak karena ada di bagian Asia. Pristina (Kosovo) sengaja tidak dimasukkan (status politik). |
| `global-matauang-001` | Jawaban berupa **nama mata uang**, bukan "mata uang negara X", jadi "dolar" dihitung satu jawaban. |
| `global-olimpiade-001` | Mencakup cabang yang pernah ada (Musim Panas & Dingin), termasuk cabang lama seperti kriket, polo, kroket, dan tarik tambang. |
| `sains-unsurkimia-001` | Cek ejaan nama Indonesia unsur superberat: Tenesin, Oganeson, Moskovium, Kopernisium, Lawrensium. |
| `sains-bulan-001` | Daftar bulan tidak lengkap (ratusan). Pertimbangkan membatasi soal ke bulan yang bernama terkenal. |
| `sains-dinosaurus-001` | Archaeopteryx diterima sebagai dinosaurus (garis burung): putuskan. Reptil terbang & laut ditolak dengan alasan. |
| `sains-bahasapemrograman-001` | **Batasan teknis:** "C++", "C#", "F#" diketik dengan simbol jadi "c"/"f" setelah normalisasi, sehingga dianggap terlalu pendek. Pemain harus mengetik "c plus plus" / "c sharp". Kalau mau diterima, `normalize.ts` perlu aturan khusus (dengan unit test dan pembaruan dokumen). |
| `global-raskucing-001` | Anggora dipetakan ke Turkish Angora (sebutan umum di Indonesia). |

## Komposisi

28 soal baru + 2 draf lama (provinsi, sambal) = **30 soal**, target Fase 0 ([docs/06-roadmap.md](../docs/06-roadmap.md)). Campurannya: lokal 17 (pop, nusantara, kuliner, sejarah, alam, bulu tangkis) dan global 11.

Hapus file ini setelah semua soal selesai ditinjau.
