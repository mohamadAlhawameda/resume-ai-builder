// Shared domain types used across pages/components. The backend stores
// `Resume.data` as a flexible object, so every field here must stay optional-
// tolerant when reading data saved by older versions of the app.

export interface Education {
  school: string;
  degree: string;
  from: string;
  to: string;
  achievements?: string;
}

export interface Experience {
  company: string;
  role: string;
  from: string;
  to: string;
  description: string;
}

export type SectionKey = 'summary' | 'experience' | 'education' | 'skills';

export const DEFAULT_SECTION_ORDER: SectionKey[] = ['summary', 'experience', 'education', 'skills'];

export const SECTION_LABELS: Record<SectionKey, string> = {
  summary: 'Professional Summary',
  experience: 'Experience',
  education: 'Education',
  skills: 'Skills',
};

export interface TemplateCustomization {
  accentColor: string; // hex — templates/PDF export require non-oklch colors
  fontFamily: 'sans' | 'serif' | 'mono';
  density: 'compact' | 'normal' | 'relaxed';
}

export const DEFAULT_CUSTOMIZATION: TemplateCustomization = {
  accentColor: '#2563eb',
  fontFamily: 'sans',
  density: 'normal',
};

export interface ResumeData {
  fullName: string;
  email: string;
  phone: string;
  city: string;
  postalCode: string;
  linkedIn: string;
  github: string;
  isDeveloper: boolean;
  summary: string;
  education: Education[];
  experience: Experience[];
  skills: string[];
  // Newer optional fields — older saved resumes won't have these.
  title?: string;
  targetRole?: string;
  sectionOrder?: SectionKey[];
  hiddenSections?: SectionKey[];
  customization?: TemplateCustomization;
}

export type TemplateId = 'classic' | 'modern' | 'minimal' | 'executive' | 'creative';

export interface ResumeRecord {
  _id: string;
  userId: string;
  data: ResumeData;
  templateId: TemplateId | 'default' | string;
  title?: string;
  createdAt: string;
  updatedAt: string;
  versions?: ResumeVersion[];
}

export interface ResumeVersion {
  _id?: string;
  data: ResumeData;
  templateId?: string;
  label?: string;
  createdAt: string;
}

// ---------- Analysis / scanning ----------

export type ScanCategoryKey =
  | 'ats'
  | 'formatting'
  | 'impact'
  | 'keywords'
  | 'skills'
  | 'experience'
  | 'grammar'
  | 'readability'
  | 'completeness';

export const SCAN_CATEGORY_LABELS: Record<ScanCategoryKey, string> = {
  ats: 'ATS Compatibility',
  formatting: 'Formatting',
  impact: 'Impact',
  keywords: 'Keywords',
  skills: 'Skills',
  experience: 'Experience',
  grammar: 'Grammar & Language',
  readability: 'Readability',
  completeness: 'Completeness',
};

export interface ScanCategory {
  key: ScanCategoryKey;
  score: number; // 0–100
  explanation: string;
  suggestions: string[];
}

export interface LanguageFinding {
  type: 'weak' | 'filler' | 'repetition' | 'passive' | 'spelling';
  term: string;
  count: number;
  advice: string;
}

export interface ScanResult {
  _id?: string;
  resumeId?: string;
  overall: number;
  categories: ScanCategory[];
  strengths: string[];
  topFixes: string[];
  languageFindings: LanguageFinding[];
  actionVerbSuggestions: string[];
  createdAt?: string;
}

export interface JobMatchResult {
  _id?: string;
  matchPercent: number;
  summary: string;
  matchedKeywords: string[];
  missingKeywords: string[];
  matchedSkills: string[];
  missingSkills: string[];
  missingQualifications: string[];
  bulletRewrites: { original: string; improved: string; reason: string }[];
  keywordPlan: string[];
  jobTitle?: string;
  createdAt?: string;
}

export interface ScanHistoryItem {
  _id: string;
  type: 'scan' | 'job-match';
  overall?: number;
  matchPercent?: number;
  jobTitle?: string;
  resumeId?: string;
  createdAt: string;
}

// ---------- Jobs ----------

export interface JobPreferences {
  titles: string[];
  skills: string[];
  locations: string[];
  workType: 'any' | 'full-time' | 'part-time' | 'contract' | 'internship';
  remote: 'any' | 'remote' | 'hybrid' | 'onsite';
  salaryMin?: number | null;
  salaryMax?: number | null;
  alertsEnabled: boolean;
  emailAlerts: boolean;
  alertThreshold: number; // minimum match % that triggers an alert
}

