// routes/auth.js
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Joi from 'joi';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';
import authMiddleware from '../middleware/authMiddleware.js';
import { validateBody, jobPreferencesSchema } from '../utils/validate.js';
import { sendWelcomeEmail } from '../services/email.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET;

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const googleClient = GOOGLE_CLIENT_ID ? new OAuth2Client(GOOGLE_CLIENT_ID) : null;

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

    sendWelcomeEmail(newUser).catch(() => {});

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

// POST /auth/google — "Sign in with Google" (Google Identity Services).
// The client sends the ID-token credential from the GIS button; we verify it
// against our client ID, then find-or-create the user. Existing email/password
// accounts with the same (Google-verified) email are linked automatically.
const googleSchema = Joi.object({
  credential: Joi.string().max(5000).required(),
});

router.post('/google', validateBody(googleSchema), async (req, res) => {
  if (!googleClient) {
    return res.status(503).json({ message: 'Google sign-in is not configured on this server.' });
  }
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: req.body.credential,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload?.email || payload.email_verified === false) {
      return res.status(401).json({ message: 'Your Google account email is not verified.' });
    }

    const email = payload.email.toLowerCase();
    let isNewUser = false;

    let user = await User.findOne({ googleId: payload.sub });
    if (!user) {
      user = await User.findOne({ email });
      if (user) {
        // Same verified email — link the Google account to the existing user.
        user.googleId = payload.sub;
        await user.save();
      }
    }
    if (!user) {
      user = new User({
        name: (payload.name || email.split('@')[0]).slice(0, 120),
        email,
        googleId: payload.sub,
      });
      await user.save();
      isNewUser = true;
      sendWelcomeEmail(user).catch(() => {});
    }

    const token = signToken(user._id);
    res.json({
      token,
      user: { _id: user._id, name: user.name, email: user.email },
      isNewUser,
    });
  } catch (err) {
    console.error('Google sign-in failed:', err.message);
    res.status(401).json({ message: 'Google sign-in failed — please try again.' });
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
