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
import CareerProfile from '../models/CareerProfile.js';
import { fetchAllJobs, getJobById, usingSampleData } from '../providers/jobs/index.js';
import { scoreJobForUser, summarizeSkillGaps } from '../utils/jobMatch.js';
import { validateBody, jobPreferencesSchema } from '../utils/validate.js';
import { sendJobAlertEmail, sendApplicationStatusEmail } from '../services/email.js';
import { matchFamilies, adjacentFamilies } from '../utils/occupationTaxonomy.js';
import { findSkillsInText } from '../utils/text.js';

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
  let resumeData = resume?.data || {};

  // No resume yet (or it's thin) — fall back to the Career Digital Twin so
  // matching still works for users who've filled in a profile but haven't
  // built a formal resume yet.
  if (!(resumeData.experience?.length || resumeData.skills?.length)) {
    const profile = await CareerProfile.findOne({ userId });
    if (profile && (profile.experience?.length || profile.skills?.length)) {
      resumeData = {
        ...resumeData,
        summary: resumeData.summary || profile.careerGoals || '',
        experience: resumeData.experience?.length ? resumeData.experience : profile.experience || [],
        education: resumeData.education?.length ? resumeData.education : profile.education || [],
        skills: resumeData.skills?.length ? resumeData.skills : (profile.skills || []).map((s) => s.name),
      };
    }
  }

  return { user, resumeData, resumeId: resume?._id || null };
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
// Strip the (large) description before sending a page of results over the
// wire — scoring already happened server-side against the full text, so the
// list view never needs it. The full text is fetched on demand via GET /jobs/:id.
function toSummary(job) {
  const { description, ...summary } = job;
  return summary;
}