export const DEFAULT_JOB_PREFERENCES: JobPreferences = {
  titles: [],
  skills: [],
  locations: [],
  workType: 'any',
  remote: 'any',
  salaryMin: null,
  salaryMax: null,
  alertsEnabled: true,
  emailAlerts: false,
  alertThreshold: 75,
};

export interface Job {
  id: string;
  provider: string;
  title: string;
  company: string;
  location: string;
  remote: 'remote' | 'hybrid' | 'onsite' | 'unknown';
  workType: string;
  salaryMin?: number | null;
  salaryMax?: number | null;
  url?: string;
  description: string;
  skills: string[];
  /** ISO country codes the posting is open to — subset of ['US','CA']. */
  countries?: string[];
  /** Normalized state/province names, e.g. ['Ontario','California']. */
  regions?: string[];
  postedAt?: string;
  isSampleData: boolean;
  match?: {
    percent: number;
    matchedSkills: string[];
    missingSkills: string[];
    reasons: string[];
  };
}

export type SavedJobStatus = 'saved' | 'applied' | 'interviewing' | 'offer' | 'rejected';

export interface SavedJob {
  _id: string;
  job: Job;
  status: SavedJobStatus;
  matchPercent?: number;
  notes?: string;
  appliedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Response from POST /resume/import (PDF/DOCX upload). */
export interface ImportResumeResult {
  resume: ResumeRecord;
  warnings: string[];
  confidence: number; // 0–100, share of core sections detected
  aiUsed: boolean;
}

/** One AI-generated interview question with STAR preparation guidance. */
export interface InterviewQuestion {
  question: string;
  category: 'behavioral' | 'technical' | 'motivation' | 'general';
  starHint: string;
}

export interface AppNotification {
  _id: string;
  type: 'job-match' | 'scan' | 'system';
  title: string;
  body: string;
  read: boolean;
  meta?: Record<string, unknown>;
  createdAt: string;
}

// ---------- Helpers ----------

export function emptyResumeData(): ResumeData {
  return {
    fullName: '',
    email: '',
    phone: '',
    city: '',
    postalCode: '',
    linkedIn: '',
    github: '',
    isDeveloper: false,
    summary: '',
    education: [],
    experience: [],
    skills: [],
    title: '',
    targetRole: '',
    sectionOrder: [...DEFAULT_SECTION_ORDER],
    hiddenSections: [],
    customization: { ...DEFAULT_CUSTOMIZATION },
  };
}

/** Merge stored (possibly partial/legacy) resume data with defaults. */
export function normalizeResumeData(raw: Partial<ResumeData> | null | undefined): ResumeData {
  const base = emptyResumeData();
  if (!raw || typeof raw !== 'object') return base;
  return {
    ...base,
    ...raw,
    education: Array.isArray(raw.education) ? raw.education : [],
    experience: Array.isArray(raw.experience) ? raw.experience : [],
    skills: Array.isArray(raw.skills) ? raw.skills.filter((s) => typeof s === 'string') : [],
    sectionOrder:
      Array.isArray(raw.sectionOrder) && raw.sectionOrder.length > 0
        ? (raw.sectionOrder.filter((s) => DEFAULT_SECTION_ORDER.includes(s as SectionKey)) as SectionKey[])
        : [...DEFAULT_SECTION_ORDER],
    hiddenSections: Array.isArray(raw.hiddenSections)
      ? (raw.hiddenSections.filter((s) => DEFAULT_SECTION_ORDER.includes(s as SectionKey)) as SectionKey[])
      : [],
    customization: { ...DEFAULT_CUSTOMIZATION, ...(raw.customization || {}) },
  };
}

/** Rough profile completeness used on the dashboard and builder. */
export function resumeCompleteness(data: ResumeData): number {
  let score = 0;
  const add = (cond: boolean, pts: number) => {
    if (cond) score += pts;
  };
  add(!!data.fullName.trim(), 10);
  add(!!data.email.trim(), 10);
  add(!!data.phone.trim(), 5);
  add(!!data.city.trim(), 5);
  add(data.summary.trim().length >= 100, 20);
  add(data.experience.length > 0, 20);
  add(data.education.length > 0, 15);
  add(data.skills.filter((s) => s.trim()).length >= 5, 15);
  return Math.min(100, score);
}
