import express from 'express';
import Resume from '../models/Resume.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// Protect all routes below — user must be logged in
router.use(authMiddleware);

// POST /api/resume
// Create new resume or update existing one by ID
router.post('/create', async (req, res) => {
  const userId = req.user.userId;
  const { id, data } = req.body;

  if (!data) return res.status(400).json({ message: 'Resume data is required' });

  try {
    if (id) {
      // Update existing resume
      const updated = await Resume.findOneAndUpdate(
        { _id: id, userId },
        { data },
        { new: true }
      );
      if (!updated) return res.status(404).json({ message: 'Resume not found' });
      return res.json(updated);
    } else {
      // Create new resume
      const newResume = new Resume({ userId, data });
      await newResume.save();
      res.status(201).json(newResume);
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// GET /api/resume
// Get all resumes for logged-in user
router.get('/resumes', async (req, res) => {
  const userId = req.user.userId;
  try {
    const resumes = await Resume.find({ userId }).sort({ createdAt: -1 });
    res.json(resumes);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});
// GET /resumes/:id — View a single resume
router.get('/resumes/:id', async (req, res) => {
  const userId = req.user.userId;
  const resumeId = req.params.id;

  try {
    const resume = await Resume.findOne({ _id: resumeId, userId });
    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }

    res.json(resume);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// DELETE /api/resume/:id
// Delete a resume by ID for logged-in user
router.delete('/delete/:id', async (req, res) => {
  const userId = req.user.userId;
  try {
    const deleted = await Resume.findOneAndDelete({ _id: req.params.id, userId });
    if (!deleted) return res.status(404).json({ message: 'Resume not found' });
    res.json({ message: 'Resume deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

export default router;
