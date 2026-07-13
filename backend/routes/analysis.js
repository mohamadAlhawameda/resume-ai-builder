// Resume scanning & job-description matching.
// Scoring is fully deterministic (see utils/analysis.js) — fast, free, and
// consistent. AI augments only the optional bullet rewrites in job matching.

import express from 'express';
import Joi from 'joi';
import mongoose from 'mongoose';
import authMiddleware from '../middleware/authMiddleware.js';
import Resume from '../models/Resume.js';
import ScanResult from '../models/ScanResult.js';
import { analyzeResume } from '../utils/analysis.js';
import { matchResumeToJob } from '../utils/jobMatch.js';
import { validateBody, resumeDataSchema } from '../utils/validate.js';
import { aiAvailable, chatJSON, truncate } from '../services/ai.js';

const router = express.Router();
router.use(authMiddleware);

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const scanSchema = Joi.object({
  resumeId: Joi.string().hex().length(24).optional(),
  data: resumeDataSchema.optional(),
}).or('resumeId', 'data');

// POST /analysis/scan — full resume scan with 9 category scores
router.post('/scan', validateBody(scanSchema), async (req, res) => {
  const userId = req.user.userId;
  try {
    let data = req.body.data;
    let resumeId = req.body.resumeId || null;

    if (resumeId) {
      if (!isValidId(resumeId)) return res.status(400).json({ message: 'Invalid resume id' });
      const resume = await Resume.findOne({ _id: resumeId, userId });
      if (!resume) return res.status(404).json({ message: 'Resume not found' });
      data = resume.data;
    }

    const result = analyzeResume(data || {});

    const saved = await ScanResult.create({
      userId,
      resumeId,
      type: 'scan',
      overall: result.overall,
      categories: result.categories,
      strengths: result.strengths,
      topFixes: result.topFixes,
    });

    if (resumeId) {
      await Resume.updateOne(
        { _id: resumeId, userId },
        { lastScore: result.overall, lastScannedAt: new Date() }
      );
    }

    res.json({ ...result, _id: saved._id, resumeId, createdAt: saved.createdAt });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

const jobMatchSchema = Joi.object({
  resumeId: Joi.string().hex().length(24).optional(),
  data: resumeDataSchema.optional(),
  jobDescription: Joi.string().min(60).max(20000).required().messages({
    'string.min': 'Please paste the full job description (at least a few sentences).',
  }),
  jobTitle: Joi.string().allow('').max(200).default(''),
  useAI: Joi.boolean().default(true),
}).or('resumeId', 'data');

// POST /analysis/job-match — compare a resume against a pasted job posting
router.post('/job-match', validateBody(jobMatchSchema), async (req, res) => {
  const userId = req.user.userId;
  try {
    let data = req.body.data;
    const resumeId = req.body.resumeId || null;

    if (resumeId) {
      if (!isValidId(resumeId)) return res.status(400).json({ message: 'Invalid resume id' });
      const resume = await Resume.findOne({ _id: resumeId, userId });
      if (!resume) return res.status(404).json({ message: 'Resume not found' });
      data = resume.data;
    }

    const result = matchResumeToJob(data || {}, req.body.jobDescription, req.body.jobTitle);

    // Optional AI pass: rewrite the user's real bullets toward this job.
    if (req.body.useAI && aiAvailable()) {
      try {
        const bullets = (data.experience || [])
          .flatMap((e) => (e.description || '').split('\n'))
          .map((b) => b.trim().replace(/^[-•*]\s*/, ''))
          .filter((b) => b.length > 15)
          .slice(0, 6);

        if (bullets.length > 0) {
          const ai = await chatJSON({
            system:
              'You are an expert resume coach. Rewrite resume bullets to better match a job description WITHOUT inventing experience the candidate does not have. Keep each rewrite to one line, start with a strong action verb, keep any real metrics, and naturally include relevant terminology from the job description only where plausible. Return JSON: {"rewrites":[{"original":"...","improved":"...","reason":"..."}]}',
            user: `Job title: ${truncate(req.body.jobTitle, 200)}\n\nJob description:\n${truncate(req.body.jobDescription, 3500)}\n\nResume bullets:\n${bullets.map((b) => `- ${b}`).join('\n')}`,
            maxTokens: 900,
          });
          if (Array.isArray(ai.rewrites) && ai.rewrites.length > 0) {
            result.bulletRewrites = ai.rewrites
              .filter((r) => r && r.original && r.improved)
              .slice(0, 6);
          }
        }
      } catch (aiErr) {
        console.warn('AI bullet rewrite failed, using deterministic output:', aiErr.message);
      }
    }

    const saved = await ScanResult.create({
      userId,
      resumeId,
      type: 'job-match',
      jobTitle: result.jobTitle,
      matchPercent: result.matchPercent,
      missingKeywords: result.missingKeywords,
      missingSkills: result.missingSkills,
    });

    res.json({ ...result, _id: saved._id, aiUsed: req.body.useAI && aiAvailable(), createdAt: saved.createdAt });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /analysis/history — scan + match history for progress tracking
router.get('/history', async (req, res) => {
  const userId = req.user.userId;
  try {
    const items = await ScanResult.find({ userId })
      .select('type overall matchPercent jobTitle resumeId createdAt')
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /analysis/history/:id — full stored result
router.get('/history/:id', async (req, res) => {
  const userId = req.user.userId;
  if (!isValidId(req.params.id)) return res.status(400).json({ message: 'Invalid id' });
  try {
    const item = await ScanResult.findOne({ _id: req.params.id, userId });
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
