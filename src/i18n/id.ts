// Every player-facing string, in Indonesian. Address the player as "kamu".
import type { Outcome } from '../game/types';

/** 4884 → "4.884" (Indonesian thousands separator). */
export function formatNumber(n: number): string {
  const sign = n < 0 ? '-' : '';
  return sign + String(Math.abs(Math.round(n))).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export const tierEmoji: Record<Outcome, string> = {
  basecamp: '🥾',
  camp: '⛺',
  treeline: '🌲',
  summit: '🏔️',
  edelweiss: '🌼',
  fog: '🌫️',
};

export const tierName: Record<Outcome, string> = {
  basecamp: 'Basecamp',
  camp: 'Pos Camp',
  treeline: 'Batas Vegetasi',
  summit: 'Puncak',
  edelweiss: 'Edelweiss',
  fog: 'Kabut',
};

export const tierMeaning: Record<Outcome, string> = {
  basecamp: 'Jawaban paling umum',
  camp: 'Umum, tapi bukan yang pertama kepikiran',
  treeline: 'Jarang',
  summit: 'Sangat jarang',
  edelweiss: '1 jawaban rahasia per soal',
  fog: 'Waktu habis',
};

export const tierMessage: Record<Outcome, string> = {
  basecamp: 'Aman! Semua orang juga kepikiran ini.',
  camp: 'Lumayan, mulai naik nih.',
  treeline: 'Mantap, ini mulai jarang!',
  summit: 'Wih, jarang yang tahu!',
  edelweiss: 'Edelweiss! Cukup difoto, jangan dipetik 🌼',
  fog: 'Kabut turun! Istirahat dulu, lanjut soal berikutnya.',
};

export const t = {
  appName: 'Muncak',
  tagline: 'Makin langka, makin tinggi.',
  mdpl: (n: number) => `${formatNumber(n)} mdpl`,
  back: 'Kembali',
  storageWarning: 'Progres tidak tersimpan',

  home: {
    playDaily: 'Muncak Harian',
    dailyMeta: (day: number, rounds: number) => `#${day} · ${rounds} soal`,
    continue: 'Lanjutkan',
    seeResult: 'Lihat hasil',
    alreadyPlayed: 'Kamu sudah muncak hari ini. Sampai jumpa besok pagi!',
    streak: (n: number) => `🔥 Streak ${n} hari`,
    stats: 'Statistik',
    settings: 'Pengaturan',
    help: 'Cara Main',
    about: 'Tentang',
    loading: 'Memuat soal…',
    preparing: 'Soal hari ini sedang disiapkan, coba lagi sebentar.',
    loadError: 'Soal gagal dimuat. Cek koneksi kamu, nanti dicoba lagi otomatis.',
    retry: 'Coba lagi',
  },

  onboarding: {
    skip: 'Lewati',
    next: 'Lanjut',
    start: 'Mulai muncak',
    slides: [
      {
        title: 'Sebutkan sesuatu. Semua jawaban benar diterima.',
        body: 'Contoh: "Sebutkan jenis sambal". Terasi? Diterima. Roa? Diterima juga!',
      },
      {
        title: 'Makin langka, makin tinggi.',
        body: 'Jawaban yang jarang kepikiran orang lain dapat poin lebih besar.',
      },
      {
        title: 'Tiap hari 7 soal. Daki sampai Cartenz!',
        body: 'Poin kamu jadi ketinggian. Tiap soal ada 25 detik, jawaban salah memotong 2 detik.',
      },
    ],
  },

  round: {
    counter: (i: number, n: number) => `Soal ${i}/${n}`,
    inputLabel: 'Jawaban kamu',
    placeholder: 'ketik jawaban…',
    submit: 'Daki',
    secondsLeft: (s: number) => `Sisa ${s} detik`,
    timer: (s: number) => `00:${String(s).padStart(2, '0')}`,
    unknown: 'Belum ada di daftar kami. Coba yang lain?',
    tooShort: 'Terlalu pendek. Ketik jawaban yang lebih lengkap, ya.',
    duplicate: 'Yang ini sudah kamu coba tadi.',
    penalty: (s: number) => `−${s} dtk`,
  },

  reveal: {
    yourAnswer: 'Jawaban kamu',
    points: (n: number) => `+${n}`,
    mostCommon: 'Paling banyak dijawab',
    rareMissed: 'Jawaban langka yang terlewat',
    edelweiss: 'Edelweiss',
    edelweissFound: 'Kamu menemukan Edelweiss!',
    checkpoint: 'Lewat checkpoint',
    next: 'Lanjut',
    finish: 'Lihat hasil',
    report: 'Laporkan soal',
    fogTitle: 'Kabut turun! 🌫️',
  },

  result: {
    share: 'Bagikan ke WA',
    copy: 'Salin hasil',
    copied: 'Hasil disalin!',
    copyFailed: 'Gagal menyalin. Coba salin manual, ya.',
    stats: 'Statistik',
    home: 'Beranda',
    nextIn: (time: string) => `Soal baru dalam ${time}`,
    newReady: 'Soal baru sudah siap!',
    shareTitle: (day: number) => `Muncak #${day} 🏔️`,
  },

  stats: {
    title: 'Statistik',
    played: 'Hari dimainkan',
    streak: 'Streak saat ini',
    bestStreak: 'Streak terbaik',
    average: 'Rata-rata ketinggian',
    best: 'Ketinggian tertinggi',
    distribution: 'Distribusi tingkat',
    album: 'Koleksi gunung',
    edelweiss: 'Koleksi Edelweiss',
    days: (n: number) => `${n} hari`,
    unknownMountain: 'Belum dicapai',
    empty: 'Belum ada catatan. Ayo muncak dulu!',
  },

  settings: {
    title: 'Pengaturan',
    sound: 'Suara',
    music: 'Musik latar',
    vibrate: 'Getar',
    reducedMotion: 'Kurangi animasi',
    highContrast: 'Kontras tinggi',
    on: 'Nyala',
    off: 'Mati',
    privacy: 'Kebijakan Privasi',
    deleteData: 'Hapus data saya',
    deleteConfirm:
      'Hapus semua progres, statistik, dan pengaturan di perangkat ini? Ini tidak bisa dibatalkan.',
    deleted: 'Data kamu sudah dihapus.',
  },

  about: {
    title: 'Tentang',
    body: 'Muncak adalah game tebak-tebakan harian. Tiap hari 7 soal "Sebutkan ___". Makin langka jawabanmu, makin tinggi kamu mendaki. Gratis, tanpa iklan, tanpa akun.',
    gratis: 'Tidak ada fitur yang dikunci dan tidak ada iklan.',
    fontsTitle: 'Kredit',
    fonts:
      'Font Press Start 2P © 2012 The Press Start 2P Project Authors dan Pixelify Sans © 2021 The Pixelify Sans Project Authors, keduanya dengan SIL Open Font License 1.1.',
    inspiration:
      'Terinspirasi dari mekanik "jawaban langka" pada game trivia harian. Muncak tidak berafiliasi dengan game lain mana pun.',
    privacy: 'Kebijakan Privasi',
    contact: 'Kontak',
    donate: 'Dukung Muncak (sukarela)',
  },

  privacy: {
    title: 'Kebijakan Privasi Muncak',
    updated: (date: string) => `Terakhir diperbarui: ${date}`,
    intro:
      'Muncak adalah game gratis tanpa akun. Kami berusaha mengumpulkan data sesedikit mungkin.',
    sections: [
      {
        heading: 'Yang disimpan di HP kamu',
        body: 'Progres permainan, statistik, dan pengaturan disimpan di browser kamu sendiri. Kami tidak bisa melihatnya. Kamu bisa menghapusnya kapan saja lewat Pengaturan → Hapus data saya.',
      },
      {
        heading: 'Yang kami terima',
        body: 'Saat ini Muncak tidak mengirim data permainan kamu ke server kami. Statistik kunjungan dicatat tanpa cookie dan tanpa identitas melalui Cloudflare Web Analytics.',
      },
      {
        heading: 'Yang tidak pernah kami kumpulkan',
        body: 'Nama asli, email, nomor HP, lokasi, kontak, atau data untuk iklan. Muncak tidak memasang iklan dan tidak menjual data.',
      },
      {
        heading: 'Pihak lain',
        body: 'Muncak di-host di Cloudflare. Cloudflare memproses alamat IP untuk mengirim halaman ke perangkatmu, sesuai kebijakan privasi Cloudflare.',
      },
      {
        heading: 'Untuk pemain di bawah 18 tahun',
        body: 'Muncak tidak meminta data pribadi. Orang tua/wali yang punya pertanyaan bisa menghubungi kami.',
      },
    ],
    contact: 'Kontak',
    contactMissing: '[ISI email]',
    footer: 'Kebijakan ini bisa berubah. Perubahan penting akan kami umumkan di dalam game.',
  },
} as const;
