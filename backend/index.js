// Must be the first import: ESM hoists imports, so a plain dotenv.config()
// call would run only AFTER route modules (which read process.env at load
// time, e.g. JWT_SECRET, OPENAI_API_KEY) have already been evaluated.
import 'dotenv/config';

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

import authRoutes from './routes/auth.js';
import resumeRoutes from './routes/resume.js';
import aiRoutes from './routes/ai.js';
import analysisRoutes from './routes/analysis.js';
import generateRoutes from './routes/generate.js';
import jobsRoutes from './routes/jobs.js';
import notificationRoutes from './routes/notifications.js';
import profileRoutes from './routes/profile.js';
import { usingSampleData, startBackgroundJobRefresh } from './providers/jobs/index.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Behind Render/other proxies the client IP arrives via X-Forwarded-For;
// required for express-rate-limit to key by real IP.
app.set('trust proxy', 1);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // global ceiling per IP; sensitive routes add their own limits
  message: { message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // brute-force protection on login/register
  message: { message: 'Too many attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/health', (req, res) =>
  res.json({ ok: true, sampleJobs: usingSampleData() })
);

app.use('/auth', authLimiter, authRoutes);
app.use('/resume', resumeRoutes);
app.use('/ai', aiRoutes);
app.use('/analysis', analysisRoutes);
app.use('/generate', generateRoutes);
app.use('/jobs', jobsRoutes);
app.use('/notifications', notificationRoutes);
app.use('/profile', profileRoutes);

// Central error handler — malformed JSON, oversized payloads, etc.
app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Payload too large' });
  }
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ message: 'Invalid JSON body' });
  }
  console.error('Unhandled error:', err);
  res.status(500).json({ message: 'Server error' });
});

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    if (usingSampleData()) {
      console.log('ℹ️  Job providers: using SAMPLE data (Remotive/Arbeitnow/The Muse unreachable or disabled — check REMOTIVE_ENABLED/ARBEITNOW_ENABLED/THEMUSE_ENABLED, or set GREENHOUSE_BOARDS/LEVER_COMPANIES/ASHBY_BOARDS)');
    }
    // Warm the job cache now and keep refreshing it in the background so
    // user requests never pay the cost of a live multi-provider fetch.
    startBackgroundJobRefresh();
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('❌ MongoDB connection failed:', error.message);
  });
