// Resume import pipeline: file → text → structured resume data.
// 1. Deterministic heuristic parse (always runs, works offline).
// 2. Optional AI structuring pass that can organize sections better — but its
//    output is filtered so only content verbatim-present in the source file
//    survives. The AI can reorganize; it can never invent.

import {
  extractTextFromFile,
  parseResumeText,
  appearsInSource,
} from '../utils/parseResume.js';
import { aiAvailable, chatJSON, truncate } from './ai.js';

const clampStr = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

function sanitizeAiResult(ai, source) {
  if (!ai || typeof ai !== 'object') return null;

  const skills = Array.isArray(ai.skills)
    ? ai.skills
        .map((s) => clampStr(s, 50))
        .filter((s) => s.length >= 2 && appearsInSource(s, source))
    : [];

  const experience = Array.isArray(ai.experience)
    ? ai.experience
        .map((e) => ({
          company: clampStr(e?.company, 300),
          role: clampStr(e?.role, 300),
          from: clampStr(e?.from, 40),
          to: clampStr(e?.to, 40),
          description: (typeof e?.description === 'string' ? e.description : '')
            .split('\n')
            .map((l) => l.trim().replace(/^[-•*]\s*/, ''))
            .filter((l) => l && appearsInSource(l, source))
            .join('\n')
            .slice(0, 8000),
        }))
        .filter(
          (e) =>
            (e.company && appearsInSource(e.company, source)) ||
            (e.role && appearsInSource(e.role, source))
        )
        .slice(0, 30)
    : [];

  const education = Array.isArray(ai.education)
    ? ai.education
        .map((e) => ({
          school: clampStr(e?.school, 300),
          degree: clampStr(e?.degree, 300),
          from: clampStr(e?.from, 40),
          to: clampStr(e?.to, 40),
          achievements: clampStr(e?.achievements, 3000),
        }))
        .filter(
          (e) =>
            (e.school && appearsInSource(e.school, source)) ||
            (e.degree && appearsInSource(e.degree, source))
        )
        .slice(0, 20)
    : [];

  const summary = clampStr(ai.summary, 5000);

  return {
    fullName: clampStr(ai.fullName, 200),
    city: clampStr(ai.city, 120),
    title: clampStr(ai.title, 160),
    summary: summary && appearsInSource(summary, source) ? summary : '',
    skills,
    experience,
    education,
  };
}

async function aiStructure(source) {
  const out = await chatJSON({
    system:
      'You are a resume parser. Extract structured data from raw resume text. STRICT RULES: copy every value VERBATIM from the text — never invent, infer, paraphrase, or embellish anything. If a field is not present, use an empty string or empty array. Dates: copy as written. Description: the entry\'s bullet lines joined with \\n, each copied exactly. Return JSON: {"fullName":"","title":"","city":"","summary":"","skills":["..."],"experience":[{"company":"","role":"","from":"","to":"","description":""}],"education":[{"school":"","degree":"","from":"","to":"","achievements":""}]}',
    user: `Resume text:\n\n${truncate(source, 7000)}`,
    maxTokens: 1800,
  });
  return sanitizeAiResult(out, source);
}

function mergeParsed(heuristic, ai) {
  const merged = { ...heuristic };

  // Contact fields found by regex are ground truth; AI only fills gaps.
  if (!merged.fullName && ai.fullName) merged.fullName = ai.fullName;
  if (!merged.city && ai.city) merged.city = ai.city;
  if (ai.title) merged.title = ai.title;
  if (ai.summary) merged.summary = ai.summary;

  // Prefer whichever pass recovered more entries — both are source-validated.
  if (ai.experience.length >= merged.experience.length && ai.experience.length > 0) {
    merged.experience = ai.experience;
  }
  if (ai.education.length >= merged.education.length && ai.education.length > 0) {
    merged.education = ai.education;
  }

  const seen = new Set(merged.skills.map((s) => s.toLowerCase()));
  for (const s of ai.skills) {
    if (merged.skills.length >= 60) break;
    if (!seen.has(s.toLowerCase())) {
      merged.skills.push(s);
      seen.add(s.toLowerCase());
    }
  }
  return merged;
}

function buildWarnings(data, previousWarnings) {
  // Keep section-mapping notices from the heuristic pass; regenerate the
  // missing-field ones against the final merged data.
  const warnings = previousWarnings.filter((w) => /added to|imported as/i.test(w));
  if (!data.fullName) warnings.push('Could not detect your name — please add it.');
  if (!data.email) warnings.push('No email address found in the file.');
  if (data.experience.length === 0) warnings.push('No work experience entries were detected — add them in the builder.');
  if (data.education.length === 0) warnings.push('No education section was detected.');
  if (data.skills.length === 0) warnings.push('No skills section was detected — add your key skills.');
  if (!data.summary) warnings.push('No professional summary was found — the builder can help you write one.');
  return warnings;
}

function computeConfidence(data) {
  const found = [
    !!data.fullName,
    !!data.email,
    !!data.summary,
    data.experience.length > 0,
    data.education.length > 0,
    data.skills.length > 0,
  ];
  return Math.round((found.filter(Boolean).length / found.length) * 100);
}

export async function importResumeFromFile(buffer, mimetype, filename) {
  const text = (await extractTextFromFile(buffer, mimetype, filename)).trim();

  if (text.replace(/\s+/g, ' ').length < 80) {
    const err = new Error(
      'We could not read any text from this file. If it is a scanned or image-based PDF, export a text-based version and try again.'
    );
    err.status = 422;
    throw err;
  }

  const heuristic = parseResumeText(text);
  let data = heuristic.data;
  let aiUsed = false;

  if (aiAvailable()) {
    try {
      const ai = await aiStructure(text);
      if (ai) {
        data = mergeParsed(heuristic.data, ai);
        aiUsed = true;
      }
    } catch (e) {
      console.warn('AI resume structuring failed, using heuristic parse:', e.message);
    }
  }

  return {
    data,
    warnings: buildWarnings(data, heuristic.warnings),
    confidence: computeConfidence(data),
    detectedSections: heuristic.detectedSections,
    aiUsed,
  };
}
