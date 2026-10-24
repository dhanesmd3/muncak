// "Kabut Pagi" palette (docs/04-art-ui.md §3). Mirrors src/styles/tokens.css.
export const PALETTE = {
  malam: '#1B1F3B',
  lembah: '#2E3A5C',
  langit: '#4A6FA5',
  kabut: '#8FB8DE',
  awan: '#E8F1F2',
  mentari: '#F4D58D',
  senja: '#F29E4C',
  carrier: '#D1495B',
  merahTua: '#8C2F39',
  hutan: '#2D6A4F',
  daun: '#52B788',
  lumut: '#95D5B2',
  tanah: '#6B4F3A',
  batu: '#A68A64',
  abu: '#9AA0A6',
  edelweiss: '#FFF3B0',
} as const;

/** One character per palette color, used by the string sprites. '.' is transparent. */
export const PIXEL_KEY: Record<string, string> = {
  K: PALETTE.malam,
  L: PALETTE.lembah,
  S: PALETTE.langit,
  F: PALETTE.kabut,
  W: PALETTE.awan,
  Y: PALETTE.mentari,
  O: PALETTE.senja,
  R: PALETTE.carrier,
  D: PALETTE.merahTua,
  H: PALETTE.hutan,
  G: PALETTE.daun,
  M: PALETTE.lumut,
  T: PALETTE.tanah,
  B: PALETTE.batu,
  A: PALETTE.abu,
  E: PALETTE.edelweiss,
};
