// Deterministic resume scoring engine. Runs entirely server-side with no AI
// calls, so scans are instant, free, reproducible and abuse-resistant.
// Every category returns { key, score, explanation, suggestions[] }.

import {
  resumeToText,
  extractBullets,
  tokenize,
  findSkillsInText,
  countWords,
  fleschReadingEase,
  clampScore,
  ACTION_VERBS,
  WEAK_PHRASES,
  FILLER_WORDS,
  PASSIVE_HINTS,
  COMMON_MISSPELLINGS,
  KNOWN_SKILLS,
} from './text.js';

const ACTION_VERB_SET = new Set(ACTION_VERBS);

const SOFT_SKILLS = new Set([
  'communication','leadership','teamwork','collaboration','problem solving','critical thinking','time management','adaptability','creativity','attention to detail','public speaking','presentation','mentoring','coaching','conflict resolution','decision making','emotional intelligence','organization','multitasking','analytical thinking','initiative','customer focus','cross-functional collaboration',
]);

function startsWithActionVerb(bullet) {
  const first = (bullet.trim().split(/\s+/)[0] || '').toLowerCase().replace(/[^a-z]/g, '');
  if (ACTION_VERB_SET.has(first)) return true;
  // Accept present-tense variants of listed past-tense verbs (led/lead etc. kept simple)
  if (first.endsWith('ing')) return false;
  const past = first.endsWith('e') ? `${first}d` : `${first}ed`;
  return ACTION_VERB_SET.has(past);
}

function hasMeasurableResult(bullet) {
  return /(\d+(\.\d+)?\s*%|\$\s?\d|\d+[km]?\+?\s*(users|customers|clients|people|students|employees|projects|tickets|orders|downloads|views|visits|leads|sales|hours|days|weeks|records|requests|transactions)|\b\d{2,}\b|(doubled|tripled|halved)\b)/i.test(
    bullet
  );
}

// ---------- Category scorers ----------

function scoreATS(data, text) {
  const suggestions = [];
  let score = 100;

  if (!data.email?.trim()) { score -= 20; suggestions.push('Add an email address — ATS systems reject resumes without contact info.'); }
  if (!data.phone?.trim()) { score -= 10; suggestions.push('Add a phone number so recruiters can reach you.'); }
  if (!data.fullName?.trim()) { score -= 15; suggestions.push('Add your full name at the top of the resume.'); }
  if (!data.summary?.trim()) { score -= 10; suggestions.push('Add a professional summary — many ATS rank resumes with summaries higher.'); }
  if (!(data.experience || []).length) { score -= 15; suggestions.push('Add at least one experience entry with a standard job title.'); }
  if (!(data.education || []).length) { score -= 5; suggestions.push('Add your education — ATS filters often require a degree field.'); }
  if (!(data.skills || []).filter((s) => s?.trim()).length) { score -= 15; suggestions.push('Add a dedicated skills section — ATS keyword matching relies on it.'); }

  const missingDates = (data.experience || []).filter((e) => !e.from?.trim()).length;
  if (missingDates > 0) {
    score -= Math.min(10, missingDates * 5);
    suggestions.push('Add start/end dates to every role — ATS parsers expect them.');
  }

  if (data.email && !/.+@.+\..+/.test(data.email)) {
    score -= 10;
    suggestions.push('Your email address looks malformed — double-check it.');
  }

  const emojiOrSpecial = (text.match(/[\u{1F300}-\u{1FAFF}☀-➿]/gu) || []).length;
  if (emojiOrSpecial > 0) {
    score -= 10;
    suggestions.push('Remove emojis/special symbols — many ATS parsers garble them.');
  }

  const words = countWords(text);
  if (words < 120) {
    score -= 10;
    suggestions.push('Your resume is very short — aim for 300–600 words of substance.');
  } else if (words > 900) {
    score -= 5;
    suggestions.push('Your resume is long — tighten it toward one page of high-signal content.');
  }

  return {
    key: 'ats',
    score: clampScore(score),
    explanation:
      'Measures whether applicant tracking systems can parse your resume: contact details, standard sections, dates on roles, and clean text without symbols ATS parsers choke on.',
    suggestions,
  };
}

