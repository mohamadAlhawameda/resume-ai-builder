// Follow-up / interview / networking reminders. "Due" is a read-time
// computation (dueDate <= now, still pending) — no queue infrastructure.
// A daily in-process sweep additionally raises Notifications for newly-due
// reminders (services/scheduledChecks.js).

import express from 'express';
import Joi from 'joi';
import mongoose from 'mongoose';
import authMiddleware from '../middleware/authMiddleware.js';
import { validateBody } from '../utils/validate.js';
import Reminder from '../models/Reminder.js';

const router = express.Router();
router.use(authMiddleware);

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const reminderSchema = Joi.object({
  type: Joi.string().valid('follow-up', 'interview', 'networking', 'other').default('follow-up'),
  title: Joi.string().trim().min(1).max(300).required(),
  dueDate: Joi.date().required(),
  relatedContactId: Joi.string().hex().length(24).allow(null).default(null),
  relatedJobId: Joi.string().allow('').max(200).default(''),
});

const reminderUpdateSchema = Joi.object({
  type: Joi.string().valid('follow-up', 'interview', 'networking', 'other'),
  title: Joi.string().trim().min(1).max(300),
  dueDate: Joi.date(),
  status: Joi.string().valid('pending', 'done', 'dismissed'),
  relatedContactId: Joi.string().hex().length(24).allow(null),
  relatedJobId: Joi.string().allow('').max(200),
}).min(1);

// GET /reminders?status=pending — list, soonest-due first
router.get('/', async (req, res) => {
  try {
    const filter = { userId: req.user.userId };
    if (req.query.status) filter.status = req.query.status;
    const reminders = await Reminder.find(filter).sort({ dueDate: 1 });
    res.json(reminders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /reminders/due — pending reminders due now or overdue, plus the next
// few upcoming ones; powers the dashboard's "upcoming tasks" widget in one
// request.
router.get('/due', async (req, res) => {
  try {
    const now = new Date();
    const [due, upcoming] = await Promise.all([
      Reminder.find({ userId: req.user.userId, status: 'pending', dueDate: { $lte: now } }).sort({ dueDate: 1 }),
      Reminder.find({ userId: req.user.userId, status: 'pending', dueDate: { $gt: now } })
        .sort({ dueDate: 1 })
        .limit(5),
    ]);
    res.json({ due, upcoming });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /reminders
router.post('/', validateBody(reminderSchema), async (req, res) => {
  try {
    const reminder = await Reminder.create({ ...req.body, userId: req.user.userId });
    res.status(201).json(reminder);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /reminders/:id — edit, mark done, dismiss
router.patch('/:id', validateBody(reminderUpdateSchema), async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ message: 'Invalid id' });
  try {
    const reminder = await Reminder.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      req.body,
      { new: true }
    );
    if (!reminder) return res.status(404).json({ message: 'Reminder not found' });
    res.json(reminder);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /reminders/:id
router.delete('/:id', async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ message: 'Invalid id' });
  try {
    const deleted = await Reminder.findOneAndDelete({ _id: req.params.id, userId: req.user.userId });
    if (!deleted) return res.status(404).json({ message: 'Reminder not found' });
    res.json({ message: 'Removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
