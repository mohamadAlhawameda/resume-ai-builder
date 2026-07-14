// Email delivery via SMTP (nodemailer). Activates when SMTP_HOST, SMTP_USER
// and SMTP_PASS are set; otherwise every send is a logged no-op so in-app
// features keep working without email configured.
//
// Works with any SMTP provider. For Gmail: SMTP_HOST=smtp.gmail.com,
// SMTP_PORT=465, SMTP_USER=you@gmail.com, SMTP_PASS=<app password — create one
// at myaccount.google.com/apppasswords; your normal password will not work>.

import nodemailer from 'nodemailer';
import { emailLayout, ctaButton, infoCard, bulletList, paragraph, heading, escapeHtml } from './emailTemplates.js';

const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = parseInt(process.env.SMTP_PORT, 10) || 587;
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const FROM = process.env.EMAIL_FROM || (SMTP_USER ? `Rolevant AI <${SMTP_USER}>` : '');

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

// Every email is sent multipart (text + html) — text is the fallback for
// clients that don't render HTML and helps deliverability/spam scoring;
// html is the branded, professional version most recipients actually see.
export async function sendEmail({ to, subject, text, html }) {
  if (!emailEnabled()) {
    console.log(`📧 [email disabled] Would send to ${to}: ${subject}`);
    return { sent: false, reason: 'email not configured (SMTP_HOST/SMTP_USER/SMTP_PASS)' };
  }
  try {
    await getTransporter().sendMail({ from: FROM, to, subject, text, html });
    return { sent: true };
  } catch (err) {
    console.warn('Email send failed:', err.message);
    return { sent: false, reason: err.message };
  }
}

const APP_URL = process.env.APP_URL || 'https://your-app-url';

export async function sendWelcomeEmail(user) {
  const name = escapeHtml(user.name || 'there');
  const html = emailLayout({
    preheader: "Here's how to get the most out of Rolevant AI.",
    title: 'Welcome to Rolevant AI',
    bodyHtml: `
      ${heading(`Welcome, ${user.name || 'there'} 🎉`)}
      ${paragraph(`Hi ${name}, welcome to Rolevant AI! Here's how to get the most out of it:`)}
      ${bulletList([
        'Upload your existing resume (PDF or DOCX) — we’ll parse and score it instantly.',
        'Review your score and apply the top fixes.',
        'Check Job Discovery for live US & Canada postings matched to your resume.',
        'Turn on job alerts to get notified when a strong match appears.',
        'Use the AI tools for cover letters, interview prep, and outreach messages.',
      ])}
      ${ctaButton('Get started', `${APP_URL}/analyze`)}
    `,
    footerNote: "You're receiving this because you created a Rolevant AI account.",
  });
  return sendEmail({
    to: user.email,
    subject: 'Welcome to Rolevant AI 🎉',
    text: `Hi ${user.name},

Welcome to Rolevant AI! Here's how to get the most out of it:

1. Upload your existing resume (PDF or DOCX) — we'll parse and score it instantly.
2. Review your score and apply the top fixes.
3. Check Job Discovery for live US & Canada postings matched to your resume.
4. Turn on job alerts to get notified when a strong match appears.
5. Use the AI tools for cover letters, interview prep, and outreach messages.

Get started: ${APP_URL}/analyze

— The Rolevant AI team`,
    html,
  });
}

export async function sendJobAlertEmail(user, job, matchPercent) {
  const reasonText = (job.match?.reasons || []).slice(0, 2).join(' ') || 'Strong skill overlap with your resume.';
  const html = emailLayout({
    preheader: `"${job.title}" at ${job.company} matches your resume at ${matchPercent}%.`,
    title: 'New job match',
    bodyHtml: `
      ${heading(`New ${matchPercent}% job match`)}
      ${paragraph(`Hi ${escapeHtml(user.name || 'there')}, <strong>${escapeHtml(job.title)}</strong> matches your resume.`)}
      ${infoCard([
        ['Company', job.company || '—'],
        ['Location', job.location || '—'],
        ['Match score', `${matchPercent}%`],
      ])}
      ${paragraph(`<span style="color:#64748b;">Matched because: ${escapeHtml(reasonText)}</span>`)}
      ${ctaButton('View & apply', job.url || `${APP_URL}/jobs`)}
      ${paragraph(`Want a tailored cover letter or interview prep for this role first? <a href="${escapeHtml(`${APP_URL}/jobs?tab=saved`)}" style="color:#2563eb; font-weight:600; text-decoration:none;">Open it in Rolevant AI</a>.`)}
    `,
    footerNote: `You're receiving this because email alerts are enabled in your <a href="${escapeHtml(`${APP_URL}/jobs?tab=preferences`)}" style="color:#64748b;">job preferences</a>.`,
  });
  return sendEmail({
    to: user.email,
    subject: `New ${matchPercent}% job match: ${job.title} at ${job.company}`,
    text: `Hi ${user.name},

"${job.title}" at ${job.company} (${job.location}) matches your resume at ${matchPercent}%.

Matched because: ${reasonText}

Apply directly: ${job.url || `${APP_URL}/jobs`}
Prep for it (match report, cover letter, interview questions): ${APP_URL}/jobs?tab=saved

You're receiving this because email alerts are enabled in your job preferences (${APP_URL}/jobs?tab=preferences).

— Rolevant AI`,
    html,
  });
}