function scoreFormatting(data) {
  const suggestions = [];
  let score = 100;
  const bullets = extractBullets(data);

  const longBullets = bullets.filter((b) => countWords(b) > 32).length;
  if (longBullets > 0) {
    score -= Math.min(20, longBullets * 5);
    suggestions.push(`Shorten ${longBullets} long bullet${longBullets > 1 ? 's' : ''} — aim for one line (12–24 words) each.`);
  }
  const tinyBullets = bullets.filter((b) => countWords(b) < 4).length;
  if (tinyBullets > 0) {
    score -= Math.min(15, tinyBullets * 5);
    suggestions.push('Expand very short bullets — a bullet should state action + scope + result.');
  }

  const expWithoutBullets = (data.experience || []).filter(
    (e) => e.description && e.description.trim() && !e.description.includes('\n') && countWords(e.description) > 40
  ).length;
  if (expWithoutBullets > 0) {
    score -= 15;
    suggestions.push('Break long paragraph descriptions into bullet points (one achievement per line).');
  }

  const summaryWords = countWords(data.summary || '');
  if (summaryWords > 120) {
    score -= 10;
    suggestions.push('Trim your summary to 3–4 sentences (50–90 words).');
  } else if (summaryWords > 0 && summaryWords < 25) {
    score -= 10;
    suggestions.push('Expand your summary — 2–3 sentences covering role, years, and specialty.');
  }

  const skills = (data.skills || []).filter((s) => s?.trim());
  if (skills.length > 20) {
    score -= 10;
    suggestions.push('Trim the skills list to your strongest 10–15 — long lists dilute impact.');
  }
  const dupSkills = skills.length - new Set(skills.map((s) => s.toLowerCase().trim())).size;
  if (dupSkills > 0) {
    score -= 10;
    suggestions.push('Remove duplicate skills.');
  }

  // Date format consistency: mixed "2020" and "Jan 2020" styles
  const dates = (data.experience || []).flatMap((e) => [e.from, e.to]).filter(Boolean);
  const yearOnly = dates.filter((d) => /^\s*\d{4}\s*$/.test(d)).length;
  const monthYear = dates.filter((d) => /[a-z]{3,}\s+\d{4}/i.test(d)).length;
  if (yearOnly > 0 && monthYear > 0) {
    score -= 10;
    suggestions.push('Use one consistent date format across all roles (e.g. "Jan 2023").');
  }

  return {
    key: 'formatting',
    score: clampScore(score),
    explanation:
      'Checks structure and consistency: bullet lengths, paragraph-vs-bullet usage, summary length, skills list size, and consistent date formats.',
    suggestions,
  };
}

function scoreImpact(data) {
  const suggestions = [];
  const bullets = extractBullets(data);
  if (bullets.length === 0) {
    return {
      key: 'impact',
      score: 15,
      explanation:
        'Measures whether your experience shows outcomes: strong action verbs and quantified, measurable results.',
      suggestions: ['Add experience bullets that state what you did and the measurable result it produced.'],
    };
  }

  const withVerbs = bullets.filter(startsWithActionVerb).length;
  const withNumbers = bullets.filter(hasMeasurableResult).length;
  const verbRatio = withVerbs / bullets.length;
  const numRatio = withNumbers / bullets.length;

  const score = clampScore(verbRatio * 55 + numRatio * 45 + 10);

  if (verbRatio < 0.7) {
    suggestions.push(
      `Start more bullets with strong action verbs (currently ${withVerbs}/${bullets.length}). Try: ${ACTION_VERBS.slice(20, 26).join(', ')}.`
    );
  }
  if (numRatio < 0.4) {
    suggestions.push(
      `Quantify more results (currently ${withNumbers}/${bullets.length} bullets have numbers) — add %, $, counts, or time saved.`
    );
  }
  if (numRatio < 0.2) {
    suggestions.push('Formula for a strong bullet: Action verb + what you did + measurable outcome ("Reduced load time 40% by...").');
  }

  return {
    key: 'impact',
    score,
    explanation:
      'Measures whether your experience shows outcomes rather than duties: bullets that open with action verbs and include quantified, measurable results.',
    suggestions,
  };
}

