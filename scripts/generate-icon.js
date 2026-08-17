// Generates a valid 1024x1024 solid accent PNG icon (no external deps).
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const W = 1024;
const H = 1024;

// Simple CRC32 for PNG chunks
function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      table[n] = c >>> 0;
    }
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

// RGB scanlines with filter byte 0 per row
const raw = Buffer.alloc(H * (1 + W * 3));
for (let y = 0; y < H; y++) {
  const rowStart = y * (1 + W * 3);
  raw[rowStart] = 0; // filter none
  for (let x = 0; x < W; x++) {
    const p = rowStart + 1 + x * 3;
    // vertical gradient from deep navy to accent blue
    const t = y / H;
    const r = Math.round(11 + (14 - 11) * t);
    const g = Math.round(18 + (165 - 18) * t);
    const b = Math.round(32 + (233 - 32) * t);
    raw[p] = r;
    raw[p + 1] = g;
    raw[p + 2] = b;
  }
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 2; // color type RGB
ihdr[10] = 0;
ihdr[11] = 0;
ihdr[12] = 0;

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw)),
  chunk('IEND', Buffer.alloc(0)),
]);

const dir = path.join(__dirname, '..', 'assets');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'icon.png'), png);
fs.writeFileSync(path.join(dir, 'splash-icon.png'), png);
console.log('Generated assets/icon.png and assets/splash-icon.png');