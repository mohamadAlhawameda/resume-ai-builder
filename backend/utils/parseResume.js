// Resume file parsing: extract plain text from PDF/DOCX uploads and structure
// it into the app's resume `data` shape. Extraction is deterministic and only
// ever reorganizes text that exists in the document — nothing is invented.
// An optional AI pass (see routes/resume.js) can improve the structuring, but
// its output is validated against the source text before being trusted.

import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';

// ---------------------------------------------------------------------------
// Text extraction
// ---------------------------------------------------------------------------

export async function extractTextFromFile(buffer, mimetype, filename = '') {
  const lower = filename.toLowerCase();
  const isPdf = mimetype === 'application/pdf' || lower.endsWith('.pdf');
  const isDocx =
    mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    lower.endsWith('.docx');

  if (isPdf) {
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      const result = await parser.getText();
      // pdf-parse joins pages with "-- N of M --" marker lines; drop them so
      // they can't leak into parsed sections.
      return (result.text || '').replace(/^\s*-+\s*\d+\s+of\s+\d+\s*-+\s*$/gim, '');
    } finally {
      await parser.destroy().catch(() => {});
    }
  }
  if (isDocx) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value || '';
  }
  throw new Error('Unsupported file type — please upload a PDF or DOCX file.');
}

// ---------------------------------------------------------------------------
// Section detection
// ---------------------------------------------------------------------------

const SECTION_ALIASES = {
  summary: ['summary', 'professional summary', 'summary of qualifications', 'profile', 'professional profile', 'about', 'about me', 'objective', 'career objective', 'personal statement', 'overview'],
  experience: ['experience', 'work experience', 'professional experience', 'employment', 'employment history', 'work history', 'career history', 'relevant experience', 'professional background'],
  education: ['education', 'education & training', 'education and training', 'academic background', 'academics', 'academic history'],
  skills: ['skills', 'technical skills', 'core competencies', 'key skills', 'skills & tools', 'skills and tools', 'technologies', 'tech stack', 'areas of expertise', 'core skills', 'competencies', 'expertise'],
  projects: ['projects', 'personal projects', 'key projects', 'academic projects', 'selected projects', 'notable projects', 'portfolio'],
  certifications: ['certifications', 'certificates', 'licenses', 'licenses & certifications', 'certifications & licenses', 'licenses and certifications', 'certifications and licenses', 'professional development', 'courses', 'training'],
  languages: ['languages', 'language skills'],
  other: ['awards', 'honors', 'honours', 'achievements', 'awards & honors', 'volunteer', 'volunteering', 'volunteer experience', 'interests', 'hobbies', 'publications', 'references', 'additional information', 'activities'],
};

const HEADER_LOOKUP = new Map();
for (const [key, aliases] of Object.entries(SECTION_ALIASES)) {
  for (const alias of aliases) HEADER_LOOKUP.set(alias, key);
}

function headerKeyFor(line) {
  const cleaned = line.trim().replace(/[:\-–—•·|]+\s*$/, '').replace(/^[•·\-–—|]+\s*/, '').trim();
  if (!cleaned || cleaned.length > 45) return null;
  return HEADER_LOOKUP.get(cleaned.toLowerCase()) || null;
}

// ---------------------------------------------------------------------------
// Contact details (regex — ground truth even when AI structuring is used)
// ---------------------------------------------------------------------------

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.-]+[a-z]/i;
const PHONE_RE = /(\(?\+?\d[\d\s().\-/]{7,}\d)/;
const LINKEDIN_RE = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/[^\s|,;)>\]]+/i;
const GITHUB_RE = /(?:https?:\/\/)?(?:www\.)?github\.com\/[^\s|,;)>\]]+/i;

function digitCount(s) {
  return (s.match(/\d/g) || []).length;
}

export function extractContact(text) {
  const contact = { email: '', phone: '', linkedIn: '', github: '', city: '' };
  const email = text.match(EMAIL_RE);
  if (email) contact.email = email[0];
  const linkedIn = text.match(LINKEDIN_RE);
  if (linkedIn) contact.linkedIn = linkedIn[0];
  const github = text.match(GITHUB_RE);
  if (github) contact.github = github[0];

  // Phone: first candidate with 8–15 digits that isn't a date range or URL.
  for (const m of text.matchAll(new RegExp(PHONE_RE, 'g'))) {
    const candidate = m[1].trim();
    const digits = digitCount(candidate);
    if (digits >= 8 && digits <= 15 && !/\d{4}\s*[-–—]\s*\d{4}/.test(candidate)) {
      contact.phone = candidate;
      break;
    }
  }

  // City: look for "City, XX" / "City, Country" fragments near the contact info.
  const topLines = text.split('\n').slice(0, 12);
  for (const line of topLines) {
    for (const part of line.split(/[|•·;]+/)) {
      const p = part.trim();
      const m = p.match(/^([A-Z][A-Za-z .'\-]{1,40}),\s*([A-Z][A-Za-z .'\-]{1,40})$/);
      if (m && !EMAIL_RE.test(p) && digitCount(p) === 0) {
        contact.city = p;
        break;
      }
    }
    if (contact.city) break;
  }
  return contact;
}