function scoreKeywords(data, text) {
  const suggestions = [];
  const skillsFound = findSkillsInText(text);
  const technical = skillsFound.filter((s) => !SOFT_SKILLS.has(s));

  let score = 30 + Math.min(55, technical.length * 6) + Math.min(15, skillsFound.length * 1.5);
  const tokens = tokenize(text);
  const density = tokens.length ? skillsFound.length / Math.sqrt(tokens.length) : 0;
  if (density > 2.5) {
    score -= 15;
    suggestions.push('Keyword density looks stuffed — keep keywords only where they describe real work.');
  }

  if (technical.length < 5) {
    suggestions.push('Weave more role-specific keywords (tools, methods, domains) into your summary and bullets — not just the skills list.');
  }
  if (data.targetRole?.trim()) {
    const roleTokens = tokenize(data.targetRole);
    const present = roleTokens.filter((t) => text.toLowerCase().includes(t));
    if (present.length < roleTokens.length) {
      suggestions.push(`Mirror your target role ("${data.targetRole}") wording in the summary so recruiters and ATS see the match instantly.`);
    }
  } else {
    suggestions.push('Set a target role in the builder — we tailor keyword recommendations to it.');
  }

  return {
    key: 'keywords',
    score: clampScore(score),
    explanation: `Found ${skillsFound.length} recognizable industry keywords (${technical.length} technical). Recruiters and ATS search by these terms, so they must appear in context — without stuffing.`,
    suggestions,
  };
}

function scoreSkills(data) {
  const suggestions = [];
  const skills = (data.skills || []).map((s) => s?.trim()).filter(Boolean);
  if (skills.length === 0) {
    return {
      key: 'skills',
      score: 5,
      explanation: 'Evaluates your skills section: count, specificity, and balance of technical vs interpersonal skills.',
      suggestions: ['Add a skills section with 8–15 specific skills — it is the first thing ATS keyword matching reads.'],
    };
  }

  let score = 40 + Math.min(40, skills.length * 5);
  const lower = skills.map((s) => s.toLowerCase());
  const recognized = lower.filter((s) => KNOWN_SKILLS.includes(s));
  const soft = lower.filter((s) => SOFT_SKILLS.has(s));
  const technical = recognized.filter((s) => !SOFT_SKILLS.has(s));

  if (skills.length < 5) suggestions.push('List at least 8 skills — mix tools, methods, and strengths.');
  if (technical.length === 0) {
    score -= 15;
    suggestions.push('Add concrete hard skills (tools, software, techniques) — soft skills alone rarely pass filters.');
  }
  if (soft.length === 0 && skills.length >= 5) {
    score -= 5;
    suggestions.push('Add 2–3 interpersonal strengths (e.g. leadership, communication) for balance.');
  }
  const vague = lower.filter((s) => ['hardworking', 'motivated', 'dedicated', 'passionate', 'fast learner'].includes(s));
  if (vague.length) {
    score -= vague.length * 5;
    suggestions.push(`Replace vague traits (${vague.join(', ')}) with skills a recruiter can verify.`);
  }

  return {
    key: 'skills',
    score: clampScore(score),
    explanation: `You list ${skills.length} skills (${technical.length} recognized technical, ${soft.length} interpersonal). Strong resumes carry 8–15 specific, verifiable skills.`,
    suggestions,
  };
}

function scoreExperience(data) {
  const suggestions = [];
  const exps = data.experience || [];
  if (exps.length === 0) {
    return {
      key: 'experience',
      score: 10,
      explanation: 'Evaluates depth of your experience section: number of roles, detail per role, and complete date ranges.',
      suggestions: ['Add work experience — include internships, freelance work, and significant projects if you are early-career.'],
    };
  }

  let score = 45 + Math.min(25, exps.length * 10);
  const withDesc = exps.filter((e) => e.description?.trim());
  const bullets = extractBullets(data);
  const avgBullets = bullets.length / exps.length;

  if (withDesc.length < exps.length) {
    score -= 15;
    suggestions.push(`${exps.length - withDesc.length} role(s) have no description — every role needs 2–5 bullets.`);
  }
  if (avgBullets >= 2 && avgBullets <= 6) score += 15;
  else if (avgBullets < 2) suggestions.push('Aim for 3–5 bullets per role covering scope, actions, and results.');
  else suggestions.push('Trim roles to their 4–5 strongest bullets — prioritize recent, relevant wins.');

  const missingRole = exps.filter((e) => !e.role?.trim() || !e.company?.trim()).length;
  if (missingRole) {
    score -= missingRole * 10;
    suggestions.push('Fill in job title and company for every entry.');
  }
  const missingDates = exps.filter((e) => !e.from?.trim() || !e.to?.trim()).length;
  if (missingDates) {
    score -= 5;
    suggestions.push('Complete the date range on every role (use "Present" for current roles).');
  }

  return {
    key: 'experience',
    score: clampScore(score),
    explanation: `You have ${exps.length} role(s) averaging ${avgBullets.toFixed(1)} bullets each. Recruiters want 3–5 outcome-focused bullets per role with complete titles and dates.`,
    suggestions,
  };
}

