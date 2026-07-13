// Resume scanning & job-description matching.
// Scoring is fully deterministic (see utils/analysis.js) — fast, free, and
// consistent. AI augments only the optional bullet rewrites in job matching.

import express from 'express';
import Joi from 'joi';
import mongoose from 'mongoose';
import authMiddleware from '../middleware/authMiddleware.js';
import Resume from '../models/Resume.js';
import ScanResult from '../models/ScanResult.js';
import User from '../models/User.js';
import { analyzeResume } from '../utils/analysis.js';
import { matchResumeToJob } from '../utils/jobMatch.js';
import { validateBody, resumeDataSchema } from '../utils/validate.js';
import { aiAvailable, chatJSON, truncate } from '../services/ai.js';
import { resumeToText, extractBullets, countWords } from '../utils/text.js';

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
  // Optional structured metadata — present when the JD came from a live feed
  // job (via "Full match report"), enabling location/remote/salary sub-scores.
  jobLocation: Joi.string().allow('').max(300).default(''),
  jobRemote: Joi.string().valid('remote', 'hybrid', 'onsite', 'unknown', '').default(''),
  jobSalaryMin: Joi.number().allow(null).default(null),
  jobSalaryMax: Joi.number().allow(null).default(null),
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

    const user = await User.findById(userId).select('jobPreferences');
    const prefs = user?.jobPreferences?.toObject ? user.jobPreferences.toObject() : (user?.jobPreferences || {});
    const jobMeta = {
      location: req.body.jobLocation || '',
      remote: req.body.jobRemote || undefined,
      salaryMin: req.body.jobSalaryMin,
      salaryMax: req.body.jobSalaryMax,
    };

    const result = matchResumeToJob(data || {}, req.body.jobDescription, req.body.jobTitle, jobMeta, prefs);

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
            language: data.language || 'en',
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

// ---------------------------------------------------------------------------
// ATS Parsing Preview & Recruiter First-Impression — shows exactly what an
// automated parser extracts (plain text, section by section) and what a
// recruiter sees in their first ~6 seconds, plus concrete formatting risks.
// Fully deterministic — no AI call, so it's instant and free.
// ---------------------------------------------------------------------------

const atsPreviewSchema = Joi.object({
  resumeId: Joi.string().hex().length(24).optional(),
  data: resumeDataSchema.optional(),
}).or('resumeId', 'data');

router.post('/ats-preview', validateBody(atsPreviewSchema), async (req, res) => {
  const userId = req.user.userId;
  try {
    let data = req.body.data;
    if (req.body.resumeId) {
      if (!isValidId(req.body.resumeId)) return res.status(400).json({ message: 'Invalid resume id' });
      const resume = await Resume.findOne({ _id: req.body.resumeId, userId });
      if (!resume) return res.status(404).json({ message: 'Resume not found' });
      data = resume.data;
    }
    data = data || {};

    // What a parser sees, section by section (mirrors resumeToText but keeps
    // section boundaries visible for the UI instead of one flat block).
    const sections = [];
    if (data.fullName) sections.push({ label: 'Name', text: data.fullName });
    const contact = [data.email, data.phone, data.city, data.linkedIn].filter(Boolean).join('  |  ');
    if (contact) sections.push({ label: 'Contact', text: contact });
    if (data.summary) sections.push({ label: 'Summary', text: data.summary });
    for (const e of data.experience || []) {
      sections.push({
        label: 'Experience',
        text: [`${e.role || ''} — ${e.company || ''} (${e.from || '?'} – ${e.to || '?'})`, e.description || '']
          .filter(Boolean)
          .join('\n'),
      });
    }
    for (const e of data.education || []) {
      sections.push({
        label: 'Education',
        text: [`${e.degree || ''}, ${e.school || ''} (${e.from || '?'} – ${e.to || '?'})`, e.achievements || '']
          .filter(Boolean)
          .join('\n'),
      });
    }
    if ((data.skills || []).length) sections.push({ label: 'Skills', text: data.skills.filter(Boolean).join(', ') });

    // Formatting risks an ATS parser (or a human skimming quickly) would hit.
    const flags = [];
    if (!data.email?.trim()) flags.push({ severity: 'high', message: 'No email found — many ATS reject resumes without one.' });
    if (!data.phone?.trim()) flags.push({ severity: 'medium', message: 'No phone number found.' });
    const emojiCount = (resumeToText(data).match(/[\u{1F300}-\u{1FAFF}]/gu) || []).length;
    if (emojiCount > 0) flags.push({ severity: 'high', message: `${emojiCount} emoji/symbol character(s) found — these often render as garbage or get dropped by ATS parsers.` });
    const noDate = (data.experience || []).filter((e) => !e.from?.trim()).length;
    if (noDate > 0) flags.push({ severity: 'medium', message: `${noDate} role(s) missing a start date — parsers may misorder or drop them.` });
    const longParagraphs = (data.experience || []).filter(
      (e) => e.description && !e.description.includes('\n') && countWords(e.description) > 40
    ).length;
    if (longParagraphs > 0) flags.push({ severity: 'low', message: `${longParagraphs} role(s) use a paragraph instead of bullets — bullets parse and scan more reliably.` });
    if (!(data.skills || []).filter(Boolean).length) flags.push({ severity: 'high', message: 'No dedicated skills section — most ATS keyword filters rely on it existing.' });

    // Recruiter's first ~6 seconds: name, most recent role, top bullets, top skills.
    const bullets = extractBullets(data);
    const recruiterFirstImpression = {
      name: data.fullName || '(missing)',
      headline: data.title || data.experience?.[0]?.role || '(no title/role set)',
      mostRecentRole: data.experience?.[0]
        ? `${data.experience[0].role || ''} @ ${data.experience[0].company || ''}`
        : null,
      topBullets: bullets.slice(0, 3),
      topSkills: (data.skills || []).filter(Boolean).slice(0, 6),
    };

    res.json({ sections, flags, recruiterFirstImpression, plainText: resumeToText(data) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
