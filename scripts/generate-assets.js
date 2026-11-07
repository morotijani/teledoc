const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Standard CRC32 table
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c >>> 0;
}

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcInput = Buffer.concat([typeBuf, data]);
  const crcVal = crc32(crcInput);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal, 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function createPng(width, height, isForeground = false) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8 bits per channel
  ihdrData[9] = 6; // RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdr = makeChunk('IHDR', ihdrData);

  // Raw image data: filter byte (0) + width * 4 bytes per row
  const rowSize = 1 + width * 4;
  const raw = Buffer.alloc(rowSize * height);

  // Background: Emerald green #059669 (5, 150, 105, 255)
  // Cross: White #ffffff (255, 255, 255, 255)
  const bgR = isForeground ? 5 : 5;
  const bgG = isForeground ? 150 : 150;
  const bgB = isForeground ? 105 : 105;
  const bgA = 255;

  const crossHalfThickness = Math.floor(width * 0.08);
  const crossHalfLen = Math.floor(width * 0.28);
  const cx = Math.floor(width / 2);
  const cy = Math.floor(height / 2);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    raw[rowOffset] = 0; // filter None
    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const dx = Math.abs(x - cx);
      const dy = Math.abs(y - cy);

      // Medical Cross shape
      const inCross = (dx <= crossHalfThickness && dy <= crossHalfLen) ||
                      (dy <= crossHalfThickness && dx <= crossHalfLen);

      if (inCross) {
        raw[pxOffset] = 255;     // R
        raw[pxOffset + 1] = 255; // G
        raw[pxOffset + 2] = 255; // B
        raw[pxOffset + 3] = 255; // A
      } else {
        raw[pxOffset] = bgR;
        raw[pxOffset + 1] = bgG;
        raw[pxOffset + 2] = bgB;
        raw[pxOffset + 3] = bgA;
      }
    }
  }

  const idat = makeChunk('IDAT', zlib.deflateSync(raw));
  const iend = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdr, idat, iend]);
}

const assetsDir = path.join(__dirname, '..', 'mobile', 'assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// 1. icon.png (512x512)
fs.writeFileSync(path.join(assetsDir, 'icon.png'), createPng(512, 512));
console.log('Created icon.png');

// 2. splash-icon.png (512x512)
fs.writeFileSync(path.join(assetsDir, 'splash-icon.png'), createPng(512, 512));
console.log('Created splash-icon.png');

// 3. adaptive-icon.png (512x512)
fs.writeFileSync(path.join(assetsDir, 'adaptive-icon.png'), createPng(512, 512, true));
console.log('Created adaptive-icon.png');

// 4. favicon.png (64x64)
fs.writeFileSync(path.join(assetsDir, 'favicon.png'), createPng(64, 64));
console.log('Created favicon.png');
