// Legacy suggestion endpoints — kept for backward compatibility with older
// frontend builds. New clients should use /generate (structured, no raw
// prompts). These are hardened: input length caps, rate limiting, and a
// resume-writing system prompt instead of a generic assistant.

import express from 'express';
import Joi from 'joi';
import rateLimit from 'express-rate-limit';
import authMiddleware from '../middleware/authMiddleware.js';
import { aiAvailable, chatText, truncate } from '../services/ai.js';
import { validateBody } from '../utils/validate.js';

const router = express.Router();

const promptSchema = Joi.object({
  prompt: Joi.string().min(3).max(6000).required(),
  type: Joi.string().allow('').max(40).optional(),
});

const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // unauthenticated — keep tight
  message: { message: 'Too many AI requests. Please try again later or sign in.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const SYSTEM =
  'You are a professional resume-writing assistant. Only help with resume, cover letter, and career-related writing. If asked anything unrelated, reply exactly: "I can only help with resume writing." Keep answers concise.';

async function suggest(req, res) {
  if (!aiAvailable()) {
    return res.json({
      suggestions: ['AI suggestions are not configured on this server. Add OPENAI_API_KEY to enable them.'],
    });
  }
  try {
    const content = await chatText({
      system: SYSTEM,
      user: truncate(req.body.prompt, 4000),
      maxTokens: 300,
    });
    const suggestions = content.split('\n').filter(Boolean);
    res.json({ suggestions });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'AI service error' });
  }
}

// Public route — summary suggestions for guests, tightly rate-limited
router.post('/suggest/summary', publicLimiter, validateBody(promptSchema), suggest);

// Protected routes below
router.use(authMiddleware);

const authedLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  keyGenerator: (req) => req.user?.userId || req.ip,
  message: { message: 'AI request limit reached — please wait a few minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/suggest', authedLimiter, validateBody(promptSchema), suggest);

export default router;
