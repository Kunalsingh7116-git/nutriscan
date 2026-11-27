const express = require('express');
const { createHash, randomUUID } = require('node:crypto');
const auth = require('../middleware/auth');
const MealPhoto = require('../models/MealPhoto');
const { event, limit } = require('../security');
const { resourceId } = require('../input');
const { inspectPhoto } = require('../imageInput');
const { withUserWrite } = require('../transactions');

const router = express.Router();
const maxPhotoMb = process.env.VERCEL ? 4 : 10;
const maxBytes = maxPhotoMb * 1024 * 1024;
const uploadLimit = limit('photo.upload', { ip: 120, account: 30, seconds: 86400 });
const storageLimit = 300;

function sendPhotoId(res, photo) {
  return res.status(201).json({ id: photo.public_id || photo._id });
}

router.post('/', auth, uploadLimit, express.raw({ type: 'application/octet-stream', limit: maxBytes, inflate: false }), async (req, res) => {
  const mime = inspectPhoto(req.body);
  if (!mime) return res.status(400).json({ message: 'Choose a valid JPEG, PNG, WebP, or HEIF photo.' });
  const userId = req.user.userId;
  const filter = { user_id: userId, digest: createHash('sha256').update(req.body).digest('hex') };
  try {
    const photo = await withUserWrite(userId, async session => {
      const existing = await MealPhoto.findOne(filter).select('public_id').session(session).lean();
      if (existing) return existing;
      if (await MealPhoto.countDocuments({ user_id: userId }).session(session) >= storageLimit) {
        throw Object.assign(new Error('Storage limit'), { status: 409 });
      }
      const record = new MealPhoto({ ...filter, public_id: randomUUID(), mime, data: req.body });
      return record.save({ session });
    });
    return sendPhotoId(res, photo);
  } catch (error) {
    if (error.status === 401) return res.sendStatus(401);
    if (error.status === 409) return res.status(409).json({ message: 'Your account has reached its photo storage limit.' });
    if (error.code === 11000) {
      const existing = await MealPhoto.findOne(filter).select('public_id').lean().catch(() => null);
      if (existing) return sendPhotoId(res, existing);
    }
    event('photo.write_failed');
    return res.status(500).json({ message: 'Couldn’t save the original photo. Try again.' });
  }
});

router.get('/:id', auth, async (req, res) => {
  const photoId = resourceId(req.params.id);
  if (!photoId) return res.sendStatus(404);
  try {
    const photo = await MealPhoto.findOne({ ...photoId, user_id: req.user.userId }).select('data mime');
    if (!photo) return res.sendStatus(404);
    res.set({ 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' });
    if (photo.data.length > maxBytes) {
      return res.status(413).json({ message: 'This photo exceeds the server’s download limit.' });
    }
    return res.type(photo.mime).send(Buffer.from(photo.data));
  } catch {
    event('photo.read_failed');
    return res.sendStatus(500);
  }
});

router.use((error, req, res, next) => {
  if (error.type === 'entity.too.large') return res.status(413).json({ message: `Choose a photo that is ${maxPhotoMb} MB or smaller.` });
  next(error);
});

module.exports = router;
