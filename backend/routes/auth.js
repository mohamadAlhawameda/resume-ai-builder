// routes/auth.js
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Joi from 'joi';
import User from '../models/User.js';
import authMiddleware from '../middleware/authMiddleware.js';
import { validateBody, jobPreferencesSchema } from '../utils/validate.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

const signToken = (userId) => jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });

const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(120).required(),
  email: Joi.string().trim().email().max(320).required(),
  password: Joi.string().min(6).max(200).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().trim().email().max(320).required(),
  password: Joi.string().min(1).max(200).required(),
});

router.post('/register', validateBody(registerSchema), async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({ name, email, password: hashedPassword });
    await newUser.save();

    // NOTE: payload must be { userId } — authMiddleware reads decoded.userId.
    const token = signToken(newUser._id);

    res.status(201).json({
      token,
      user: {
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/login', validateBody(loginSchema), async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email }).select('+password');
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = signToken(user._id);

    res.json({
      message: 'Logged in successfully',
      token,
      user: {
        _id: user._id,
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---- Authenticated profile endpoints ----

router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        targetRole: user.targetRole || '',
        industry: user.industry || '',
        jobPreferences: user.jobPreferences || {},
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

const profileSchema = Joi.object({
  targetRole: Joi.string().allow('').max(120),
  industry: Joi.string().allow('').max(120),
  jobPreferences: jobPreferencesSchema,
});

router.put('/profile', authMiddleware, validateBody(profileSchema), async (req, res) => {
  try {
    const update = {};
    if (req.body.targetRole !== undefined) update.targetRole = req.body.targetRole;
    if (req.body.industry !== undefined) update.industry = req.body.industry;
    if (req.body.jobPreferences !== undefined) update.jobPreferences = req.body.jobPreferences;

    const user = await User.findByIdAndUpdate(req.user.userId, update, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        targetRole: user.targetRole,
        industry: user.industry,
        jobPreferences: user.jobPreferences,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
