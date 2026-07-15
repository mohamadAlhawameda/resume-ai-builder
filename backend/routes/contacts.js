// Recruiter / networking contacts — fully user-entered CRM records. No
// lookup, enrichment, or scraping happens anywhere: every field is exactly
// what the user typed. See models/Contact.js for the data shape.

import express from 'express';
import Joi from 'joi';
import mongoose from 'mongoose';
import authMiddleware from '../middleware/authMiddleware.js';
import { validateBody } from '../utils/validate.js';
import Contact from '../models/Contact.js';

const router = express.Router();
router.use(authMiddleware);

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const contactSchema = Joi.object({
  name: Joi.string().trim().min(1).max(200).required(),
  role: Joi.string().allow('').trim().max(200).default(''),
  company: Joi.string().allow('').trim().max(300).default(''),
  email: Joi.string().allow('').trim().email({ tlds: false }).max(320).default(''),
  linkedinUrl: Joi.string().allow('').trim().uri({ scheme: ['http', 'https'] }).max(500).default(''),
  careerPageUrl: Joi.string().allow('').trim().uri({ scheme: ['http', 'https'] }).max(500).default(''),
  notes: Joi.string().allow('').max(2000).default(''),
  contacted: Joi.boolean().default(false),
  lastContactDate: Joi.date().allow(null).default(null),
  relatedJobId: Joi.string().allow('').max(200).default(''),
});

// Same shape but everything optional — PATCH sends only changed fields.
const contactUpdateSchema = Joi.object({
  name: Joi.string().trim().min(1).max(200),
  role: Joi.string().allow('').trim().max(200),
  company: Joi.string().allow('').trim().max(300),
  email: Joi.string().allow('').trim().email({ tlds: false }).max(320),
  linkedinUrl: Joi.string().allow('').trim().uri({ scheme: ['http', 'https'] }).max(500),
  careerPageUrl: Joi.string().allow('').trim().uri({ scheme: ['http', 'https'] }).max(500),
  notes: Joi.string().allow('').max(2000),
  contacted: Joi.boolean(),
  lastContactDate: Joi.date().allow(null),
  relatedJobId: Joi.string().allow('').max(200),
}).min(1);

const activitySchema = Joi.object({
  type: Joi.string()
    .valid('connection-request-sent', 'message-sent', 'call', 'reply-received', 'meeting', 'other')
    .default('other'),
  note: Joi.string().allow('').max(1000).default(''),
  date: Joi.date().default(() => new Date()),
});

// GET /contacts?company=...  — list, newest-updated first
router.get('/', async (req, res) => {
  try {
    const filter = { userId: req.user.userId };
    if (req.query.company) filter.company = req.query.company;
    const contacts = await Contact.find(filter).sort({ updatedAt: -1 });
    res.json(contacts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /contacts
router.post('/', validateBody(contactSchema), async (req, res) => {
  try {
    const contact = await Contact.create({ ...req.body, userId: req.user.userId });
    res.status(201).json(contact);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /contacts/:id
router.patch('/:id', validateBody(contactUpdateSchema), async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ message: 'Invalid id' });
  try {
    const contact = await Contact.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      req.body,
      { new: true }
    );
    if (!contact) return res.status(404).json({ message: 'Contact not found' });
    res.json(contact);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /contacts/:id
router.delete('/:id', async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ message: 'Invalid id' });
  try {
    const deleted = await Contact.findOneAndDelete({ _id: req.params.id, userId: req.user.userId });
    if (!deleted) return res.status(404).json({ message: 'Contact not found' });
    res.json({ message: 'Removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /contacts/:id/activity — append a conversation-log entry. Also flips
// `contacted` and advances `lastContactDate` for outbound touches, so the
// list view stays truthful without a second request.
router.post('/:id/activity', validateBody(activitySchema), async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ message: 'Invalid id' });
  try {
    const outbound = ['connection-request-sent', 'message-sent', 'call', 'meeting'].includes(req.body.type);
    const update = { $push: { activity: req.body } };
    if (outbound) {
      update.$set = { contacted: true, lastContactDate: req.body.date };
    }
    const contact = await Contact.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      update,
      { new: true }
    );
    if (!contact) return res.status(404).json({ message: 'Contact not found' });
    res.json(contact);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /contacts/:id/activity/:activityId — remove a log entry
router.delete('/:id/activity/:activityId', async (req, res) => {
  if (!isValidId(req.params.id) || !isValidId(req.params.activityId)) {
    return res.status(400).json({ message: 'Invalid id' });
  }
  try {
    const contact = await Contact.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      { $pull: { activity: { _id: req.params.activityId } } },
      { new: true }
    );
    if (!contact) return res.status(404).json({ message: 'Contact not found' });
    res.json(contact);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
