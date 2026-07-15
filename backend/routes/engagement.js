// Engagement summary — one read-only aggregation over data the app already
// records, powering the dashboard's streak, daily checklist, activity
// calendar, weekly report, and interview-readiness widgets. Nothing here is
// new persistence: it's all derived from ScanResult / SavedJob / Contact /
// Reminder / CareerProfile timestamps.

import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import ScanResult from '../models/ScanResult.js';
import SavedJob from '../models/SavedJob.js';
import Contact from '../models/Contact.js';
import Reminder from '../models/Reminder.js';
import Resume from '../models/Resume.js';
import CareerProfile from '../models/CareerProfile.js';
import { computeReadiness } from '../utils/readiness.js';

const router = express.Router();
router.use(authMiddleware);

const DAY_MS = 24 * 60 * 60 * 1000;
const CALENDAR_DAYS = 84; // 12 weeks

// Local-date key (server timezone) — consistent within one deployment.
function dayKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// GET /engagement/summary
router.get('/summary', async (req, res) => {
  try {
    const userId = req.user.userId;
    const since = new Date(Date.now() - (CALENDAR_DAYS + 1) * DAY_MS);

    const [scans, savedJobs, contacts, reminders, resumes, profile] = await Promise.all([
      ScanResult.find({ userId, createdAt: { $gte: since } }).select('createdAt type overall').sort({ createdAt: -1 }),
      SavedJob.find({ userId }).select('createdAt updatedAt appliedAt status'),
      Contact.find({ userId }).select('contacted activity'),
      Reminder.find({ userId }).select('status dueDate updatedAt'),
      Resume.find({ userId, updatedAt: { $gte: since } }).select('updatedAt'),
      CareerProfile.findOne({ userId }).select('completionPct vault'),
    ]);

    // ---- Activity calendar: one count per day across every activity type ----
    const counts = new Map();
    const bump = (date) => {
      if (!date || new Date(date) < since) return;
      const key = dayKey(date);
      counts.set(key, (counts.get(key) || 0) + 1);
    };
    scans.forEach((s) => bump(s.createdAt));
    resumes.forEach((r) => bump(r.updatedAt));
    savedJobs.forEach((j) => {
      bump(j.createdAt);
      if (j.appliedAt) bump(j.appliedAt);
    });
    contacts.forEach((c) => (c.activity || []).forEach((a) => bump(a.date)));
    reminders.forEach((r) => {
      if (r.status === 'done') bump(r.updatedAt);
    });

    const calendar = [];
    for (let i = CALENDAR_DAYS - 1; i >= 0; i--) {
      const key = dayKey(new Date(Date.now() - i * DAY_MS));
      calendar.push({ date: key, count: counts.get(key) || 0 });
    }

    // ---- Streak: consecutive active days ending today (or yesterday, so a
    // streak isn't "broken" before the user has had a chance to act today) ----
    let streak = 0;
    const todayKey = dayKey(new Date());
    const activeToday = (counts.get(todayKey) || 0) > 0;
    for (let i = activeToday ? 0 : 1; i < CALENDAR_DAYS; i++) {
      const key = dayKey(new Date(Date.now() - i * DAY_MS));
      if ((counts.get(key) || 0) > 0) streak++;
      else break;
    }

    // ---- Daily checklist: derived, resets naturally each day ----
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const scannedToday = scans.some((s) => s.createdAt >= startOfToday);
    const editedResumeToday = resumes.some((r) => r.updatedAt >= startOfToday);
    const savedJobToday = savedJobs.some((j) => j.createdAt >= startOfToday);
    const outreachToday = contacts.some((c) => (c.activity || []).some((a) => new Date(a.date) >= startOfToday));
    const overdueReminders = reminders.filter((r) => r.status === 'pending' && r.dueDate <= now).length;

    const checklist = [
      { key: 'improveResume', done: scannedToday || editedResumeToday },
      { key: 'saveJob', done: savedJobToday },
      { key: 'reachOut', done: outreachToday },
      { key: 'clearReminders', done: overdueReminders === 0 },
    ];

    // ---- Weekly report: this week vs last week ----
    const weekAgo = new Date(Date.now() - 7 * DAY_MS);
    const twoWeeksAgo = new Date(Date.now() - 14 * DAY_MS);
    const inRange = (date, from, to) => date && new Date(date) >= from && new Date(date) < to;
    const weekOf = (from, to) => ({
      scans: scans.filter((s) => inRange(s.createdAt, from, to)).length,
      saved: savedJobs.filter((j) => inRange(j.createdAt, from, to)).length,
      applications: savedJobs.filter((j) => inRange(j.appliedAt, from, to)).length,
      outreach: contacts.reduce((n, c) => n + (c.activity || []).filter((a) => inRange(a.date, from, to)).length, 0),
    });
    const weekly = { thisWeek: weekOf(weekAgo, new Date(Date.now() + DAY_MS)), lastWeek: weekOf(twoWeeksAgo, weekAgo) };

    // ---- Interview readiness ----
    const latestScan = scans.find((s) => s.type === 'scan' && typeof s.overall === 'number');
    const readiness = computeReadiness({
      latestScanScore: latestScan?.overall ?? null,
      completionPct: profile?.completionPct ?? 0,
      vaultCount: profile?.vault?.length ?? 0,
      activeApplications: savedJobs.filter((j) => ['applied', 'interviewing', 'offer'].includes(j.status)).length,
      contactedContacts: contacts.filter((c) => c.contacted).length,
    });

    res.json({ streak, activeToday, calendar, checklist, weekly, readiness, overdueReminders });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
