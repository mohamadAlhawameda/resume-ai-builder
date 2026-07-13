// Email delivery via SMTP (nodemailer). Activates when SMTP_HOST, SMTP_USER
// and SMTP_PASS are set; otherwise every send is a logged no-op so in-app
// features keep working without email configured.
//
// Works with any SMTP provider. For Gmail: SMTP_HOST=smtp.gmail.com,
// SMTP_PORT=465, SMTP_USER=you@gmail.com, SMTP_PASS=<app password — create one
// at myaccount.google.com/apppasswords; your normal password will not work>.

import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = parseInt(process.env.SMTP_PORT, 10) || 587;
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const FROM = process.env.EMAIL_FROM || (SMTP_USER ? `ResumeAI <${SMTP_USER}>` : '');

export const emailEnabled = () => !!(SMTP_HOST && SMTP_USER && SMTP_PASS);

let transporter = null;
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465, // implicit TLS on 465; STARTTLS otherwise
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return transporter;
}

export async function sendEmail({ to, subject, text }) {
  if (!emailEnabled()) {
    console.log(`📧 [email disabled] Would send to ${to}: ${subject}`);
    return { sent: false, reason: 'email not configured (SMTP_HOST/SMTP_USER/SMTP_PASS)' };
  }
  try {
    await getTransporter().sendMail({ from: FROM, to, subject, text });
    return { sent: true };
  } catch (err) {
    console.warn('Email send failed:', err.message);
    return { sent: false, reason: err.message };
  }
}

const APP_URL = process.env.APP_URL || 'https://your-app-url';

export async function sendWelcomeEmail(user) {
  return sendEmail({
    to: user.email,
    subject: 'Welcome to ResumeAI 🎉',
    text: `Hi ${user.name},

Welcome to ResumeAI! Here's how to get the most out of it:

1. Upload your existing resume (PDF or DOCX) — we'll parse and score it instantly.
2. Review your score and apply the top fixes.
3. Check Job Discovery for live US & Canada postings matched to your resume.
4. Turn on job alerts to get notified when a strong match appears.
5. Use the AI tools for cover letters, interview prep, and outreach messages.

Get started: ${APP_URL}/analyze

— The ResumeAI team`,
  });
}

export async function sendJobAlertEmail(user, job, matchPercent) {
  return sendEmail({
    to: user.email,
    subject: `New ${matchPercent}% job match: ${job.title} at ${job.company}`,
    text: `Hi ${user.name},

"${job.title}" at ${job.company} (${job.location}) matches your resume at ${matchPercent}%.

Matched because: ${(job.match?.reasons || []).slice(0, 2).join(' ') || 'strong skill overlap with your resume.'}

Apply directly: ${job.url || `${APP_URL}/jobs`}
Prep for it (match report, cover letter, interview questions): ${APP_URL}/jobs?tab=saved

You're receiving this because email alerts are enabled in your job preferences (${APP_URL}/jobs?tab=preferences).

— ResumeAI`,
  });
}

export async function sendApplicationStatusEmail(user, savedJob, status) {
  const { title, company } = savedJob.job || {};
  const messages = {
    applied: {
      subject: `Application sent: ${title} at ${company} ✅`,
      body: `Nice work applying to "${title}" at ${company}!

Suggested next steps:
- No reply after ~7 days? Generate a follow-up email: ${APP_URL}/tools?tool=follow-up-email
- Start preparing: ${APP_URL}/tools?tool=interview-prep`,
    },
    interviewing: {
      subject: `Interview stage: ${title} at ${company} 🎤`,
      body: `You're interviewing for "${title}" at ${company} — great progress!

Get ready:
- Practice likely questions with STAR hints: ${APP_URL}/tools?tool=interview-prep
- After the interview, send a thank-you note: ${APP_URL}/tools?tool=thank-you-email`,
    },
    offer: {
      subject: `Offer received: ${title} at ${company} 🎉`,
      body: `Congratulations on your offer from ${company}! Take a moment to celebrate — you earned it.`,
    },
  };
  const msg = messages[status];
  if (!msg) return { sent: false, reason: 'no email for this status' };
  return sendEmail({
    to: user.email,
    subject: msg.subject,
    text: `Hi ${user.name},\n\n${msg.body}\n\n— ResumeAI`,
  });
}
