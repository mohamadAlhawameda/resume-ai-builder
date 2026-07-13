// Deterministic resume ↔ job-description comparison.

import {
  resumeToText,
  tokenize,
  findSkillsInText,
  clampScore,
  STOPWORDS,
} from './text.js';

/** Pull requirement-style lines (years of experience, degrees, certs) from a JD. */
function extractQualifications(jdText) {
  const quals = [];
  for (const raw of jdText.split('\n')) {
    const line = raw.trim().replace(/^[-•*]\s*/, '');
    if (!line || line.length > 220) continue;
    if (
      /\b\d+\+?\s*(?:years?|yrs?)\b/i.test(line) ||
      /\b(bachelor'?s?|master'?s?|phd|mba|degree|diploma|certification|certified|license[d]?)\b/i.test(line)
    ) {
      quals.push(line);
    }
  }
  return [...new Set(quals)].slice(0, 10);
}

/** Salient non-skill keywords from the JD by frequency. */
function extractKeywords(jdText, skills) {
  const skillTokens = new Set(skills.flatMap((s) => s.split(/\s+/)));
  const freq = {};
  for (const t of tokenize(jdText)) {
    if (STOPWORDS.has(t) || skillTokens.has(t) || t.length < 3 || /^\d+$/.test(t)) continue;
    freq[t] = (freq[t] || 0) + 1;
  }
  return Object.entries(freq)
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .map(([w]) => w);
}

/**
 * Compare a resume against a job description.
 * Returns match %, matched/missing keywords & skills, missing qualifications,
 * a no-stuffing keyword plan, and deterministic bullet-rewrite templates.
 */
export function matchResumeToJob(resumeData, jobDescription, jobTitle = '') {
  const resumeText = resumeToText(resumeData).toLowerCase();
  const resumeTokens = new Set(tokenize(resumeText));

  const jdSkills = findSkillsInText(jobDescription);
  const resumeSkills = new Set(findSkillsInText(resumeText).map((s) => s.toLowerCase()));

  const matchedSkills = jdSkills.filter((s) => resumeSkills.has(s.toLowerCase()));
  const missingSkills = jdSkills.filter((s) => !resumeSkills.has(s.toLowerCase()));

  const keywords = extractKeywords(jobDescription, jdSkills);
  const matchedKeywords = keywords.filter((k) => resumeTokens.has(k) || resumeText.includes(k));
  const missingKeywords = keywords.filter((k) => !matchedKeywords.includes(k)).slice(0, 15);

  const qualifications = extractQualifications(jobDescription);
  const missingQualifications = qualifications.filter((q) => {
    const qTokens = tokenize(q).filter((t) => t.length > 3);
    if (qTokens.length === 0) return false;
    const hits = qTokens.filter((t) => resumeTokens.has(t)).length;
    return hits / qTokens.length < 0.4;
  });

  // Title overlap
  const titleTokens = tokenize(jobTitle || '');
  const titleHits = titleTokens.filter((t) => resumeText.includes(t)).length;
  const titleRatio = titleTokens.length ? titleHits / titleTokens.length : 1;

  const skillRatio = jdSkills.length ? matchedSkills.length / jdSkills.length : 0.5;
  const keywordRatio = keywords.length ? matchedKeywords.length / keywords.length : 0.5;
  const qualRatio = qualifications.length
    ? (qualifications.length - missingQualifications.length) / qualifications.length
    : 0.7;

  const matchPercent = clampScore(
    skillRatio * 55 + keywordRatio * 20 + titleRatio * 10 + qualRatio * 15
  );

  const summary =
    matchPercent >= 80
      ? 'Excellent match — your resume already covers most of what this job asks for. Tighten the remaining gaps and apply.'
      : matchPercent >= 60
      ? 'Good match — you cover the core requirements, but adding the missing skills and keywords below would materially improve your chances.'
      : matchPercent >= 40
      ? 'Partial match — several key requirements are missing from your resume. Address the gaps below before applying.'
      : 'Weak match — this role asks for significantly different skills than your resume currently shows. Consider tailoring heavily or targeting closer roles.';

  // Honest, no-stuffing keyword plan
  const keywordPlan = [];
  if (missingSkills.length) {
    keywordPlan.push(
      `You genuinely have some of these? Add them where you used them: ${missingSkills.slice(0, 6).join(', ')} — mention each inside a real experience bullet, not just the skills list.`
    );
  }
  if (missingKeywords.length) {
    keywordPlan.push(
      `Work these terms into your summary or bullets where they truthfully apply: ${missingKeywords.slice(0, 8).join(', ')}.`
    );
  }
  keywordPlan.push('Mirror the job title wording in your summary if it matches your experience.');
  keywordPlan.push('Never add keywords for work you have not done — ATS gets you the interview, but the interview verifies the resume.');

  // Deterministic bullet-rewrite guidance (AI route can replace these with real rewrites)
  const bulletRewrites = [];
  const bullets = (resumeData.experience || [])
    .flatMap((e) => (e.description || '').split('\n'))
    .map((b) => b.trim().replace(/^[-•*]\s*/, ''))
    .filter(Boolean);
  for (const b of bullets.slice(0, 4)) {
    const relevantMissing = missingSkills[0] || missingKeywords[0];
    if (!relevantMissing) break;
    bulletRewrites.push({
      original: b,
      improved: '',
      reason: `If this work involved ${relevantMissing}, name it explicitly so the match is visible to ATS and recruiters.`,
    });
  }

  return {
    matchPercent,
    summary,
    matchedKeywords: matchedKeywords.slice(0, 20),
    missingKeywords,
    matchedSkills,
    missingSkills,
    missingQualifications,
    keywordPlan,
    bulletRewrites,
    jobTitle: jobTitle || '',
  };
}

