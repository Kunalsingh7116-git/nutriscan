const { imageSize } = require('image-size');

const maxPixels = 64_000_000;
const mimeTypes = {
  jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', heic: 'image/heic', heif: 'image/heif',
};

function inspectPhoto(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 24) return null;
  const brand = bytes.toString('ascii', 8, 12);
  const isoImage = bytes.toString('ascii', 4, 8) === 'ftyp';
  const png = bytes.subarray(0, 8).toString('hex') === '89504e470d0a1a0a';
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const webp = bytes.toString('ascii', 0, 4) === 'RIFF' && brand === 'WEBP';
  if (!png && !jpeg && !webp && !(isoImage && /^(heic|heix|hevc|hevx|mif1|msf1)$/.test(brand))) return null;

  try {
    const { width, height, type } = imageSize(bytes);
    const isComplete = (!jpeg || bytes.subarray(-2).toString('hex') === 'ffd9')
      && (!png || bytes.subarray(-12).toString('hex') === '0000000049454e44ae426082')
      && (!webp || bytes.readUInt32LE(4) + 8 === bytes.length);
    if (!isComplete || !width || !height || width * height > maxPixels) return null;
    return isoImage ? (/^(mif1|msf1)$/.test(brand) ? 'image/heif' : 'image/heic') : mimeTypes[type] || null;
  } catch {
    return null;
  }
}

module.exports = { inspectPhoto };
