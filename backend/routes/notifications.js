import express from 'express';
import mongoose from 'mongoose';
import authMiddleware from '../middleware/authMiddleware.js';
import Notification from '../models/Notification.js';

const router = express.Router();
router.use(authMiddleware);

// GET /notifications — latest 30 with unread count
router.get('/', async (req, res) => {
  try {
    const [items, unread] = await Promise.all([
      Notification.find({ userId: req.user.userId }).sort({ createdAt: -1 }).limit(30),
      Notification.countDocuments({ userId: req.user.userId, read: false }),
    ]);
    res.json({ items, unread });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /notifications/read — mark all (or one) read
router.post('/read', async (req, res) => {
  try {
    const { id } = req.body || {};
    const filter = { userId: req.user.userId, read: false };
    if (id) {
      if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: 'Invalid id' });
      filter._id = id;
    }
    await Notification.updateMany(filter, { read: true });
    res.json({ message: 'Marked read' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
