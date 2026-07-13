// Email notification stub. In-app notifications work out of the box;
// email delivery activates when SMTP-style credentials are provided.
//
// To enable real email, set EMAIL_PROVIDER and its credentials, then plug a
// transport in below (e.g. `nodemailer` for SMTP, or the Resend/SendGrid SDK).
// Until then we log the payload so development flows are visible.

const EMAIL_ENABLED = !!process.env.EMAIL_PROVIDER;

export async function sendEmail({ to, subject, text }) {
  if (!EMAIL_ENABLED) {
    console.log(`📧 [email disabled] Would send to ${to}: ${subject}\n${text}`);
    return { sent: false, reason: 'EMAIL_PROVIDER not configured' };
  }

  // TODO: wire a real transport here based on process.env.EMAIL_PROVIDER
  // ('smtp' → nodemailer, 'resend' → Resend SDK, etc.)
  console.log(`📧 [email stub] to ${to}: ${subject}`);
  return { sent: false, reason: 'transport not implemented' };
}

export async function sendJobAlertEmail(user, job, matchPercent) {
  return sendEmail({
    to: user.email,
    subject: `New ${matchPercent}% job match: ${job.title} at ${job.company}`,
    text: `Hi ${user.name},\n\n"${job.title}" at ${job.company} (${job.location}) matches your resume at ${matchPercent}%.\n\nView it in your job discovery page.\n\n— ResumeAI`,
  });
}
