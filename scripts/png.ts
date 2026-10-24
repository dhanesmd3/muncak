// Minimal RGBA PNG encoder + pixel canvas for the string sprites (node only, no deps).
import { deflateSync } from 'node:zlib';
import { PIXEL_KEY } from '../src/scene/palette';
import type { Sprite } from '../src/scene/sprites';

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  Buffer.from(data).copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

export function encodePng(width: number, height: number, rgba: Uint8Array): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    Buffer.from(rgba.buffer, rgba.byteOffset + y * width * 4, width * 4).copy(
      raw,
      y * (width * 4 + 1) + 1,
    );
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', new Uint8Array(0)),
  ]);
}

const hex = (h: string): [number, number, number] => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];

/** A logical-pixel canvas that is scaled up by an integer factor when encoded. */
export class PixelCanvas {
  readonly px: (string | null)[];
  constructor(
    readonly width: number,
    readonly height: number,
    fill: string | null = null,
  ) {
    this.px = new Array<string | null>(width * height).fill(fill);
  }
  set(x: number, y: number, color: string): void {
    if (x >= 0 && y >= 0 && x < this.width && y < this.height) this.px[y * this.width + x] = color;
  }
  rect(x: number, y: number, w: number, h: number, color: string): void {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, color);
  }
  sprite(s: Sprite, x: number, y: number): void {
    s.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        const c = PIXEL_KEY[row[i]!];
        if (c) this.set(x + i, y + j, c);
      }
    });
  }
  png(scale: number): Buffer {
    const W = this.width * scale;
    const H = this.height * scale;
    const out = new Uint8Array(W * H * 4);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const c = this.px[Math.floor(y / scale) * this.width + Math.floor(x / scale)];
        if (!c) continue;
        const [r, g, b] = hex(c);
        const o = (y * W + x) * 4;
        out[o] = r;
        out[o + 1] = g;
        out[o + 2] = b;
        out[o + 3] = 255;
      }
    }
    return encodePng(W, H, out);
  }
}
