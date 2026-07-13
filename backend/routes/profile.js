// Career Digital Twin: verified experience/education/skills/projects/
// certifications/languages/goals, the reusable Career Vault, the AI-generated
// Career GPS roadmap, the deterministic Career Concierge next-action, and the
// public Career Passport. See models/CareerProfile.js for the data shape.

import express from 'express';
import crypto from 'crypto';
import Joi from 'joi';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import authMiddleware from '../middleware/authMiddleware.js';
import { validateBody } from '../utils/validate.js';
import CareerProfile from '../models/CareerProfile.js';
import Resume from '../models/Resume.js';
import ScanResult from '../models/ScanResult.js';
import SavedJob from '../models/SavedJob.js';
import User from '../models/User.js';
import { computeCompleteness } from '../utils/profileCompleteness.js';
import { fetchAllJobs } from '../providers/jobs/index.js';
import { scoreJobForUser, summarizeSkillGaps } from '../utils/jobMatch.js';
import { resumeToText } from '../utils/text.js';
import { aiAvailable, chatJSON, truncate } from '../services/ai.js';

const router = express.Router();
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

async function getOrCreateProfile(userId) {
  let profile = await CareerProfile.findOne({ userId });
  if (!profile) profile = await CareerProfile.create({ userId });
  return profile;
}

function toResumeLikeData(profile) {
  // Adapts the Digital Twin into the shape jobMatch/text utils expect.
  return {
    summary: profile.careerGoals || '',
    experience: profile.experience || [],
    education: profile.education || [],
    skills: (profile.skills || []).map((s) => s.name),
  };
}

// ---------------------------------------------------------------------------
// PUBLIC — Career Passport (no auth). Must be registered before authMiddleware.
// ---------------------------------------------------------------------------

const passportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 120,
  message: { message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/passport/:slug', passportLimiter, async (req, res) => {
  try {
    const profile = await CareerProfile.findOne({
      'passport.slug': req.params.slug,
      'passport.enabled': true,
    });
    if (!profile) return res.status(404).json({ message: 'This career passport is not available.' });

    const user = await User.findById(profile.userId).select('name');
    profile.passport.viewCount = (profile.passport.viewCount || 0) + 1;
    await profile.save();

    let resume = null;
    if (profile.passport.resumeId) {
      resume = await Resume.findById(profile.passport.resumeId).select('data templateId title');
    }

    res.json({
      name: user?.name || 'Career Passport',
      headline: profile.passport.headline,
      experience: profile.experience || [],
      education: profile.education || [],
      skills: (profile.skills || []).map((s) => s.name),
      projects: profile.passport.showProjects ? profile.projects || [] : [],
      certifications: profile.passport.showCertifications ? profile.certifications || [] : [],
      resume: resume ? { data: resume.data, templateId: resume.templateId, title: resume.title } : null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// Protected routes below
// ---------------------------------------------------------------------------

router.use(authMiddleware);

const aiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => req.user?.userId || req.ip,
  message: { message: 'AI request limit reached — please wait a few minutes and try again.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// GET /profile — fetch (or lazily create) the Digital Twin
router.get('/', async (req, res) => {
  try {
    const profile = await getOrCreateProfile(req.user.userId);
    profile.completionPct = computeCompleteness(profile);
    await profile.save();
    res.json(profile);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

const experienceItemSchema = Joi.object({
  company: Joi.string().allow('').max(300),
  role: Joi.string().allow('').max(300),
  from: Joi.string().allow('').max(40),
  to: Joi.string().allow('').max(40),
  description: Joi.string().allow('').max(8000),
});
const educationItemSchema = Joi.object({
  school: Joi.string().allow('').max(300),
  degree: Joi.string().allow('').max(300),
  from: Joi.string().allow('').max(40),
  to: Joi.string().allow('').max(40),
  achievements: Joi.string().allow('').max(3000),
});
const skillItemSchema = Joi.object({
  name: Joi.string().min(1).max(120).required(),
  proficiency: Joi.string().valid('familiar', 'proficient', 'expert').default('proficient'),
  evidence: Joi.string().allow('').max(500).default(''),
  source: Joi.string().valid('user', 'resume-import', 'ai-confirmed').default('user'),
});
const projectItemSchema = Joi.object({
  name: Joi.string().min(1).max(200).required(),
  description: Joi.string().allow('').max(2000).default(''),
  skills: Joi.array().items(Joi.string().max(120)).max(30).default([]),
  url: Joi.string().allow('').max(500).default(''),
  from: Joi.string().allow('').max(40).default(''),
  to: Joi.string().allow('').max(40).default(''),
});
const certificationItemSchema = Joi.object({
  name: Joi.string().min(1).max(200).required(),
  issuer: Joi.string().allow('').max(200).default(''),
  issuedDate: Joi.string().allow('').max(40).default(''),
  expiryDate: Joi.string().allow('').max(40).default(''),
  credentialUrl: Joi.string().allow('').max(500).default(''),
});
const languageItemSchema = Joi.object({
  name: Joi.string().min(1).max(60).required(),
  proficiency: Joi.string().valid('basic', 'conversational', 'professional', 'fluent', 'native').default('professional'),
});

function makeArraySection(field, itemSchema, max = 40) {
  const schema = Joi.object({ [field]: Joi.array().items(itemSchema).max(max).required() });
  router.put(`/${field}`, validateBody(schema), async (req, res) => {
    try {
      const profile = await getOrCreateProfile(req.user.userId);
      profile[field] = req.body[field];
      profile.completionPct = computeCompleteness(profile);
      await profile.save();
      res.json(profile);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  });
}

makeArraySection('experience', experienceItemSchema, 30);
makeArraySection('education', educationItemSchema, 20);
makeArraySection('skills', skillItemSchema, 80);
makeArraySection('projects', projectItemSchema, 30);
makeArraySection('certifications', certificationItemSchema, 30);
makeArraySection('languages', languageItemSchema, 15);

// PUT /profile/goals
const goalsSchema = Joi.object({
  careerGoals: Joi.string().allow('').max(1000).default(''),
  targetRoles: Joi.array().items(Joi.string().max(120)).max(10).default([]),
});
router.put('/goals', validateBody(goalsSchema), async (req, res) => {
  try {
    const profile = await getOrCreateProfile(req.user.userId);
    profile.careerGoals = req.body.careerGoals;
    profile.targetRoles = req.body.targetRoles;
    profile.completionPct = computeCompleteness(profile);
    await profile.save();
    res.json(profile);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /profile/import-from-resume/:resumeId — seed the Twin from a saved resume.
// Additive merge: never overwrites existing verified entries, only adds new
// ones (deduped), each tagged source: 'resume-import' with a visible evidence trail.
router.post('/import-from-resume/:resumeId', async (req, res) => {
  const { resumeId } = req.params;
  if (!isValidId(resumeId)) return res.status(400).json({ message: 'Invalid resume id' });
  try {
    const resume = await Resume.findOne({ _id: resumeId, userId: req.user.userId });
    if (!resume) return res.status(404).json({ message: 'Resume not found' });
    const data = resume.data || {};
    const profile = await getOrCreateProfile(req.user.userId);

    const expKey = (e) => `${(e.role || '').toLowerCase()}|${(e.company || '').toLowerCase()}`;
    const existingExp = new Set((profile.experience || []).map(expKey));
    let added = 0;
    for (const e of data.experience || []) {
      if (!existingExp.has(expKey(e))) {
        profile.experience.push(e);
        existingExp.add(expKey(e));
        added++;
      }
    }

    const eduKey = (e) => `${(e.degree || '').toLowerCase()}|${(e.school || '').toLowerCase()}`;
    const existingEdu = new Set((profile.education || []).map(eduKey));
    for (const e of data.education || []) {
      if (!existingEdu.has(eduKey(e))) {
        profile.education.push(e);
        existingEdu.add(eduKey(e));
        added++;
      }
    }

    const existingSkills = new Set((profile.skills || []).map((s) => s.name.toLowerCase()));
    for (const s of data.skills || []) {
      const name = (s || '').trim();
      if (name && !existingSkills.has(name.toLowerCase())) {
        profile.skills.push({
          name,
          proficiency: 'proficient',
          evidence: `Imported from resume "${resume.title || 'Untitled'}"`,
          source: 'resume-import',
        });
        existingSkills.add(name.toLowerCase());
        added++;
      }
    }

    profile.completionPct = computeCompleteness(profile);
    await profile.save();
    res.json({ profile, added });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// Career Vault — reusable, evidence-backed bullets/achievements/projects/stories
// ---------------------------------------------------------------------------

const vaultItemSchema = Joi.object({
  type: Joi.string().valid('bullet', 'achievement', 'project', 'story').required(),
  title: Joi.string().allow('').max(200).default(''),
  text: Joi.string().min(1).max(2000).required(),
  metric: Joi.string().allow('').max(200).default(''),
  tags: Joi.array().items(Joi.string().max(60)).max(10).default([]),
  source: Joi.string().valid('user', 'resume-import', 'ai-confirmed').default('user'),
});

router.post('/vault', validateBody(vaultItemSchema), async (req, res) => {
  try {
    const profile = await getOrCreateProfile(req.user.userId);
    profile.vault.push(req.body);
    profile.completionPct = computeCompleteness(profile);
    await profile.save();
    res.status(201).json(profile);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

const vaultUpdateSchema = Joi.object({
  title: Joi.string().allow('').max(200),
  text: Joi.string().min(1).max(2000),
  metric: Joi.string().allow('').max(200),
  tags: Joi.array().items(Joi.string().max(60)).max(10),
}).min(1);

router.patch('/vault/:id', validateBody(vaultUpdateSchema), async (req, res) => {
  try {
    const profile = await getOrCreateProfile(req.user.userId);
    const item = profile.vault.id(req.params.id);
    if (!item) return res.status(404).json({ message: 'Vault item not found' });
    Object.assign(item, req.body);
    await profile.save();
    res.json(profile);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/vault/:id', async (req, res) => {
  try {
    const profile = await getOrCreateProfile(req.user.userId);
    profile.vault = profile.vault.filter((v) => String(v._id) !== req.params.id);
    profile.completionPct = computeCompleteness(profile);
    await profile.save();
    res.json(profile);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// AI Achievement Interview — asks clarifying questions to surface real
// metrics from a vague bullet; NEVER invents numbers, only asks for them.
// ---------------------------------------------------------------------------

const interviewSchema = Joi.object({
  bullet: Joi.string().min(5).max(2000).required(),
  context: Joi.string().allow('').max(300).default(''), // e.g. "Role @ Company"
  language: Joi.string().valid('en', 'ar', 'fr').default('en'),
});

router.post('/achievement-interview', aiLimiter, validateBody(interviewSchema), async (req, res) => {
  if (!aiAvailable()) {
    return res.json({
      questions: [
        'How many people, users, or customers did this affect?',
        'Is there a percentage, dollar amount, or time saved you can attach to this?',
        'How does this compare to before you did it (baseline vs. result)?',
      ],
      aiUsed: false,
    });
  }
  try {
    const out = await chatJSON({
      system:
        'You are a career coach helping someone recall real metrics for a resume bullet. Ask 2-4 short, specific clarifying questions that would surface a genuine number, scale, or comparison (never suggest or assume a number yourself — only ask). If the bullet already has a strong metric, say so and ask one question to make it even more specific (e.g. timeframe or scope). Return JSON: {"questions": ["...", "..."]}',
      user: `Bullet: ${truncate(req.body.bullet, 500)}\nContext: ${req.body.context || 'not specified'}`,
      maxTokens: 300,
      language: req.body.language || 'en',
    });
    res.json({ questions: (out.questions || []).slice(0, 4), aiUsed: true });
  } catch (err) {
    console.error('Achievement interview failed:', err.message);
    res.json({
      questions: [
        'How many people, users, or customers did this affect?',
        'Is there a percentage, dollar amount, or time saved you can attach to this?',
      ],
      aiUsed: false,
      degraded: true,
    });
  }
});

// ---------------------------------------------------------------------------
// Career GPS — AI-generated 30/90-day + long-term roadmap, grounded in the
// Digital Twin and real skill gaps against currently live jobs.
// ---------------------------------------------------------------------------

function fallbackRoadmap(targetRole, gaps) {
  const topGaps = gaps.slice(0, 3).map((g) => g.skill);
  return {
    targetRole,
    generatedAt: new Date(),
    thirtyDay: [
      { text: 'Run a resume scan and fix every "fix these first" item.', done: false },
      topGaps[0]
        ? { text: `Start learning ${topGaps[0]} — it appears in ${gaps[0].jobCount} jobs you don't yet qualify for.`, done: false }
        : { text: 'Fill in any missing resume sections (summary, skills, dates).', done: false },
      { text: 'Save 10 jobs on Opportunity Radar and note the most common missing skill.', done: false },
    ].filter(Boolean),
    ninetyDay: [
      topGaps[1] ? { text: `Complete a small project or certification using ${topGaps[1]}.`, done: false } : null,
      { text: 'Tailor and submit applications to 15 "qualify now" matches.', done: false },
      { text: 'Run the AI Achievement Interview on your 3 weakest bullets to add real metrics.', done: false },
    ].filter(Boolean),
    longTerm: [
      { text: `Build toward ${targetRole || 'your target role'} by closing the remaining skill gaps shown in Opportunity Radar.`, done: false },
      { text: 'Revisit this roadmap every 90 days as your profile and the job market change.', done: false },
    ],
  };
}

router.post(
  '/roadmap',
  aiLimiter,
  validateBody(
    Joi.object({
      targetRole: Joi.string().allow('').max(160).default(''),
      language: Joi.string().valid('en', 'ar', 'fr').default('en'),
    })
  ),
  async (req, res) => {
  try {
    const profile = await getOrCreateProfile(req.user.userId);
    const targetRole = req.body.targetRole || profile.targetRoles?.[0] || '';

    const jobs = await fetchAllJobs();
    const resumeLike = toResumeLikeData(profile);
    const prefs = { titles: targetRole ? [targetRole] : profile.targetRoles || [] };
    const scored = jobs.map((j) => scoreJobForUser(j, resumeLike, prefs));
    const gaps = summarizeSkillGaps(scored, 8);

    let roadmap;
    if (aiAvailable()) {
      try {
        const out = await chatJSON({
          system:
            'You are a career coach. Build a realistic, grounded roadmap using ONLY the profile and skill-gap data given — never invent achievements or qualifications the person does not have. Each roadmap item is one concrete, actionable step. Return JSON: {"thirtyDay":["...","..."],"ninetyDay":["...","..."],"longTerm":["...","..."]} with 3-4 items per bucket.',
          user: `Target role: ${targetRole || 'not specified'}\n\nProfile summary:\n${truncate(resumeToText(resumeLike), 2500)}\n\nMost common missing skills across live job matches (skill: number of jobs requiring it):\n${gaps.map((g) => `${g.skill}: ${g.jobCount}`).join('\n') || 'none detected'}`,
          maxTokens: 900,
          language: req.body.language || 'en',
        });
        roadmap = {
          targetRole,
          generatedAt: new Date(),
          thirtyDay: (out.thirtyDay || []).slice(0, 5).map((text) => ({ text: String(text).slice(0, 400), done: false })),
          ninetyDay: (out.ninetyDay || []).slice(0, 5).map((text) => ({ text: String(text).slice(0, 400), done: false })),
          longTerm: (out.longTerm || []).slice(0, 5).map((text) => ({ text: String(text).slice(0, 400), done: false })),
        };
        if (!roadmap.thirtyDay.length && !roadmap.ninetyDay.length) roadmap = fallbackRoadmap(targetRole, gaps);
      } catch (err) {
        console.warn('AI roadmap generation failed, using deterministic fallback:', err.message);
        roadmap = fallbackRoadmap(targetRole, gaps);
      }
    } else {
      roadmap = fallbackRoadmap(targetRole, gaps);
    }

    profile.roadmap = roadmap;
    await profile.save();
    res.json({ roadmap, aiUsed: aiAvailable(), skillGaps: gaps });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

const roadmapItemSchema = Joi.object({
  bucket: Joi.string().valid('thirtyDay', 'ninetyDay', 'longTerm').required(),
  index: Joi.number().integer().min(0).required(),
  done: Joi.boolean().required(),
});
router.patch('/roadmap/item', validateBody(roadmapItemSchema), async (req, res) => {
  try {
    const profile = await getOrCreateProfile(req.user.userId);
    const list = profile.roadmap?.[req.body.bucket];
    if (!list || !list[req.body.index]) return res.status(404).json({ message: 'Roadmap item not found' });
    list[req.body.index].done = req.body.done;
    profile.markModified('roadmap');
    await profile.save();
    res.json(profile.roadmap);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// Career Concierge — deterministic "single most valuable next action"
// ---------------------------------------------------------------------------

router.get('/next-action', async (req, res) => {
  try {
    const userId = req.user.userId;
    const [profile, resumes, scans, savedJobs] = await Promise.all([
      getOrCreateProfile(userId),
      Resume.find({ userId }).select('_id'),
      ScanResult.find({ userId, type: 'scan' }).sort({ createdAt: -1 }).limit(1).select('overall'),
      SavedJob.find({ userId }).select('_id'),
    ]);

    const latestScore = scans[0]?.overall ?? null;
    const rules = [
      {
        when: (profile.experience || []).length === 0 && (profile.skills || []).length === 0,
        action: 'Build your Career Digital Twin — add your experience and skills so every future recommendation is grounded in real evidence.',
        href: '/profile',
      },
      {
        when: resumes.length === 0,
        action: 'Create your first resume — upload an existing one or build from scratch in minutes.',
        href: '/resume',
      },
      {
        when: latestScore === null,
        action: 'Run your first resume scan to get a 100-point score and a fix-it plan.',
        href: '/analyze',
      },
      {
        when: latestScore !== null && latestScore < 70,
        action: `Your latest score is ${latestScore}/100 — apply the top fixes to push it above 70.`,
        href: '/analyze',
      },
      {
        when: savedJobs.length === 0,
        action: 'Check Opportunity Radar for jobs you qualify for right now.',
        href: '/radar',
      },
      {
        when: (profile.vault || []).length === 0,
        action: 'Do the AI Achievement Interview to capture real metrics for your Career Vault.',
        href: '/profile?tab=vault',
      },
      {
        when: !profile.roadmap?.generatedAt,
        action: 'Generate your Career GPS — a personalized 30/90-day roadmap toward your target role.',
        href: '/profile?tab=roadmap',
      },
      {
        when: (profile.targetRoles || []).length === 0,
        action: 'Set your target roles so matching and recommendations get sharper.',
        href: '/profile?tab=goals',
      },
    ];

    const match = rules.find((r) => r.when);
    res.json(
      match || {
        action: "You're in great shape — check Opportunity Radar for new matches that came in today.",
        href: '/radar',
      }
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// Career Passport settings (owner-side)
// ---------------------------------------------------------------------------

const passportSchema = Joi.object({
  enabled: Joi.boolean().required(),
  headline: Joi.string().allow('').max(200).default(''),
  showProjects: Joi.boolean().default(true),
  showCertifications: Joi.boolean().default(true),
  resumeId: Joi.string().hex().length(24).allow(null).default(null),
});

function randomSlugSuffix() {
  return crypto.randomBytes(3).toString('hex');
}

router.put('/passport', validateBody(passportSchema), async (req, res) => {
  try {
    const profile = await getOrCreateProfile(req.user.userId);
    if (req.body.resumeId) {
      if (!isValidId(req.body.resumeId)) return res.status(400).json({ message: 'Invalid resume id' });
      const owned = await Resume.exists({ _id: req.body.resumeId, userId: req.user.userId });
      if (!owned) return res.status(404).json({ message: 'Resume not found' });
    }
    if (req.body.enabled && !profile.passport.slug) {
      const user = await User.findById(req.user.userId).select('name');
      const base = (user?.name || 'user')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40);
      profile.passport.slug = `${base || 'user'}-${randomSlugSuffix()}`;
    }
    profile.passport.enabled = req.body.enabled;
    profile.passport.headline = req.body.headline;
    profile.passport.showProjects = req.body.showProjects;
    profile.passport.showCertifications = req.body.showCertifications;
    profile.passport.resumeId = req.body.resumeId || null;
    await profile.save();
    res.json(profile);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
