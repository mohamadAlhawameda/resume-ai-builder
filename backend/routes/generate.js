// AI content generation. Clients send structured fields (never raw prompts);
// prompts are assembled server-side, inputs are truncated, and every request
// is authenticated and rate-limited. When OPENAI_API_KEY is missing, each
// generator returns a sensible deterministic fallback so the app still works.

import express from 'express';
import Joi from 'joi';
import rateLimit from 'express-rate-limit';
import authMiddleware from '../middleware/authMiddleware.js';
import { validateBody, resumeDataSchema } from '../utils/validate.js';
import { aiAvailable, chatJSON, chatText, truncate } from '../services/ai.js';
import { resumeToText, ACTION_VERBS } from '../utils/text.js';

const router = express.Router();
router.use(authMiddleware);

// Per-user rate limit on top of the global limiter — AI calls cost money.
const aiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  keyGenerator: (req) => req.user?.userId || req.ip,
  message: { message: 'AI request limit reached — please wait a few minutes and try again.' },
  standardHeaders: true,
  legacyHeaders: false,
});
router.use(aiLimiter);

const baseSchema = Joi.object({
  type: Joi.string()
    .valid('summary', 'bullets', 'skills', 'achievements', 'cover-letter', 'linkedin-summary', 'bio', 'tailor-bullets')
    .required(),
  data: resumeDataSchema.required(),
  // Optional context depending on type
  jobDescription: Joi.string().allow('').max(20000).default(''),
  jobTitle: Joi.string().allow('').max(200).default(''),
  company: Joi.string().allow('').max(200).default(''),
  targetRole: Joi.string().allow('').max(200).default(''),
  tone: Joi.string().valid('professional', 'confident', 'friendly').default('professional'),
  experienceIndex: Joi.number().integer().min(0).max(29).optional(),
});

function fallbackFor(type, body) {
  const { data, targetRole, jobTitle, company } = body;
  const name = data.fullName || 'I';
  const role = targetRole || data.targetRole || jobTitle || 'professional';
  const skills = (data.skills || []).filter(Boolean).slice(0, 5).join(', ');
  const years = (data.experience || []).length;

  switch (type) {
    case 'summary':
      return {
        suggestions: [
          `${role.charAt(0).toUpperCase() + role.slice(1)} with hands-on experience across ${years || 'several'} role(s), skilled in ${skills || 'core industry tools'}. Known for delivering measurable results and learning fast.`,
          `Results-focused ${role} combining ${skills || 'practical skills'} with strong collaboration. Seeking to contribute to a team where impact is measured and ownership is expected.`,
        ],
      };
    case 'skills':
      return {
        suggestions: ['Communication', 'Problem solving', 'Time management', 'Teamwork', 'Adaptability', 'Attention to detail', 'Critical thinking', 'Leadership', 'Organization'],
      };
    case 'bullets':
    case 'achievements':
      return {
        suggestions: [
          'Delivered [project/feature] that [measurable outcome, e.g. "cut processing time 30%"].',
          `${ACTION_VERBS[44][0].toUpperCase() + ACTION_VERBS[44].slice(1)} [process/system], improving [metric] by [X%].`,
          'Led [initiative] across [team size] people, completing it [ahead of schedule / under budget].',
        ],
      };
    case 'cover-letter':
      return {
        text: `Dear Hiring Manager,\n\nI am excited to apply for the ${jobTitle || role} position${company ? ` at ${company}` : ''}. With experience in ${skills || 'my field'}, I am confident I can contribute from day one.\n\n[Add 1–2 sentences connecting your strongest achievement to the job's top requirement.]\n\n[Add 1 sentence on why this company specifically.]\n\nI would welcome the opportunity to discuss how my background aligns with your needs.\n\nSincerely,\n${data.fullName || '[Your name]'}`,
      };
    case 'linkedin-summary':
      return {
        text: `${role.charAt(0).toUpperCase() + role.slice(1)} with experience in ${skills || 'my field'}.\n\nI focus on delivering measurable results — [add your strongest metric here].\n\nCurrently open to ${role} opportunities. Let's connect!`,
      };
    case 'bio':
      return {
        text: `${name} is a ${role} experienced in ${skills || 'their field'}, focused on delivering practical, measurable results.`,
      };
    case 'tailor-bullets':
      return { rewrites: [] };
    default:
      return { suggestions: [] };
  }
}