function extractName(lines) {
  for (const line of lines.slice(0, 6)) {
    const t = line.trim();
    if (!t || t.length > 45 || digitCount(t) > 0) continue;
    if (EMAIL_RE.test(t) || /https?:|linkedin|github|@/i.test(t)) continue;
    if (headerKeyFor(t)) continue;
    const words = t.split(/\s+/);
    if (words.length >= 2 && words.length <= 4 && /^[A-Za-z][A-Za-z .'\-]+$/.test(t)) {
      return t;
    }
  }
  return '';
}

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

const MONTH = '(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?';
const ONE_DATE = `(?:${MONTH}\\s+\\d{4}|\\d{1,2}[/.]\\d{4}|\\d{4})`;
const RANGE_RE = new RegExp(
  `(${ONE_DATE})\\s*(?:–|—|−|-|to|until|→)\\s*(${ONE_DATE}|present|current|now|ongoing|today)`,
  'i'
);
const YEAR_RE = /\b(19|20)\d{2}\b/;

function findDateRange(line) {
  const m = line.match(RANGE_RE);
  if (m) return { from: m[1].trim(), to: m[2].trim() };
  return null;
}

// ---------------------------------------------------------------------------
// Splitting the document into sections
// ---------------------------------------------------------------------------

export function splitSections(text) {
  const lines = text.split(/\r?\n/).map((l) => l.replace(/\s+$/, ''));
  const sections = { _preamble: [] };
  let current = '_preamble';
  for (const line of lines) {
    const key = headerKeyFor(line);
    if (key) {
      current = key;
      if (!sections[current]) sections[current] = [];
      continue;
    }
    if (!sections[current]) sections[current] = [];
    sections[current].push(line);
  }
  return sections;
}

// ---------------------------------------------------------------------------
// Experience / project entries
// ---------------------------------------------------------------------------

const TITLE_WORDS = /\b(engineer|developer|manager|director|analyst|designer|consultant|specialist|coordinator|assistant|associate|lead|architect|administrator|intern|officer|scientist|technician|accountant|nurse|teacher|writer|marketer|recruiter|founder|owner|president|vp|head|supervisor|representative|agent|clerk|therapist|advisor)\b/i;
const COMPANY_HINTS = /\b(inc|llc|ltd|corp|corporation|company|co|gmbh|technologies|solutions|systems|labs|group|studio|agency|university|hospital|bank|consulting|software|media|partners)\b\.?/i;
const BULLET_RE = /^\s*[•·▪◦*\-–—]\s+/;

function splitRoleCompany(headerLines, anchorRemainder) {
  const candidates = [...headerLines];
  if (anchorRemainder) candidates.push(anchorRemainder);
  let role = '';
  let company = '';

  for (const raw of candidates) {
    const line = raw.trim().replace(/[|,•·]+$/, '').trim();
    if (!line) continue;
    // "Role at Company" / "Role — Company" / "Role | Company" on one line
    const sep = line.match(/^(.{2,80}?)\s+(?:at|@)\s+(.{2,80})$/i) || line.match(/^(.{2,80}?)\s*(?:—|–|\||·)\s*(.{2,80})$/);
    if (sep && !role && !company) {
      const [a, b] = [sep[1].trim(), sep[2].trim()];
      if (TITLE_WORDS.test(a) || COMPANY_HINTS.test(b)) {
        role = a;
        company = b;
        continue;
      }
      if (TITLE_WORDS.test(b) || COMPANY_HINTS.test(a)) {
        role = b;
        company = a;
        continue;
      }
      role = a;
      company = b;
      continue;
    }
    if (!role && TITLE_WORDS.test(line)) {
      role = line;
      continue;
    }
    if (!company && (COMPANY_HINTS.test(line) || role)) {
      company = line;
      continue;
    }
    if (!role) role = line;
    else if (!company) company = line;
  }
  return { role: role.slice(0, 300), company: company.slice(0, 300) };
}

export function parseEntries(lines) {
  const entries = [];
  let pendingHeader = []; // short lines waiting for a date anchor
  let current = null;

  const flush = () => {
    if (current) {
      current.description = current.desc.join('\n').trim();
      delete current.desc;
      entries.push(current);
      current = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const range = findDateRange(line);
    const isBullet = BULLET_RE.test(raw);

    if (range) {
      flush();
      const remainder = line.replace(RANGE_RE, '').replace(/[|,•·()\-–—]+\s*$/, '').replace(/^[|,•·()\-–—]+\s*/, '').trim();
      const { role, company } = splitRoleCompany(pendingHeader, remainder);
      pendingHeader = [];
      current = { role, company, from: range.from, to: range.to, desc: [] };
      continue;
    }

    if (current) {
      // A short non-bullet line right after the anchor may still be the
      // role/company when the date line came first.
      if (!isBullet && current.desc.length === 0 && line.length < 80 && (!current.role || !current.company)) {
        const { role, company } = splitRoleCompany([line], '');
        if (!current.role && role) current.role = role;
        else if (!current.company && (company || role)) current.company = company || role;
        else current.desc.push(line.replace(BULLET_RE, ''));
        continue;
      }
      // Once the entry has description content, short non-bullet lines are
      // more likely the next entry's role/company header — buffer them until
      // a date anchor (header) or a bullet (they were description after all).
      if (!isBullet && current.desc.length > 0 && line.length < 80 && !/[.!?]$/.test(line)) {
        pendingHeader.push(line);
        if (pendingHeader.length > 2) current.desc.push(pendingHeader.shift());
        continue;
      }
      if (pendingHeader.length > 0) {
        current.desc.push(...pendingHeader);
        pendingHeader = [];
      }
      current.desc.push(raw.trim().replace(BULLET_RE, '• ').replace(/^[•·▪◦*\-–—]\s*/, ''));
    } else if (!isBullet && line.length < 90) {
      pendingHeader.push(line);
      if (pendingHeader.length > 2) pendingHeader.shift();
    } else if (entries.length > 0) {
      entries[entries.length - 1].description += `\n${line.replace(BULLET_RE, '')}`;
    }
  }
  if (current && pendingHeader.length > 0) {
    current.desc.push(...pendingHeader);
    pendingHeader = [];
  }
  flush();

  // Leftover header lines with no date anchor still form one undated entry.
  if (entries.length === 0 && pendingHeader.length > 0) {
    const { role, company } = splitRoleCompany(pendingHeader, '');
    if (role || company) entries.push({ role, company, from: '', to: '', description: '' });
  }
  return entries;
}

// ---------------------------------------------------------------------------
// Education
// ---------------------------------------------------------------------------

const DEGREE_RE = /\b(bachelor|master|ph\.?d|doctorate|associate|diploma|certificate|b\.?sc?|m\.?sc?|b\.?a|m\.?a|m\.?b\.?a|b\.?eng|m\.?eng|b\.?tech|m\.?tech|b\.?com|m\.?com|high school)\b/i;
const SCHOOL_RE = /\b(university|college|institute|school|academy|polytechnic)\b/i;

export function parseEducation(lines) {
  const entries = [];
  let current = null;
  const flush = () => {
    if (current && (current.school || current.degree)) entries.push(current);
    current = null;
  };

  for (const raw of lines) {
    const line = raw.trim().replace(BULLET_RE, '');
    if (!line) continue;
    const range = findDateRange(line);
    const year = line.match(YEAR_RE);
    const isSchool = SCHOOL_RE.test(line);
    const isDegree = DEGREE_RE.test(line);

    if (isSchool && current?.school) flush();
    if (isDegree && current?.degree && !isSchool) flush();

    if (!current) current = { school: '', degree: '', from: '', to: '', achievements: '' };

    const stripped = line.replace(RANGE_RE, '').replace(/[|,•·]+\s*$/, '').trim();
    if (isSchool && !current.school) current.school = stripped.slice(0, 300);
    else if (isDegree && !current.degree) current.degree = stripped.slice(0, 300);
    else if (!range && !year && stripped && (current.school || current.degree)) {
      current.achievements = [current.achievements, stripped].filter(Boolean).join('\n').slice(0, 3000);
    } else if (!current.school && !current.degree && stripped && !range && !year) {
      current.school = stripped.slice(0, 300);
    }

    if (range) {
      current.from = range.from;
      current.to = range.to;
    } else if (year && !current.to) {
      current.to = year[0];
    }
  }
  flush();
  return entries;
}

// ---------------------------------------------------------------------------
// Skills / certifications / languages
// ---------------------------------------------------------------------------

export function parseSkillList(lines) {
  const skills = [];
  for (const raw of lines) {
    let line = raw.trim().replace(BULLET_RE, '');
    if (!line) continue;
    // Drop "Category:" prefixes like "Languages: Python, SQL"
    const colon = line.indexOf(':');
    if (colon > 0 && colon < 35 && line.slice(0, colon).split(/\s+/).length <= 4) {
      line = line.slice(colon + 1);
    }
    for (const part of line.split(/[,;•·|/]+/)) {
      const s = part.trim().replace(/\.$/, '');
      if (s.length >= 2 && s.length <= 50 && !skills.some((x) => x.toLowerCase() === s.toLowerCase())) {
        skills.push(s);
      }
    }
  }
  return skills.slice(0, 60);
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export function parseResumeText(text) {
  const cleaned = text.replace(/\u00a0/g, ' ').replace(/[ \t]+\n/g, '\n');
  const lines = cleaned.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const sections = splitSections(cleaned);
  const warnings = [];

  const contact = extractContact(cleaned);
  const fullName = extractName(lines);

  // Summary: dedicated section, else the first meaty preamble paragraph.
  let summary = (sections.summary || []).map((l) => l.trim()).filter(Boolean).join(' ').slice(0, 5000);
  if (!summary) {
    const preamble = (sections._preamble || [])
      .map((l) => l.trim())
      .filter(
        (l) =>
          l.length > 60 &&
          !EMAIL_RE.test(l) &&
          !LINKEDIN_RE.test(l) &&
          !GITHUB_RE.test(l) &&
          digitCount(l) < 8
      );
    if (preamble.length > 0) summary = preamble.join(' ').slice(0, 5000);
  }

  const experience = sections.experience ? parseEntries(sections.experience) : [];
  const education = sections.education ? parseEducation(sections.education) : [];
  let skills = sections.skills ? parseSkillList(sections.skills) : [];

  // Certifications and languages have no dedicated builder section — they are
  // added to skills (a standard, ATS-friendly placement) and flagged below.
  const certifications = sections.certifications ? parseSkillList(sections.certifications) : [];
  const languages = sections.languages ? parseSkillList(sections.languages) : [];
  for (const extra of [...certifications, ...languages]) {
    if (skills.length < 60 && !skills.some((s) => s.toLowerCase() === extra.toLowerCase())) {
      skills.push(extra);
    }
  }
  if (certifications.length > 0) {
    warnings.push(`${certifications.length} certification(s) were added to your Skills section — review their placement.`);
  }
  if (languages.length > 0) {
    warnings.push('Languages were added to your Skills section.');
  }

  // Projects become clearly-labeled experience entries the user can review.
  const projects = sections.projects ? parseEntries(sections.projects) : [];
  for (const p of projects) {
    experience.push({
      role: p.role || p.company || 'Project',
      company: p.company && p.company !== p.role ? p.company : 'Project',
      from: p.from,
      to: p.to,
      description: p.description,
    });
  }
  if (projects.length > 0) {
    warnings.push(`${projects.length} project(s) were imported as experience entries labeled "Project" — review and adjust them.`);
  }

  if (!fullName) warnings.push('Could not detect your name — please add it.');
  if (!contact.email) warnings.push('No email address found in the file.');
  if (experience.length === 0) warnings.push('No work experience entries were detected — add them in the builder.');
  if (education.length === 0 && !sections.education) warnings.push('No education section was detected.');
  if (skills.length === 0) warnings.push('No skills section was detected — add your key skills.');

  const found = {
    name: !!fullName,
    email: !!contact.email,
    summary: !!summary,
    experience: experience.length > 0,
    education: education.length > 0,
    skills: skills.length > 0,
  };
  const confidence = Math.round(
    (Object.values(found).filter(Boolean).length / Object.keys(found).length) * 100
  );

  return {
    data: {
      fullName,
      email: contact.email,
      phone: contact.phone,
      city: contact.city,
      postalCode: '',
      linkedIn: contact.linkedIn,
      github: contact.github,
      isDeveloper: false,
      summary,
      education: education.slice(0, 20),
      experience: experience.slice(0, 30),
      skills,
    },
    warnings,
    confidence,
    detectedSections: Object.keys(sections).filter((k) => k !== '_preamble'),
  };
}

/**
 * Guardrail for AI-assisted structuring: keep only content that actually
 * appears in the source document. Whitespace/case-insensitive containment.
 */
export function appearsInSource(value, sourceText) {
  if (!value || typeof value !== 'string') return false;
  const norm = (s) => s.toLowerCase().replace(/\s+/g, ' ').trim();
  return norm(sourceText).includes(norm(value));
}