export async function sendApplicationStatusEmail(user, savedJob, status) {
  const { title, company } = savedJob.job || {};
  const messages = {
    applied: {
      subject: `Application sent: ${title} at ${company} ✅`,
      heading: 'Application sent ✅',
      intro: `Nice work applying to <strong>${escapeHtml(title)}</strong> at ${escapeHtml(company)}!`,
      steps: [
        { text: 'Generate a follow-up email', url: `${APP_URL}/tools?tool=follow-up-email`, suffix: ' if there’s no reply after ~7 days.' },
        { text: 'Start interview prep', url: `${APP_URL}/tools?tool=interview-prep`, suffix: ' now, before you need it.' },
      ],
      text: `Nice work applying to "${title}" at ${company}!

Suggested next steps:
- No reply after ~7 days? Generate a follow-up email: ${APP_URL}/tools?tool=follow-up-email
- Start preparing: ${APP_URL}/tools?tool=interview-prep`,
    },
    interviewing: {
      subject: `Interview stage: ${title} at ${company} 🎤`,
      heading: 'Interview stage 🎤',
      intro: `You're interviewing for <strong>${escapeHtml(title)}</strong> at ${escapeHtml(company)} — great progress!`,
      steps: [
        { text: 'Practice likely questions', url: `${APP_URL}/tools?tool=interview-prep`, suffix: ' with STAR-method hints.' },
        { text: 'Send a thank-you note', url: `${APP_URL}/tools?tool=thank-you-email`, suffix: ' right after the interview.' },
      ],
      text: `You're interviewing for "${title}" at ${company} — great progress!

Get ready:
- Practice likely questions with STAR hints: ${APP_URL}/tools?tool=interview-prep
- After the interview, send a thank-you note: ${APP_URL}/tools?tool=thank-you-email`,
    },
    offer: {
      subject: `Offer received: ${title} at ${company} 🎉`,
      heading: 'Offer received 🎉',
      intro: `Congratulations on your offer from <strong>${escapeHtml(company)}</strong>! Take a moment to celebrate — you earned it.`,
      steps: [],
      text: `Congratulations on your offer from ${company}! Take a moment to celebrate — you earned it.`,
    },
  };
  const msg = messages[status];
  if (!msg) return { sent: false, reason: 'no email for this status' };

  const html = emailLayout({
    preheader: msg.intro.replace(/<[^>]+>/g, ''),
    title: msg.heading,
    bodyHtml: `
      ${heading(msg.heading)}
      ${paragraph(`Hi ${escapeHtml(user.name || 'there')},`)}
      ${paragraph(msg.intro)}
      ${msg.steps.length ? bulletList(msg.steps) : ''}
    `,
    footerNote: `You're receiving this because email alerts are enabled in your <a href="${escapeHtml(`${APP_URL}/jobs?tab=preferences`)}" style="color:#64748b;">job preferences</a>.`,
  });

  return sendEmail({
    to: user.email,
    subject: msg.subject,
    text: `Hi ${user.name},\n\n${msg.text}\n\n— Rolevant AI`,
    html,
  });
}