function detectLanguageFindings(text) {
  const findings = [];
  const lower = text.toLowerCase();

  for (const { term, advice } of WEAK_PHRASES) {
    const re = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    const count = (lower.match(re) || []).length;
    if (count > 0) findings.push({ type: 'weak', term, count, advice });
  }

  for (const word of FILLER_WORDS) {
    const re = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    const count = (lower.match(re) || []).length;
    if (count >= 2) {
      findings.push({ type: 'filler', term: word, count, advice: `"${word}" appears ${count}× — filler words weaken statements. Cut or replace with specifics.` });
    }
  }

  for (const hint of PASSIVE_HINTS) {
    const count = lower.split(hint).length - 1;
    if (count > 0) {
      findings.push({ type: 'passive', term: hint, count, advice: 'Rewrite in active voice — you are the subject of your resume.' });
    }
  }

  // Repetition: any meaningful word used 4+ times
  const freq = {};
  for (const t of tokenize(text)) freq[t] = (freq[t] || 0) + 1;
  const repeated = Object.entries(freq)
    .filter(([w, c]) => c >= 4 && w.length > 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  for (const [w, c] of repeated) {
    findings.push({ type: 'repetition', term: w, count: c, advice: `"${w}" appears ${c}× — vary your wording to keep the reader engaged.` });
  }

  // Spelling
  for (const [wrong, right] of Object.entries(COMMON_MISSPELLINGS)) {
    const re = new RegExp(`\\b${wrong}\\b`, 'gi');
    const count = (lower.match(re) || []).length;
    if (count > 0) findings.push({ type: 'spelling', term: wrong, count, advice: `Possible misspelling — did you mean "${right}"?` });
  }

  // First-person pronouns
  const pronounCount = (lower.match(/\b(i|me|my|mine)\b/g) || []).length;
  if (pronounCount > 2) {
    findings.push({ type: 'weak', term: 'first-person pronouns', count: pronounCount, advice: 'Drop "I/my/me" — resume convention omits the subject ("Led a team of 5", not "I led...").' });
  }

  return findings;
}

function scoreGrammar(data, text, findings) {
  const suggestions = [];
  let score = 100;

  const weak = findings.filter((f) => f.type === 'weak');
  const filler = findings.filter((f) => f.type === 'filler');
  const passive = findings.filter((f) => f.type === 'passive');
  const spelling = findings.filter((f) => f.type === 'spelling');
  const repetition = findings.filter((f) => f.type === 'repetition');

  score -= Math.min(25, weak.reduce((s, f) => s + f.count, 0) * 5);
  score -= Math.min(15, filler.reduce((s, f) => s + f.count, 0) * 2);
  score -= Math.min(15, passive.reduce((s, f) => s + f.count, 0) * 4);
  score -= Math.min(25, spelling.reduce((s, f) => s + f.count, 0) * 8);
  score -= Math.min(10, repetition.length * 3);

  if (spelling.length) suggestions.push(`Fix ${spelling.length} possible misspelling(s): ${spelling.map((f) => f.term).join(', ')}.`);
  if (weak.length) suggestions.push(`Replace weak phrasing (${weak.slice(0, 3).map((f) => `"${f.term}"`).join(', ')}) with direct action verbs.`);
  if (passive.length) suggestions.push('Convert passive constructions to active voice.');
  if (filler.length) suggestions.push('Cut filler words — every word should earn its place.');
  if (repetition.length) suggestions.push(`Vary repeated words: ${repetition.map((f) => f.term).join(', ')}.`);

  const doubleSpaces = (text.match(/ {2,}/g) || []).length;
  if (doubleSpaces > 2) {
    score -= 5;
    suggestions.push('Remove double spaces.');
  }

  return {
    key: 'grammar',
    score: clampScore(score),
    explanation:
      'Scans for spelling errors, weak phrases, filler words, passive voice, first-person pronouns, and repeated wording.',
    suggestions,
  };
}

function scoreReadability(data, text) {
  const suggestions = [];
  const flesch = fleschReadingEase(text);
  const bullets = extractBullets(data);
  const avgLen = bullets.length ? bullets.reduce((s, b) => s + countWords(b), 0) / bullets.length : 0;

  let score = 70;
  if (flesch !== null) {
    // Resumes read best around 30–60 (professional but scannable)
    if (flesch >= 30 && flesch <= 65) score = 90;
    else if (flesch > 65) score = 80;
    else if (flesch >= 15) score = 60;
    else score = 40;
  }
  if (avgLen > 28) {
    score -= 15;
    suggestions.push('Average bullet length is high — recruiters skim; keep bullets to one line.');
  }
  if (flesch !== null && flesch < 15) {
    suggestions.push('Sentences are dense — split long clauses and prefer common words over jargon chains.');
  }

  const longWords = (text.match(/\b[\w-]{14,}\b/g) || []).length;
  if (longWords > 8) {
    score -= 5;
    suggestions.push('Heavy use of very long words — simplify where a shorter word works.');
  }

  return {
    key: 'readability',
    score: clampScore(score),
    explanation: `Estimates how easily a recruiter can skim your resume${flesch !== null ? ` (reading-ease ${Math.round(flesch)})` : ''}: sentence length, word complexity, and bullet size. Recruiters spend ~7 seconds on a first pass.`,
    suggestions,
  };
}

function scoreCompleteness(data) {
  const suggestions = [];
  let score = 0;
  const add = (cond, pts, tip) => {
    if (cond) score += pts;
    else if (tip) suggestions.push(tip);
  };

  add(!!data.fullName?.trim(), 10, 'Add your full name.');
  add(!!data.email?.trim(), 10, 'Add your email address.');
  add(!!data.phone?.trim(), 8, 'Add a phone number.');
  add(!!data.city?.trim(), 5, 'Add your city — many recruiters filter by location.');
  add(!!data.linkedIn?.trim(), 7, 'Add your LinkedIn URL — 87% of recruiters check LinkedIn.');
  add((data.summary || '').trim().length >= 80, 15, 'Write a professional summary of at least 2–3 sentences.');
  add((data.experience || []).length > 0, 20, 'Add at least one experience entry.');
  add((data.education || []).length > 0, 10, 'Add your education.');
  add((data.skills || []).filter((s) => s?.trim()).length >= 5, 15, 'List at least 5 skills.');

  return {
    key: 'completeness',
    score: clampScore(score),
    explanation: 'Checks that every section a recruiter expects is present and filled in: contact details, summary, experience, education, and skills.',
    suggestions,
  };
}

const WEIGHTS = {
  ats: 0.15,
  impact: 0.15,
  experience: 0.12,
  keywords: 0.12,
  completeness: 0.1,
  skills: 0.1,
  formatting: 0.1,
  grammar: 0.08,
  readability: 0.08,
};

/** Run the full scan. Returns the ScanResult payload (without persistence). */
export function analyzeResume(data) {
  const text = resumeToText(data);
  const findings = detectLanguageFindings(text);

  const categories = [
    scoreATS(data, text),
    scoreFormatting(data),
    scoreImpact(data),
    scoreKeywords(data, text),
    scoreSkills(data),
    scoreExperience(data),
    scoreGrammar(data, text, findings),
    scoreReadability(data, text),
    scoreCompleteness(data),
  ];

  const overall = clampScore(
    categories.reduce((sum, c) => sum + c.score * (WEIGHTS[c.key] || 0.1), 0)
  );

  const sorted = [...categories].sort((a, b) => b.score - a.score);
  const strengths = sorted
    .filter((c) => c.score >= 75)
    .slice(0, 3)
    .map((c) => `${labelFor(c.key)} is strong (${c.score}/100).`);

  const topFixes = sorted
    .slice()
    .reverse()
    .flatMap((c) => c.suggestions.slice(0, 2))
    .slice(0, 6);

  // Action verb suggestions tailored to bullets that don't start with one
  const bullets = extractBullets(data);
  const weakBullets = bullets.filter((b) => !startsWithActionVerb(b));
  const actionVerbSuggestions =
    weakBullets.length > 0
      ? pickVerbs(8)
      : pickVerbs(4);

  return {
    overall,
    categories,
    strengths,
    topFixes,
    languageFindings: findings.slice(0, 20),
    actionVerbSuggestions,
  };
}

function labelFor(key) {
  const labels = {
    ats: 'ATS compatibility',
    formatting: 'Formatting',
    impact: 'Impact',
    keywords: 'Keywords',
    skills: 'Skills',
    experience: 'Experience',
    grammar: 'Grammar & language',
    readability: 'Readability',
    completeness: 'Completeness',
  };
  return labels[key] || key;
}

function pickVerbs(n) {
  // Deterministic spread across the alphabetized list
  const step = Math.max(1, Math.floor(ACTION_VERBS.length / n));
  const out = [];
  for (let i = 0; i < ACTION_VERBS.length && out.length < n; i += step) {
    out.push(ACTION_VERBS[i]);
  }
  return out.map((v) => v[0].toUpperCase() + v.slice(1));
}