/**
 * Score a provider job against resume + user preferences.
 * Returns { percent, matchedSkills, missingSkills, reasons } for job cards.
 */
export function scoreJobForUser(job, resumeData, prefs = {}) {
  const resumeText = resumeToText(resumeData || {}).toLowerCase();
  const resumeSkills = new Set(findSkillsInText(resumeText).map((s) => s.toLowerCase()));
  const userSkills = new Set((prefs.skills || []).map((s) => s.toLowerCase()));

  const jobSkills = job.skills?.length
    ? job.skills
    : findSkillsInText(`${job.title} ${job.description}`);

  const matchedSkills = jobSkills.filter(
    (s) => resumeSkills.has(s.toLowerCase()) || userSkills.has(s.toLowerCase())
  );
  const missingSkills = jobSkills.filter((s) => !matchedSkills.includes(s));

  const skillRatio = jobSkills.length ? matchedSkills.length / jobSkills.length : 0.4;

  // Title preference overlap
  const titles = prefs.titles || [];
  const titleMatch = titles.some((t) =>
    job.title.toLowerCase().includes(t.toLowerCase()) || t.toLowerCase().includes(job.title.toLowerCase())
  );
  const roleWords = tokenize(titles.join(' '));
  const partialTitle = roleWords.some((w) => job.title.toLowerCase().includes(w));

  // Location / remote preference
  const locations = prefs.locations || [];
  const locationMatch =
    job.remote === 'remote' ||
    locations.length === 0 ||
    locations.some((l) => job.location.toLowerCase().includes(l.toLowerCase()));

  const remoteOk =
    !prefs.remote || prefs.remote === 'any' || job.remote === 'unknown' || job.remote === prefs.remote;

  const workTypeOk =
    !prefs.workType || prefs.workType === 'any' || !job.workType ||
    job.workType.toLowerCase().replace(/\s/g, '-') === prefs.workType;

  const salaryOk =
    !prefs.salaryMin || !job.salaryMax || job.salaryMax >= prefs.salaryMin;

  let percent =
    skillRatio * 55 +
    (titleMatch ? 20 : partialTitle ? 10 : 0) +
    (locationMatch ? 10 : 0) +
    (remoteOk ? 7 : 0) +
    (workTypeOk ? 4 : 0) +
    (salaryOk ? 4 : 0);
  percent = clampScore(percent);

  const reasons = [];
  if (matchedSkills.length) reasons.push(`You match ${matchedSkills.length}/${jobSkills.length} required skills.`);
  if (titleMatch) reasons.push('Job title matches your preferred roles.');
  else if (partialTitle) reasons.push('Job title partially matches your preferred roles.');
  if (job.remote === 'remote' && prefs.remote === 'remote') reasons.push('Remote role, matching your preference.');
  if (locationMatch && locations.length > 0 && job.remote !== 'remote') reasons.push('Located in one of your preferred areas.');
  if (!salaryOk) reasons.push('Salary may be below your minimum.');
  if (missingSkills.length) reasons.push(`Missing from your resume: ${missingSkills.slice(0, 4).join(', ')}.`);

  return {
    percent,
    matchedSkills,
    missingSkills: missingSkills.slice(0, 8),
    reasons: reasons.slice(0, 4),
  };
}
