import express from 'express';
import Joi from 'joi';
import mongoose from 'mongoose';
import Resume, { MAX_VERSIONS } from '../models/Resume.js';
import authMiddleware from '../middleware/authMiddleware.js';
import { validateBody, resumeDataSchema } from '../utils/validate.js';

const router = express.Router();

// Protect all routes below — user must be logged in
router.use(authMiddleware);

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

const createSchema = Joi.object({
  id: Joi.string().hex().length(24).optional(),
  data: resumeDataSchema.required(),
  templateId: Joi.string().valid('classic', 'modern', 'minimal', 'executive', 'creative', 'default').optional(),
  title: Joi.string().allow('').max(160).optional(),
  versionLabel: Joi.string().allow('').max(120).optional(),
});

// POST /resume/create
// Create new resume or update existing one by ID. Updates snapshot the
// previous state into version history (capped at MAX_VERSIONS).
router.post('/create', validateBody(createSchema), async (req, res) => {
  const userId = req.user.userId;
  const { id, data, templateId, title, versionLabel } = req.body;

  try {
    if (id) {
      const existing = await Resume.findOne({ _id: id, userId });
      if (!existing) return res.status(404).json({ message: 'Resume not found' });

      // Snapshot the current state before overwriting (skip no-op saves).
      const changed = JSON.stringify(existing.data) !== JSON.stringify(data);
      if (changed) {
        existing.versions.push({
          data: existing.data,
          templateId: existing.templateId,
          label: versionLabel || '',
          createdAt: new Date(),
        });
        if (existing.versions.length > MAX_VERSIONS) {
          existing.versions = existing.versions.slice(-MAX_VERSIONS);
        }
      }

      existing.data = data;
      if (templateId) existing.templateId = templateId;
      if (title !== undefined) existing.title = title;
      await existing.save();
      return res.json(existing);
    } else {
      const newResume = new Resume({
        userId,
        data,
        templateId: templateId || 'classic',
        title: title || data.title || data.fullName || 'Untitled resume',
      });
      await newResume.save();
      res.status(201).json(newResume);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /resume/resumes — all resumes for logged-in user (without heavy versions)
router.get('/resumes', async (req, res) => {
  const userId = req.user.userId;
  try {
    const resumes = await Resume.find({ userId })
      .select('-versions')
      .sort({ updatedAt: -1 });
    res.json(resumes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /resume/resumes/:id — single resume
router.get('/resumes/:id', async (req, res) => {
  const userId = req.user.userId;
  const resumeId = req.params.id;
  if (!isValidId(resumeId)) return res.status(400).json({ message: 'Invalid resume id' });

  try {
    const resume = await Resume.findOne({ _id: resumeId, userId }).select('-versions');
    if (!resume) return res.status(404).json({ message: 'Resume not found' });
    res.json(resume);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /resume/duplicate/:id — copy a resume (e.g. to tailor for another job)
router.post('/duplicate/:id', async (req, res) => {
  const userId = req.user.userId;
  if (!isValidId(req.params.id)) return res.status(400).json({ message: 'Invalid resume id' });

  try {
    const source = await Resume.findOne({ _id: req.params.id, userId });
    if (!source) return res.status(404).json({ message: 'Resume not found' });

    const copyTitle =
      typeof req.body?.title === 'string' && req.body.title.trim()
        ? req.body.title.trim().slice(0, 160)
        : `${source.title || source.data?.fullName || 'Resume'} (copy)`;

    const copy = new Resume({
      userId,
      data: source.data,
      templateId: source.templateId,
      title: copyTitle,
    });
    await copy.save();
    res.status(201).json(copy);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /resume/rename/:id
router.patch(
  '/rename/:id',
  validateBody(Joi.object({ title: Joi.string().trim().min(1).max(160).required() })),
  async (req, res) => {
    const userId = req.user.userId;
    if (!isValidId(req.params.id)) return res.status(400).json({ message: 'Invalid resume id' });
    try {
      const updated = await Resume.findOneAndUpdate(
        { _id: req.params.id, userId },
        { title: req.body.title },
        { new: true }
      ).select('-versions');
      if (!updated) return res.status(404).json({ message: 'Resume not found' });
      res.json(updated);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// GET /resume/versions/:id — version history (newest first)
router.get('/versions/:id', async (req, res) => {
  const userId = req.user.userId;
  if (!isValidId(req.params.id)) return res.status(400).json({ message: 'Invalid resume id' });
  try {
    const resume = await Resume.findOne({ _id: req.params.id, userId }).select('versions title');
    if (!resume) return res.status(404).json({ message: 'Resume not found' });
    const versions = [...(resume.versions || [])].reverse();
    res.json({ title: resume.title, versions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /resume/versions/:id/restore/:versionId — roll back to a snapshot
router.post('/versions/:id/restore/:versionId', async (req, res) => {
  const userId = req.user.userId;
  const { id, versionId } = req.params;
  if (!isValidId(id) || !isValidId(versionId)) {
    return res.status(400).json({ message: 'Invalid id' });
  }
  try {
    const resume = await Resume.findOne({ _id: id, userId });
    if (!resume) return res.status(404).json({ message: 'Resume not found' });

    const version = resume.versions.id(versionId);
    if (!version) return res.status(404).json({ message: 'Version not found' });

    // Snapshot the current state so the restore itself is reversible.
    resume.versions.push({
      data: resume.data,
      templateId: resume.templateId,
      label: 'Before restore',
      createdAt: new Date(),
    });
    if (resume.versions.length > MAX_VERSIONS) {
      resume.versions = resume.versions.slice(-MAX_VERSIONS);
    }

    resume.data = version.data;
    if (version.templateId) resume.templateId = version.templateId;
    await resume.save();
    res.json({ message: 'Version restored', resume: { _id: resume._id, data: resume.data, templateId: resume.templateId } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /resume/delete/:id
router.delete('/delete/:id', async (req, res) => {
  const userId = req.user.userId;
  if (!isValidId(req.params.id)) return res.status(400).json({ message: 'Invalid resume id' });
  try {
    const deleted = await Resume.findOneAndDelete({ _id: req.params.id, userId });
    if (!deleted) return res.status(404).json({ message: 'Resume not found' });
    res.json({ message: 'Resume deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
