const express = require('express');
const { createHash } = require('node:crypto');
const auth = require('../middleware/auth');
const MealPhoto = require('../models/MealPhoto');

const router = express.Router();
const maxPhotoMb = process.env.VERCEL ? 4 : 10;
const maxBytes = maxPhotoMb * 1024 * 1024;

function imageType(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 12) return null;
  if (bytes.subarray(0, 3).toString('hex') === 'ffd8ff') return 'image/jpeg';
  if (bytes.subarray(0, 8).toString('hex') === '89504e470d0a1a0a') return 'image/png';
  if (bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  if (bytes.toString('ascii', 4, 8) === 'ftyp') {
    const brand = bytes.toString('ascii', 8, 12);
    if (['heic', 'heix', 'hevc', 'hevx'].includes(brand)) return 'image/heic';
    if (['mif1', 'msf1'].includes(brand)) return 'image/heif';
  }
  return null;
}

router.post('/', auth, express.raw({ type: 'application/octet-stream', limit: maxBytes, inflate: false }), async (req, res) => {
  const mime = imageType(req.body);
  if (!mime) return res.status(400).json({ message: 'Choose a JPEG, PNG, WebP, or HEIF photo.' });
  const filter = { user_id: req.user.userId, digest: createHash('sha256').update(req.body).digest('hex') };
  try {
    await MealPhoto.updateOne(filter, { $setOnInsert: { mime, data: req.body } }, { upsert: true });
    const photo = await MealPhoto.findOne(filter).select('_id').lean();
    res.status(201).json({ id: photo._id });
  } catch (error) {
    if (error.code === 11000) {
      const existing = await MealPhoto.findOne(filter).select('_id').lean().catch(() => null);
      if (existing) return res.status(201).json({ id: existing._id });
    }
    console.error('Could not store meal photo:', error.name);
    res.status(500).json({ message: 'Couldn’t save the original photo. Try again.' });
  }
});

router.get('/:id', auth, async (req, res) => {
  if (!/^[a-f0-9]{24}$/i.test(req.params.id)) return res.sendStatus(404);
  try {
    const photo = await MealPhoto.findOne({ _id: req.params.id, user_id: req.user.userId });
    if (!photo) return res.sendStatus(404);
    res.set({ 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' });
    if (photo.data.length > maxBytes) {
      return res.status(413).json({ message: 'This photo exceeds the server’s download limit.' });
    }
    res.type(photo.mime).send(Buffer.from(photo.data));
  } catch (error) {
    console.error('Could not read meal photo:', error.name);
    res.sendStatus(500);
  }
});

router.use((error, req, res, next) => {
  if (error.type === 'entity.too.large') return res.status(413).json({ message: `Choose a photo that is ${maxPhotoMb} MB or smaller.` });
  next(error);
});

module.exports = router;