router.post('/', validateBody(baseSchema), async (req, res) => {
  const body = req.body;
  const { type, data } = body;

  if (!aiAvailable()) {
    return res.json({ ...fallbackFor(type, body), aiUsed: false });
  }

  const resumeText = truncate(resumeToText(data), 3500);
  const jd = truncate(body.jobDescription, 3500);

  try {
    switch (type) {
      case 'summary': {
        const out = await chatJSON({
          system:
            'You are an expert resume writer. Write professional summaries: 2–4 sentences, third person implied (no "I"), specific, keyword-rich but natural, no clichés like "team player". Return JSON: {"suggestions":["...","...","..."]} with 3 distinct options.',
          user: `Target role: ${body.targetRole || data.targetRole || 'not specified'}\nTone: ${body.tone}\n\nResume:\n${resumeText}${jd ? `\n\nTailor toward this job description:\n${jd}` : ''}`,
        });
        return res.json({ suggestions: (out.suggestions || []).slice(0, 3), aiUsed: true });
      }

      case 'bullets': {
        const exp = data.experience?.[body.experienceIndex ?? 0];
        if (!exp?.description?.trim()) {
          return res.status(400).json({ message: 'That experience entry has no description to improve.' });
        }
        const out = await chatJSON({
          system:
            'You are an expert resume writer. Rewrite the given job description into 3–5 strong resume bullets. Each starts with a powerful action verb, is one line, and includes a measurable result where the input supports it (never invent metrics — use [X%] placeholders instead). Return JSON: {"suggestions":["...","..."]}',
          user: `Role: ${exp.role || ''} at ${exp.company || ''}\n\nCurrent description:\n${truncate(exp.description, 2000)}`,
        });
        return res.json({ suggestions: (out.suggestions || []).slice(0, 5), aiUsed: true });
      }

      case 'skills': {
        const out = await chatJSON({
          system:
            'You are a resume expert. Based on the resume, suggest 10–12 skills the candidate plausibly has but may not have listed: mix technical and interpersonal, specific over generic. Return JSON: {"suggestions":["skill1","skill2",...]}',
          user: `Resume:\n${resumeText}\n\nAlready listed: ${(data.skills || []).join(', ') || 'none'}${jd ? `\n\nPrioritize skills relevant to:\n${jd}` : ''}`,
        });
        return res.json({ suggestions: (out.suggestions || []).slice(0, 12), aiUsed: true });
      }

      case 'achievements': {
        const out = await chatJSON({
          system:
            'You are a resume coach. Draft 4–6 achievement bullet templates grounded in the candidate\'s actual experience, each starting with an action verb and containing a [placeholder] where they should insert their real metric. Never fabricate specific numbers. Return JSON: {"suggestions":["..."]}',
          user: `Resume:\n${resumeText}`,
        });
        return res.json({ suggestions: (out.suggestions || []).slice(0, 6), aiUsed: true });
      }

      case 'cover-letter': {
        const text = await chatText({
          system:
            'You are an expert cover letter writer. Write a concise (250–350 word), specific cover letter grounded ONLY in the resume provided — never invent employers, titles, or accomplishments. Structure: hook tied to the company/role, 1–2 paragraphs mapping the candidate\'s real achievements to the job requirements, brief close. No placeholder brackets unless information is missing. Plain text, no markdown.',
          user: `Job title: ${body.jobTitle || 'not specified'}\nCompany: ${body.company || 'not specified'}\nTone: ${body.tone}\n\nJob description:\n${jd || 'not provided'}\n\nResume:\n${resumeText}`,
          maxTokens: 700,
        });
        return res.json({ text, aiUsed: true });
      }

      case 'linkedin-summary': {
        const text = await chatText({
          system:
            'Write a LinkedIn "About" section (120–200 words) in first person: authentic, specific, results-oriented, light on buzzwords, ending with what the person is looking for. Ground it only in the resume provided. Plain text.',
          user: `Target role: ${body.targetRole || data.targetRole || 'not specified'}\nTone: ${body.tone}\n\nResume:\n${resumeText}`,
          maxTokens: 450,
        });
        return res.json({ text, aiUsed: true });
      }

      case 'bio': {
        const text = await chatText({
          system:
            'Write a short professional bio (40–70 words, third person) suitable for a portfolio or conference page. Ground it only in the resume provided. Plain text.',
          user: `Resume:\n${resumeText}`,
          maxTokens: 200,
        });
        return res.json({ text, aiUsed: true });
      }

      case 'tailor-bullets': {
        if (!jd) return res.status(400).json({ message: 'jobDescription is required for tailor-bullets.' });
        const bullets = (data.experience || [])
          .flatMap((e) => (e.description || '').split('\n'))
          .map((b) => b.trim().replace(/^[-•*]\s*/, ''))
          .filter((b) => b.length > 15)
          .slice(0, 8);
        const out = await chatJSON({
          system:
            'Rewrite resume bullets to align with a job description WITHOUT inventing experience. Keep real metrics, use the job\'s terminology only where truthful. Return JSON: {"rewrites":[{"original":"...","improved":"...","reason":"..."}]}',
          user: `Job description:\n${jd}\n\nBullets:\n${bullets.map((b) => `- ${b}`).join('\n')}`,
          maxTokens: 1000,
        });
        return res.json({ rewrites: (out.rewrites || []).slice(0, 8), aiUsed: true });
      }

      default:
        return res.status(400).json({ message: 'Unknown generation type' });
    }
  } catch (err) {
    console.error('AI generation failed:', err.message);
    // Graceful degradation: deterministic fallback instead of a hard error.
    return res.json({ ...fallbackFor(type, body), aiUsed: false, degraded: true });
  }
});

export default router;
