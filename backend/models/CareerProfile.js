// The Career Digital Twin: a verified, structured record of everything a user
// has actually done, separate from any single resume. Resumes are generated
// FROM this profile for a given job; the profile is the source of truth.
//
// "Verified" means: every entry either came from a parsed document, was typed
// directly by the user, or was confirmed by the user in the Achievement
// Interview flow — never silently invented by AI. `source` tracks provenance
// and `evidence` stores the exact text it was derived from, so later features
// (Evidence Map, ATS preview) can point back to where a claim comes from.
import mongoose from 'mongoose';

const SOURCES = ['user', 'resume-import', 'ai-confirmed'];

const EvidenceSkillSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    proficiency: { type: String, enum: ['familiar', 'proficient', 'expert'], default: 'proficient' },
    evidence: { type: String, default: '', maxlength: 500 }, // e.g. "Used in: Senior Engineer @ Acme"
    source: { type: String, enum: SOURCES, default: 'user' },
  },
  { _id: false }
);

const VaultItemSchema = new mongoose.Schema(
  {
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    type: { type: String, enum: ['bullet', 'achievement', 'project', 'story'], required: true },
    title: { type: String, default: '', trim: true, maxlength: 200 },
    text: { type: String, required: true, maxlength: 2000 },
    metric: { type: String, default: '', maxlength: 200 }, // extracted/confirmed measurable result
    tags: { type: [String], default: [] },
    source: { type: String, enum: SOURCES, default: 'user' },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const ProjectSchema = new mongoose.Schema(
  {
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: '', maxlength: 2000 },
    skills: { type: [String], default: [] },
    url: { type: String, default: '', maxlength: 500 },
    from: { type: String, default: '', maxlength: 40 },
    to: { type: String, default: '', maxlength: 40 },
  },
  { _id: false }
);

const CertificationSchema = new mongoose.Schema(
  {
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    issuer: { type: String, default: '', trim: true, maxlength: 200 },
    issuedDate: { type: String, default: '', maxlength: 40 },
    expiryDate: { type: String, default: '', maxlength: 40 },
    credentialUrl: { type: String, default: '', maxlength: 500 },
  },
  { _id: false }
);

const LanguageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    proficiency: {
      type: String,
      enum: ['basic', 'conversational', 'professional', 'fluent', 'native'],
      default: 'professional',
    },
  },
  { _id: false }
);

const RoadmapItemSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, maxlength: 400 },
    done: { type: Boolean, default: false },
  },
  { _id: false }
);

const RoadmapSchema = new mongoose.Schema(
  {
    targetRole: { type: String, default: '', maxlength: 160 },
    generatedAt: { type: Date, default: null },
    thirtyDay: { type: [RoadmapItemSchema], default: [] },
    ninetyDay: { type: [RoadmapItemSchema], default: [] },
    longTerm: { type: [RoadmapItemSchema], default: [] },
  },
  { _id: false }
);

const CareerProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
      unique: true,
      index: true,
    },
    // Verified sections — the Digital Twin
    experience: { type: Array, default: [] }, // same shape as ResumeData.experience
    education: { type: Array, default: [] }, // same shape as ResumeData.education
    skills: { type: [EvidenceSkillSchema], default: [] },
    projects: { type: [ProjectSchema], default: [] },
    certifications: { type: [CertificationSchema], default: [] },
    languages: { type: [LanguageSchema], default: [] },

    // Career Vault — reusable, evidence-backed content for any resume/cover letter
    vault: { type: [VaultItemSchema], default: [] },

    // Preferences & goals (feeds job matching, radar, roadmap)
    careerGoals: { type: String, default: '', maxlength: 1000 },
    targetRoles: { type: [String], default: [] },

    // Career GPS
    roadmap: { type: RoadmapSchema, default: () => ({}) },

    // Career Passport (public sharing)
    passport: {
      enabled: { type: Boolean, default: false },
      // No `default` on purpose: a sparse unique index only skips documents
      // where the field is entirely ABSENT, not ones explicitly set to null —
      // see the identical fix on User.googleId for the full explanation.
      slug: { type: String, index: { unique: true, sparse: true } },
      headline: { type: String, default: '', maxlength: 200 },
      showProjects: { type: Boolean, default: true },
      showCertifications: { type: Boolean, default: true },
      resumeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Resume', default: null },
      viewCount: { type: Number, default: 0 },
    },

    completionPct: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.CareerProfile || mongoose.model('CareerProfile', CareerProfileSchema);
