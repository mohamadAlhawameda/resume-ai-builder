// Deterministic resume ↔ job-description comparison.

import {
  resumeToText,
  tokenize,
  findSkillsInText,
  clampScore,
  STOPWORDS,
} from './text.js';
import { matchFamilies } from './occupationTaxonomy.js';

const DEGREE_LEVELS = [
  { rank: 1, re: /\bhigh school\b/i },
  { rank: 2, re: /\b(associate'?s?|diploma)\b/i },
  { rank: 3, re: /\b(bachelor'?s?|b\.?sc|b\.?a\.?|b\.?eng|b\.?tech)\b/i },
  { rank: 4, re: /\b(master'?s?|m\.?sc|m\.?a\.?|m\.?b\.?a|m\.?eng)\b/i },
  { rank: 5, re: /\b(ph\.?d|doctorate)\b/i },
];

function degreeLevel(text = '') {
  let max = 0;
  for (const { rank, re } of DEGREE_LEVELS) if (re.test(text)) max = Math.max(max, rank);
  return max;
}

const SENIORITY_WORDS = [
  { rank: 1, re: /\b(intern|internship|entry.level|junior|jr\.?)\b/i },
  { rank: 2, re: /\b(associate)\b/i },
  { rank: 3, re: /\b(mid.level)\b/i }, // default tier when nothing else matches
  { rank: 4, re: /\b(senior|sr\.?)\b/i },
  { rank: 5, re: /\b(lead|principal|staff)\b/i },
  { rank: 6, re: /\b(manager|director|head of|vp|vice president|chief|c[a-z]o)\b/i },
];

function seniorityRank(text = '') {
  let max = 0;
  for (const { rank, re } of SENIORITY_WORDS) if (re.test(text)) max = Math.max(max, rank);
  return max || 3; // assume mid-level when no explicit signal
}

/** Rough total years of experience from date ranges like "Jan 2020" / "2018" / "Present". */
function estimateExperienceYears(resumeData) {
  const now = new Date();
  let totalMonths = 0;
  for (const exp of resumeData.experience || []) {
    const from = parseLooseDate(exp.from);
    const to = /present|current|now/i.test(exp.to || '') ? now : parseLooseDate(exp.to) || now;
    if (from) {
      const months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
      if (months > 0) totalMonths += months;
    }
  }
  return Math.round((totalMonths / 12) * 10) / 10;
}

function parseLooseDate(str = '') {
  if (!str) return null;
  const yearMatch = str.match(/\b(19|20)\d{2}\b/);
  if (!yearMatch) return null;
  const year = parseInt(yearMatch[0], 10);
  const monthMatch = str.match(/jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i);
  const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const month = monthMatch ? months.indexOf(monthMatch[0].toLowerCase().slice(0, 3)) : 0;
  return new Date(year, month, 1);
}

/** Extract "N+ years" style requirements from qualification lines. */
function requiredYears(qualifications) {
  let max = 0;
  for (const q of qualifications) {
    const m = q.match(/(\d+)\+?\s*(?:years?|yrs?)/i);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return max;
}

/** First resume line (bullet, summary sentence, or education line) mentioning `term`. */
function findEvidence(term, resumeData) {
  const t = term.toLowerCase();
  const candidates = [];
  if (resumeData.summary) candidates.push(resumeData.summary);
  for (const exp of resumeData.experience || []) {
    for (const line of (exp.description || '').split('\n')) {
      if (line.trim()) candidates.push(`${line.trim()} (${exp.role || 'role'} @ ${exp.company || 'company'})`);
    }
  }
  for (const edu of resumeData.education || []) {
    if (edu.degree) candidates.push(`${edu.degree}, ${edu.school || ''}`.trim());
    if (edu.achievements) candidates.push(edu.achievements);
  }
  if (Array.isArray(resumeData.skills) && resumeData.skills.some((s) => s?.toLowerCase() === t)) {
    candidates.push(`Listed in Skills: ${term}`);
  }
  const hit = candidates.find((c) => c.toLowerCase().includes(t));
  return hit ? hit.slice(0, 160) : null;
}

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
export function matchResumeToJob(resumeData, jobDescription, jobTitle = '', jobMeta = {}, prefs = {}) {
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

  // ---- Qualification Evidence Map ----
  // Every requirement (skill, qualification line, or salient keyword) mapped
  // to the exact resume text that satisfies it, or flagged as not found.
  const evidenceMap = [
    ...jdSkills.map((s) => ({
      requirement: s,
      type: 'skill',
      status: matchedSkills.includes(s) ? 'matched' : 'missing',
      evidence: findEvidence(s, resumeData),
    })),
    ...qualifications.map((q) => ({
      requirement: q,
      type: 'qualification',
      status: missingQualifications.includes(q) ? 'missing' : 'matched',
      evidence: missingQualifications.includes(q) ? null : q,
    })),
    ...keywords.slice(0, 12).map((k) => ({
      requirement: k,
      type: 'keyword',
      status: matchedKeywords.includes(k) ? 'matched' : 'missing',
      evidence: findEvidence(k, resumeData),
    })),
  ];

  // ---- Separate qualification sub-scores ----
  const userYears = estimateExperienceYears(resumeData);
  const neededYears = requiredYears(qualifications);
  const experienceScore = neededYears > 0 ? clampScore((userYears / neededYears) * 100) : clampScore(50 + userYears * 8);

  const jdDegree = degreeLevel(jobDescription);
  const userDegree = Math.max(0, ...(resumeData.education || []).map((e) => degreeLevel(`${e.degree || ''}`)));
  const educationScore = jdDegree === 0 ? 80 : clampScore(userDegree >= jdDegree ? 100 : 50 + userDegree * 15);

  const jdSeniority = seniorityRank(jobTitle);
  const userLatestTitle = (resumeData.experience || [])[0]?.role || '';
  const userSeniority = seniorityRank(userLatestTitle);
  const seniorityScore = clampScore(100 - Math.abs(jdSeniority - userSeniority) * 20);

  const resumeFamilies = matchFamilies([...resumeSkills]);
  const jdFamilies = matchFamilies(jdSkills.map((s) => s.toLowerCase()));
  const industryScore =
    resumeFamilies[0] && jdFamilies[0] && resumeFamilies[0].id === jdFamilies[0].id
      ? 100
      : clampScore(keywordRatio * 100);

  const subScores = {
    skills: clampScore(skillRatio * 100),
    experience: experienceScore,
    education: educationScore,
    seniority: seniorityScore,
    industry: industryScore,
    keywords: clampScore(keywordRatio * 100),
  };

  // Location/remote/salary only computable when structured job metadata is
  // supplied (e.g. drilling into a live feed job) — a raw pasted JD alone
  // rarely states these unambiguously, so we don't guess.
  if (jobMeta.location || jobMeta.remote) {
    const locations = prefs.locations || [];
    const locationOk =
      jobMeta.remote === 'remote' || locations.length === 0 ||
      locations.some((l) => (jobMeta.location || '').toLowerCase().includes(l.toLowerCase()));
    subScores.location = clampScore(locationOk ? 100 : 40);

    const remoteOk = !prefs.remote || prefs.remote === 'any' || jobMeta.remote === 'unknown' || jobMeta.remote === prefs.remote;
    subScores.remote = clampScore(remoteOk ? 100 : 35);
  }
  if (jobMeta.salaryMin != null || jobMeta.salaryMax != null) {
    const salaryOk = !prefs.salaryMin || !jobMeta.salaryMax || jobMeta.salaryMax >= prefs.salaryMin;
    subScores.salary = clampScore(salaryOk ? 100 : 45);
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
    subScores,
    evidenceMap,
    experienceYears: userYears,
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
    subScores: {
      skills: clampScore(skillRatio * 100),
      seniority: clampScore(100 - Math.abs(seniorityRank(job.title) - seniorityRank((resumeData?.experience || [])[0]?.role || '')) * 20),
      location: clampScore(locationMatch ? 100 : 40),
      remote: clampScore(remoteOk ? 100 : 35),
      salary: clampScore(salaryOk ? 100 : 45),
    },
  };
}

/** Skill-gap summary across a set of scored live jobs — what to learn next and its payoff. */
export function summarizeSkillGaps(scoredJobs, topN = 8) {
  const freq = {};
  for (const { missingSkills = [] } of scoredJobs) {
    for (const s of missingSkills) freq[s] = (freq[s] || 0) + 1;
  }
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([skill, jobCount]) => ({ skill, jobCount }));
}
