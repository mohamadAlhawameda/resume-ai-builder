// In-process periodic sweep — the same lightweight pattern as
// startBackgroundJobRefresh() in providers/jobs/index.js, no queue/cron
// dependency. Two jobs:
//
//   1. Reminders: newly-due pending reminders get an in-app Notification
//      (once — `notifiedAt` guards against double-notifying).
//   2. Watchlist: new postings at watched companies are scored against the
//      user's profile; strong-enough matches raise a Notification (and an
//      email via the existing job-alert template when the user opted in).
//
// Read-time "due" computation in routes/reminders.js remains the source of
// truth for the dashboard; this sweep only adds proactive notification.

import Reminder from '../models/Reminder.js';
import WatchlistCompany from '../models/WatchlistCompany.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import Resume from '../models/Resume.js';
import CareerProfile from '../models/CareerProfile.js';
import { fetchAllJobs } from '../providers/jobs/index.js';
import { buildMatchContext, scoreJobForUser } from '../utils/jobMatch.js';
import { sendJobAlertEmail } from '../services/email.js';

const SWEEP_INTERVAL_MS = 6 * 60 * 60 * 1000; // every 6 hours
const FIRST_SWEEP_DELAY_MS = 90 * 1000; // let the job cache warm first
const WATCHLIST_MATCH_THRESHOLD = 60;
const MAX_ALERTS_PER_COMPANY = 3;

async function sweepReminders() {
  const now = new Date();
  const due = await Reminder.find({ status: 'pending', dueDate: { $lte: now }, notifiedAt: null }).limit(200);
  for (const reminder of due) {
    await Notification.create({
      userId: reminder.userId,
      type: 'reminder',
      title: reminder.title,
      body: '',
      meta: { reminderId: reminder._id, reminderType: reminder.type, relatedJobId: reminder.relatedJobId || undefined },
    });
    reminder.notifiedAt = now;
    await reminder.save();
  }
  return due.length;
}

async function matchContextForUser(userId) {
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
  const prefs = user.jobPreferences?.toObject ? user.jobPreferences.toObject() : (user.jobPreferences || {});
  return { user, ctx: hasProfile ? buildMatchContext(resumeData, prefs) : null };
}

async function sweepWatchlists() {
  const watches = await WatchlistCompany.find({}).limit(1000);
  if (watches.length === 0) return 0;

  const jobs = await fetchAllJobs();
  const byCompany = new Map();
  for (const j of jobs) {
    const key = (j.company || '').toLowerCase();
    if (!byCompany.has(key)) byCompany.set(key, []);
    byCompany.get(key).push(j);
  }

  // One match context per user, shared across their watched companies.
  const contexts = new Map();
  let alerts = 0;

  for (const watch of watches) {
    try {
    const companyPostings = byCompany.get(watch.companyName.toLowerCase()) || [];
    const seen = new Set(watch.notifiedJobIds);
    const fresh = companyPostings.filter((j) => !seen.has(j.id));
    if (fresh.length === 0) continue;

    const userKey = String(watch.userId);
    if (!contexts.has(userKey)) {
      contexts.set(userKey, await matchContextForUser(watch.userId).catch(() => null));
    }
    const info = contexts.get(userKey);
    if (!info) continue;

    // With a profile: alert only on real matches. Without one: any new
    // posting at a watched company is worth knowing about.
    const alertable = info.ctx
      ? fresh
          .map((j) => ({ job: j, percent: scoreJobForUser(j, info.ctx).percent }))
          .filter((x) => x.percent >= WATCHLIST_MATCH_THRESHOLD)
          .sort((a, b) => b.percent - a.percent)
      : fresh.map((j) => ({ job: j, percent: null }));

    for (const { job, percent } of alertable.slice(0, MAX_ALERTS_PER_COMPANY)) {
      await Notification.create({
        userId: watch.userId,
        type: 'company-watch',
        title: percent !== null ? `${percent}% match at ${job.company}: ${job.title}` : `New at ${job.company}: ${job.title}`,
        body: job.location || '',
        meta: { jobId: job.id, company: job.company, matchPercent: percent ?? undefined },
      });
      if (percent !== null && info.user?.jobPreferences?.emailAlerts) {
        await sendJobAlertEmail(info.user, job, percent).catch(() => {});
      }
      alerts += 1;
    }

    // Mark every fresh posting as seen (even non-alerted ones) so the list
    // stays bounded and a posting is only ever considered once. updateOne
    // (not .save()) so a watch the user deleted/toggled mid-sweep is a no-op
    // instead of a VersionError.
    await WatchlistCompany.updateOne(
      { _id: watch._id },
      { $set: { notifiedJobIds: [...seen, ...fresh.map((j) => j.id)].slice(-500) } }
    );
    } catch (err) {
      // One bad watch entry must never abort the sweep for everyone else.
      console.warn(`Watchlist sweep skipped "${watch.companyName}":`, err.message);
    }
  }
  return alerts;
}

async function runSweep() {
  try {
    const reminders = await sweepReminders();
    const alerts = await sweepWatchlists();
    if (reminders || alerts) {
      console.log(`🔔 Scheduled sweep: ${reminders} reminder notification(s), ${alerts} watchlist alert(s)`);
    }
  } catch (err) {
    console.warn('Scheduled sweep failed:', err.message);
  }
}

export function startScheduledChecks() {
  setTimeout(runSweep, FIRST_SWEEP_DELAY_MS);
  setInterval(runSweep, SWEEP_INTERVAL_MS).unref?.();
}
