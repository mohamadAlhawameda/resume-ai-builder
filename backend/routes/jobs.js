// Job discovery: recommendations scored against the user's resume and
// preferences, saved-job tracking, and strong-match alert generation.

import express from 'express';
import Joi from 'joi';
import mongoose from 'mongoose';
import authMiddleware from '../middleware/authMiddleware.js';
import User from '../models/User.js';
import Resume from '../models/Resume.js';
import SavedJob from '../models/SavedJob.js';
import Notification from '../models/Notification.js';
import { fetchAllJobs, usingSampleData } from '../providers/jobs/index.js';
import { scoreJobForUser } from '../utils/jobMatch.js';
import { validateBody, jobPreferencesSchema } from '../utils/validate.js';
import { sendJobAlertEmail, sendApplicationStatusEmail } from '../services/email.js';

const router = express.Router();
router.use(authMiddleware);

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

async function getContext(userId, resumeId) {
  const user = await User.findById(userId);
  let resume = null;
  if (resumeId && isValidId(resumeId)) {
    resume = await Resume.findOne({ _id: resumeId, userId });
  }
  if (!resume) {
    resume = await Resume.findOne({ userId }).sort({ updatedAt: -1 });
  }
  return { user, resumeData: resume?.data || {}, resumeId: resume?._id || null };
}

// Create alert notifications for strong matches the user hasn't been told about.
async function generateAlerts(user, scoredJobs) {
  const prefs = user.jobPreferences || {};
  if (!prefs.alertsEnabled) return;
  const threshold = prefs.alertThreshold ?? 75;
  const strong = scoredJobs.filter((j) => j.match.percent >= threshold).slice(0, 5);
  if (strong.length === 0) return;

  const existing = await Notification.find({
    userId: user._id,
    type: 'job-match',
    'meta.jobId': { $in: strong.map((j) => j.id) },
  }).select('meta.jobId');
  const alreadyNotified = new Set(existing.map((n) => n.meta?.jobId));

  for (const job of strong) {
    if (alreadyNotified.has(job.id)) continue;
    await Notification.create({
      userId: user._id,
      type: 'job-match',
      title: `${job.match.percent}% match: ${job.title}`,
      body: `${job.company} — ${job.location}. ${job.match.reasons[0] || ''}`,
      meta: { jobId: job.id, matchPercent: job.match.percent },
    });
    if (prefs.emailAlerts) {
      await sendJobAlertEmail(user, job, job.match.percent).catch(() => {});
    }
  }
}

// GET /jobs/recommended?resumeId=...&limit=...
router.get('/recommended', async (req, res) => {
  try {
    const { user, resumeData, resumeId } = await getContext(req.user.userId, req.query.resumeId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const jobs = await fetchAllJobs();
    const prefs = user.jobPreferences?.toObject ? user.jobPreferences.toObject() : (user.jobPreferences || {});

    const scored = jobs
      .map((job) => ({ ...job, match: scoreJobForUser(job, resumeData, prefs) }))
      .sort((a, b) => b.match.percent - a.match.percent);

    await generateAlerts(user, scored).catch((e) => console.warn('Alert generation failed:', e.message));

    // Live feeds can return thousands of postings; send only the best matches
    // to keep the payload sane (descriptions alone are up to 6 KB each).
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 150, 1), 300);

    res.json({
      jobs: scored.slice(0, limit),
      totalMatched: scored.length,
      resumeId,
      sampleData: usingSampleData(),
      preferences: prefs,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /jobs/preferences
router.get('/preferences', async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('jobPreferences targetRole industry');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({
      preferences: user.jobPreferences || {},
      targetRole: user.targetRole || '',
      industry: user.industry || '',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /jobs/preferences
router.put('/preferences', validateBody(jobPreferencesSchema), async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { jobPreferences: req.body },
      { new: true }
    ).select('jobPreferences');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ preferences: user.jobPreferences });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

const saveJobSchema = Joi.object({
  job: Joi.object({
    id: Joi.string().max(200).required(),
    provider: Joi.string().max(60).required(),
    title: Joi.string().max(300).required(),
    company: Joi.string().max(300).required(),
    location: Joi.string().allow('').max(300).default(''),
    remote: Joi.string().valid('remote', 'hybrid', 'onsite', 'unknown').default('unknown'),
    workType: Joi.string().allow('').max(60).default(''),
    salaryMin: Joi.number().allow(null).default(null),
    salaryMax: Joi.number().allow(null).default(null),
    url: Joi.string().allow('').max(2000).default(''),
    description: Joi.string().allow('').max(20000).default(''),
    skills: Joi.array().items(Joi.string().max(120)).max(30).default([]),
    countries: Joi.array().items(Joi.string().length(2)).max(5).default([]),
    regions: Joi.array().items(Joi.string().max(60)).max(20).default([]),
    postedAt: Joi.string().allow('', null).default(null),
    isSampleData: Joi.boolean().default(false),
  }).required(),
  matchPercent: Joi.number().min(0).max(100).allow(null).default(null),
});

// POST /jobs/save
router.post('/save', validateBody(saveJobSchema), async (req, res) => {
  try {
    const { job, matchPercent } = req.body;
    const saved = await SavedJob.findOneAndUpdate(
      { userId: req.user.userId, jobId: job.id },
      { $setOnInsert: { job, status: 'saved' }, $set: { matchPercent } },
      { new: true, upsert: true }
    );
    res.status(201).json(saved);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /jobs/saved
router.get('/saved', async (req, res) => {
  try {
    const items = await SavedJob.find({ userId: req.user.userId }).sort({ updatedAt: -1 });
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

const statusSchema = Joi.object({
  status: Joi.string().valid('saved', 'applied', 'interviewing', 'offer', 'rejected').required(),
  notes: Joi.string().allow('').max(2000).optional(),
});

// PATCH /jobs/saved/:id — update application status / notes
router.patch('/saved/:id', validateBody(statusSchema), async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ message: 'Invalid id' });
  try {
    const update = { status: req.body.status };
    if (req.body.notes !== undefined) update.notes = req.body.notes;
    if (req.body.status === 'applied') update.appliedAt = new Date();

    const saved = await SavedJob.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      update,
      { new: true }
    );
    if (!saved) return res.status(404).json({ message: 'Saved job not found' });

    // Milestone emails (applied / interviewing / offer) with next-step tips —
    // only for users who opted into email in their job preferences.
    if (['applied', 'interviewing', 'offer'].includes(req.body.status)) {
      User.findById(req.user.userId)
        .then((user) => {
          if (user?.jobPreferences?.emailAlerts) {
            return sendApplicationStatusEmail(user, saved, req.body.status);
          }
        })
        .catch(() => {});
    }

    res.json(saved);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /jobs/saved/:id
router.delete('/saved/:id', async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ message: 'Invalid id' });
  try {
    const deleted = await SavedJob.findOneAndDelete({ _id: req.params.id, userId: req.user.userId });
    if (!deleted) return res.status(404).json({ message: 'Saved job not found' });
    res.json({ message: 'Removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