router.get('/recommended', async (req, res) => {
  try {
    const { user, resumeData, resumeId } = await getContext(req.user.userId, req.query.resumeId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const jobs = await fetchAllJobs();
    const prefs = user.jobPreferences?.toObject ? user.jobPreferences.toObject() : (user.jobPreferences || {});

    // No resume AND no Career Digital Twin content — there is nothing to
    // score against, so a percentage here would be pure noise, not a real
    // signal. Return jobs unscored rather than show a misleading number.
    const hasProfile = (resumeData.experience?.length || 0) > 0 || (resumeData.skills?.length || 0) > 0;

    let scored = hasProfile
      ? jobs.map((job) => ({ ...job, match: scoreJobForUser(job, resumeData, prefs) }))
      : jobs.map((job) => ({ ...job, match: null }));

    if (hasProfile) {
      await generateAlerts(user, scored).catch((e) => console.warn('Alert generation failed:', e.message));
    }

    // ---- Server-side search/filter so pagination is correct across the
    // whole result set, not just whatever page happens to be in view. ----
    const q = (req.query.q || '').trim().toLowerCase();
    if (q) {
      scored = scored.filter((j) =>
        `${j.title} ${j.company} ${j.location} ${(j.skills || []).join(' ')}`.toLowerCase().includes(q)
      );
    }
    const remoteFilter = req.query.remote;
    if (remoteFilter && remoteFilter !== 'any') scored = scored.filter((j) => j.remote === remoteFilter);
    const countryFilter = req.query.country;
    if (countryFilter && countryFilter !== 'any') scored = scored.filter((j) => (j.countries || []).includes(countryFilter));
    const regionFilter = req.query.region;
    if (regionFilter && regionFilter !== 'any') scored = scored.filter((j) => (j.regions || []).includes(regionFilter));
    const minMatch = parseInt(req.query.minMatch, 10) || 0;
    if (minMatch > 0) scored = scored.filter((j) => (j.match?.percent ?? 0) >= minMatch);

    const sortBy = req.query.sortBy || 'match';
    scored.sort((a, b) => {
      if (sortBy === 'salary') return (b.salaryMax ?? 0) - (a.salaryMax ?? 0);
      if (sortBy === 'date') return new Date(b.postedAt || 0).getTime() - new Date(a.postedAt || 0).getTime();
      return (b.match?.percent ?? 0) - (a.match?.percent ?? 0);
    });

    // ---- Pagination — 10 lightweight summaries per page by default. ----
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize, 10) || 10, 1), 50);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const totalMatched = scored.length;
    const totalPages = Math.max(1, Math.ceil(totalMatched / pageSize));
    const pageJobs = scored.slice((page - 1) * pageSize, page * pageSize).map(toSummary);

    res.json({
      jobs: pageJobs,
      page,
      pageSize,
      totalPages,
      totalMatched,
      resumeId,
      hasProfile,
      sampleData: usingSampleData(),
      preferences: prefs,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /jobs/detail/:id — full posting detail (including description),
// fetched only when a user actually opens a job card. Keeps the list
// endpoint lightweight. (A distinct sub-path, not a bare `/jobs/:id`
// wildcard, so it can never shadow `/jobs/saved`, `/jobs/radar`, etc.
// regardless of route registration order.)
router.get('/detail/:id', async (req, res) => {
  try {
    const job = await getJobById(req.params.id);
    if (!job) return res.status(404).json({ message: 'This job is no longer available.' });
    res.json(job);
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
    source: Joi.string().allow('').max(60).default(''),
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

// ---------------------------------------------------------------------------
// Opportunity Radar — jobs you qualify for now, jobs you're close to
// qualifying for, adjacent career paths, and companies actively hiring for
// your profile. All computed deterministically from the live job feed.
// ---------------------------------------------------------------------------

// GET /jobs/radar?resumeId=...
router.get('/radar', async (req, res) => {
  try {
    const { user, resumeData, resumeId } = await getContext(req.user.userId, req.query.resumeId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const hasProfile = (resumeData.experience?.length || 0) > 0 || (resumeData.skills?.length || 0) > 0;
    if (!hasProfile) {
      return res.json({
        hasProfile: false,
        qualifyNow: [],
        qualifySoon: [],
        companiesHiring: [],
        adjacentPaths: [],
        resumeId,
        sampleData: usingSampleData(),
      });
    }

    const jobs = await fetchAllJobs();
    const prefs = user.jobPreferences?.toObject ? user.jobPreferences.toObject() : (user.jobPreferences || {});
    const scored = jobs.map((job) => ({ ...job, match: scoreJobForUser(job, resumeData, prefs) }));

    const qualifyNow = scored
      .filter((j) => j.match.percent >= 75)
      .sort((a, b) => b.match.percent - a.match.percent)
      .slice(0, 12);

    const qualifySoon = scored
      .filter((j) => j.match.percent >= 50 && j.match.percent < 75 && j.match.missingSkills.length <= 2)
      .sort((a, b) => b.match.percent - a.match.percent)
      .slice(0, 12);

    // Companies with several roles a reasonable fit for this profile.
    const byCompany = new Map();
    for (const j of scored) {
      if (j.match.percent < 40) continue;
      const key = j.company;
      const entry = byCompany.get(key) || { company: key, jobCount: 0, avgMatch: 0, totalMatch: 0 };
      entry.jobCount += 1;
      entry.totalMatch += j.match.percent;
      byCompany.set(key, entry);
    }
    const companiesHiring = [...byCompany.values()]
      .map((c) => ({ company: c.company, jobCount: c.jobCount, avgMatch: Math.round(c.totalMatch / c.jobCount) }))
      .sort((a, b) => b.jobCount - a.jobCount || b.avgMatch - a.avgMatch)
      .slice(0, 8);

    // Adjacent career paths: occupation families with meaningful (but not
    // dominant) skill overlap, plus a couple of live openings in that family
    // so the suggestion is concrete, not abstract.
    const resumeSkillsLower = findSkillsInText(resumeToTextSafe(resumeData)).map((s) => s.toLowerCase());
    const primary = matchFamilies(resumeSkillsLower)[0];
    const adjacent = adjacentFamilies(resumeSkillsLower, primary?.id, 3).map((fam) => {
      const openings = scored
        .filter((j) => (j.skills || []).some((s) => fam.matchedSkills.includes(s.toLowerCase())))
        .sort((a, b) => b.match.percent - a.match.percent)
        .slice(0, 3)
        .map((j) => ({ id: j.id, title: j.title, company: j.company, matchPercent: j.match.percent }));
      return { family: fam.title, matchedSkills: fam.matchedSkills, openings };
    }).filter((a) => a.openings.length > 0);

    res.json({
      hasProfile: true,
      qualifyNow,
      qualifySoon,
      companiesHiring,
      adjacentPaths: adjacent,
      resumeId,
      sampleData: usingSampleData(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

function resumeToTextSafe(resumeData) {
  const parts = [resumeData?.summary || ''];
  for (const e of resumeData?.experience || []) parts.push(e.description || '');
  if (Array.isArray(resumeData?.skills)) parts.push(resumeData.skills.join(' '));
  return parts.join(' ');
}

// ---------------------------------------------------------------------------
// Skill Impact Simulator — "if I add this skill, what changes?"
// ---------------------------------------------------------------------------

const simulateSchema = Joi.object({
  resumeId: Joi.string().hex().length(24).optional(),
  addSkills: Joi.array().items(Joi.string().max(120)).min(1).max(5).required(),
});

router.post('/simulate', validateBody(simulateSchema), async (req, res) => {
  try {
    const { user, resumeData } = await getContext(req.user.userId, req.body.resumeId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const jobs = await fetchAllJobs();
    const prefs = user.jobPreferences?.toObject ? user.jobPreferences.toObject() : (user.jobPreferences || {});

    const before = jobs.map((j) => scoreJobForUser(j, resumeData, prefs));
    const augmented = { ...resumeData, skills: [...(resumeData.skills || []), ...req.body.addSkills] };
    const after = jobs.map((j) => scoreJobForUser(j, augmented, prefs));

    const avg = (arr) => (arr.length ? arr.reduce((s, x) => s + x.percent, 0) / arr.length : 0);
    const qualifyingCount = (arr, threshold = 75) => arr.filter((x) => x.percent >= threshold).length;

    const newlyQualifying = jobs
      .map((j, i) => ({ job: j, before: before[i].percent, after: after[i].percent }))
      .filter((x) => x.before < 75 && x.after >= 75)
      .sort((a, b) => b.after - a.after)
      .slice(0, 5)
      .map((x) => ({ id: x.job.id, title: x.job.title, company: x.job.company, before: x.before, after: x.after }));

    res.json({
      addedSkills: req.body.addSkills,
      avgMatchBefore: Math.round(avg(before)),
      avgMatchAfter: Math.round(avg(after)),
      qualifyingJobsBefore: qualifyingCount(before),
      qualifyingJobsAfter: qualifyingCount(after),
      totalJobsConsidered: jobs.length,
      newlyQualifying,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// Application Intelligence — which titles/skills/match-ranges correlate with
// better outcomes in this user's own tracked applications.
// ---------------------------------------------------------------------------

router.get('/insights', async (req, res) => {
  try {
    const saved = await SavedJob.find({ userId: req.user.userId });
    const tracked = saved.filter((s) => s.status !== 'saved');

    const byStatus = {};
    for (const s of saved) byStatus[s.status] = (byStatus[s.status] || 0) + 1;

    const avgMatchByStatus = {};
    for (const status of ['applied', 'interviewing', 'offer', 'rejected']) {
      const withMatch = saved.filter((s) => s.status === status && typeof s.matchPercent === 'number');
      if (withMatch.length) {
        avgMatchByStatus[status] = Math.round(
          withMatch.reduce((sum, s) => sum + s.matchPercent, 0) / withMatch.length
        );
      }
    }

    const positiveOutcomes = saved.filter((s) => ['interviewing', 'offer'].includes(s.status));
    const skillFreq = {};
    for (const s of positiveOutcomes) {
      for (const skill of s.job?.skills || []) skillFreq[skill] = (skillFreq[skill] || 0) + 1;
    }
    const topSkillsInPositiveOutcomes = Object.entries(skillFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([skill, count]) => ({ skill, count }));

    res.json({
      totalTracked: tracked.length,
      byStatus,
      avgMatchByStatus,
      topSkillsInPositiveOutcomes,
      sampleSizeNote:
        tracked.length < 5
          ? 'Track more applications to get statistically meaningful patterns — these are early signals.'
          : null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
