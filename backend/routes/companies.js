// Company Intelligence: everything the app can honestly say about a company,
// assembled from data we already have — live postings from the official ATS
// feeds (the same cache /jobs uses), the user's own saved contacts, and their
// own application history. No scraping, no third-party enrichment.
//
// The AI brief (POST /:name/brief) is separate and rate-limited: it is
// grounded ONLY in the posting data we pass it and is explicitly instructed
// not to assert outside facts — the frontend labels it as AI-generated.

import express from 'express';
import Joi from 'joi';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import authMiddleware from '../middleware/authMiddleware.js';
import { validateBody } from '../utils/validate.js';
import Contact from '../models/Contact.js';
import SavedJob from '../models/SavedJob.js';
import WatchlistCompany from '../models/WatchlistCompany.js';
import User from '../models/User.js';
import Resume from '../models/Resume.js';
import CareerProfile from '../models/CareerProfile.js';
import { fetchAllJobs } from '../providers/jobs/index.js';
import { buildMatchContext, scoreJobForUser } from '../utils/jobMatch.js';
import { aiAvailable, chatJSON, truncate } from '../services/ai.js';

const router = express.Router();
router.use(authMiddleware);

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// AI calls cost money — same per-user limiter pattern as routes/generate.js.
const aiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 15,
  keyGenerator: (req) => req.user?.userId || req.ip,
  message: { message: 'AI request limit reached — please wait a few minutes and try again.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Resume-or-Digital-Twin scoring context, same fallback logic as routes/jobs.js.
async function getMatchContext(userId) {
  const user = await User.findById(userId);
  if (!user) return null;
  const resume = await Resume.findOne({ userId }).sort({ updatedAt: -1 });
  let resumeData = resume?.data || {};
  if (!(resumeData.experience?.length || resumeData.skills?.length)) {
    const profile = await CareerProfile.findOne({ userId });
    if (profile && (profile.experience?.length || profile.skills?.length)) {
      resumeData = {
        summary: profile.careerGoals || '',
        experience: profile.experience || [],
        education: profile.education || [],
        skills: (profile.skills || []).map((s) => s.name),
      };
    }
  }
  const hasProfile = (resumeData.experience?.length || 0) > 0 || (resumeData.skills?.length || 0) > 0;
  if (!hasProfile) return { user, ctx: null };
  const prefs = user.jobPreferences?.toObject ? user.jobPreferences.toObject() : (user.jobPreferences || {});
  return { user, ctx: buildMatchContext(resumeData, prefs) };
}

function companyJobs(jobs, name) {
  const lower = name.toLowerCase();
  return jobs.filter((j) => (j.company || '').toLowerCase() === lower);
}

// ---------------------------------------------------------------------------
// Watchlist
// ---------------------------------------------------------------------------

const watchlistSchema = Joi.object({
  companyName: Joi.string().trim().min(1).max(300).required(),
});

// GET /companies/watchlist
router.get('/watchlist', async (req, res) => {
  try {
    const items = await WatchlistCompany.find({ userId: req.user.userId }).sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /companies/watchlist — idempotent (watching twice is a no-op)
router.post('/watchlist', validateBody(watchlistSchema), async (req, res) => {
  try {
    const item = await WatchlistCompany.findOneAndUpdate(
      { userId: req.user.userId, companyName: req.body.companyName },
      { $setOnInsert: { userId: req.user.userId, companyName: req.body.companyName } },
      { new: true, upsert: true }
    );
    res.status(201).json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /companies/watchlist/:id
router.delete('/watchlist/:id', async (req, res) => {
  if (!isValidId(req.params.id)) return res.status(400).json({ message: 'Invalid id' });
  try {
    const deleted = await WatchlistCompany.findOneAndDelete({ _id: req.params.id, userId: req.user.userId });
    if (!deleted) return res.status(404).json({ message: 'Not on your watchlist' });
    res.json({ message: 'Removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// Intelligence — deterministic, from data we already hold
// ---------------------------------------------------------------------------

// GET /companies/:name/intelligence
router.get('/:name/intelligence', async (req, res) => {
  try {
    const name = req.params.name;
    const userId = req.user.userId;

    const [jobs, contactsRaw, savedRaw, watch, matchInfo] = await Promise.all([
      fetchAllJobs(),
      Contact.find({ userId }).sort({ updatedAt: -1 }),
      SavedJob.find({ userId }).sort({ updatedAt: -1 }),
      WatchlistCompany.findOne({ userId, companyName: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }),
      getMatchContext(userId),
    ]);

    const lower = name.toLowerCase();
    const openJobs = companyJobs(jobs, name);
    const contacts = contactsRaw.filter((c) => (c.company || '').toLowerCase() === lower);
    const applications = savedRaw.filter((s) => (s.job?.company || '').toLowerCase() === lower);

    const scored = matchInfo?.ctx
      ? openJobs.map((j) => ({ ...j, match: scoreJobForUser(j, matchInfo.ctx) }))
      : openJobs.map((j) => ({ ...j, match: null }));
    scored.sort((a, b) => (b.match?.percent ?? 0) - (a.match?.percent ?? 0));

    // Hiring locations + skill frequency across this company's live postings.
    const locationSet = new Set();
    const skillFreq = new Map();
    for (const j of openJobs) {
      if (j.location) locationSet.add(j.location);
      for (const s of j.skills || []) {
        const key = s.toLowerCase();
        skillFreq.set(key, (skillFreq.get(key) || 0) + 1);
      }
    }
    const topSkills = [...skillFreq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([skill, count]) => ({ skill, count }));

    // Networking activity: flattened recent log entries across this
    // company's contacts.
    const networkingActivity = contacts
      .flatMap((c) => (c.activity || []).map((a) => ({ contactId: c._id, contactName: c.name, type: a.type, note: a.note, date: a.date })))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 20);

    res.json({
      company: openJobs[0]?.company || name,
      openRoles: scored.slice(0, 25).map(({ description: _omit, ...rest }) => rest),
      openRoleCount: openJobs.length,
      hiringLocations: [...locationSet].slice(0, 20),
      topSkills,
      contacts,
      networkingActivity,
      applications,
      watching: !!watch,
      watchlistId: watch?._id || null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// AI brief — optional, rate-limited, grounded only in supplied posting data
// ---------------------------------------------------------------------------

// POST /companies/:name/brief
router.post('/:name/brief', aiLimiter, async (req, res) => {
  try {
    const name = req.params.name;
    if (!aiAvailable()) {
      return res.json({ aiUsed: false, overview: '', interviewPrep: [], questionsToAsk: [] });
    }

    const jobs = companyJobs(await fetchAllJobs(), name);
    if (jobs.length === 0) {
      return res.json({ aiUsed: false, overview: '', interviewPrep: [], questionsToAsk: [] });
    }

    const postingsSummary = jobs
      .slice(0, 15)
      .map((j) => `- ${j.title} (${j.location || 'location n/a'}${j.remote && j.remote !== 'unknown' ? `, ${j.remote}` : ''})${j.skills?.length ? ` — skills: ${j.skills.slice(0, 8).join(', ')}` : ''}`)
      .join('\n');
    const sampleDescription = truncate(jobs[0].description || '', 2500);

    const out = await chatJSON({
      system:
        'You help a job seeker prepare to approach a company. You are given ONLY that company\'s current public job postings. Base every statement strictly on the postings provided — describe what the postings reveal (teams hiring, technologies, seniority mix, locations). NEVER state facts about the company that are not visible in the postings (no funding, size, culture, history, or reputation claims). Return JSON: {"overview":"2-3 sentences on what their hiring reveals","interviewPrep":["3-5 preparation tips grounded in the skills/roles in the postings"],"questionsToAsk":["4-6 thoughtful questions the candidate could ask a recruiter at this company, grounded in the postings"]}',
      user: `Company: ${name}\n\nCurrent postings:\n${postingsSummary}\n\nOne full posting for context:\n${sampleDescription}`,
      maxTokens: 900,
    });

    res.json({
      aiUsed: true,
      overview: String(out.overview || '').slice(0, 1500),
      interviewPrep: (out.interviewPrep || []).slice(0, 5).map((s) => String(s).slice(0, 500)),
      questionsToAsk: (out.questionsToAsk || []).slice(0, 6).map((s) => String(s).slice(0, 500)),
    });
  } catch (err) {
    console.error('Company brief failed:', err.message);
    // Graceful degradation, same pattern as routes/generate.js.
    res.json({ aiUsed: false, overview: '', interviewPrep: [], questionsToAsk: [] });
  }
});

export default router;
