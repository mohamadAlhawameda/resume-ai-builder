import mongoose from 'mongoose';

const JobPreferencesSchema = new mongoose.Schema(
  {
    titles: { type: [String], default: [] },
    skills: { type: [String], default: [] },
    // Legacy freeform location tags — kept for backward compatibility and as
    // a fallback for locations outside the structured country/region lists.
    locations: { type: [String], default: [] },
    // Structured location preferences — multi-select.
    countries: { type: [String], default: [] }, // ISO codes, e.g. ['US','CA']
    caProvinces: { type: [String], default: [] }, // full names, e.g. ['Ontario']
    usStates: { type: [String], default: [] }, // full names, e.g. ['California']
    cities: { type: [String], default: [] }, // freeform city/area names
    workType: {
      type: String,
      enum: ['any', 'full-time', 'part-time', 'contract', 'internship'],
      default: 'any',
    },
    // Legacy single-select — derived from remoteTypes for old clients.
    remote: {
      type: String,
      enum: ['any', 'remote', 'hybrid', 'onsite'],
      default: 'any',
    },
    // Multi-select work-style preference. Empty = open to any.
    remoteTypes: {
      type: [String],
      enum: ['remote', 'hybrid', 'onsite'],
      default: [],
    },
    salaryMin: { type: Number, default: null },
    salaryMax: { type: Number, default: null },
    alertsEnabled: { type: Boolean, default: true },
    emailAlerts: { type: Boolean, default: false },
    alertThreshold: { type: Number, default: 75, min: 0, max: 100 },
  },
  { _id: false }
);

// Dashboard sidebar widget keys — kept in sync with WIDGET_REGISTRY in
// src/app/dashboard/widgets.ts on the frontend. Only the sidebar column is
// customizable; the main column (resumes/score progress/week) stays fixed.
const DASHBOARD_WIDGET_KEYS = [
  'careerTarget',
  'dailyChecklist',
  'interviewReadiness',
  'careerProgress',
  'recommendations',
  'missingSkills',
  'topJobMatches',
  'recentAchievements',
  'upcomingTasks',
];

const DashboardLayoutSchema = new mongoose.Schema(
  {
    sidebarOrder: { type: [String], enum: DASHBOARD_WIDGET_KEYS, default: () => [...DASHBOARD_WIDGET_KEYS] },
    hiddenWidgets: { type: [String], enum: DASHBOARD_WIDGET_KEYS, default: [] },
  },
  { _id: false }
);

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/.+@.+\..+/, 'Please enter a valid email address'],
    },
    password: {
      type: String,
      // Google-only accounts have no password.
      required: [
        function () {
          return !this.googleId;
        },
        'Password is required',
      ],
      minlength: [6, 'Password must be at least 6 characters long'],
      select: false, // Prevent returning password in queries by default
    },
    // Google account id (`sub` claim) for "Sign in with Google". No `default`
    // on purpose: a sparse unique index only skips documents where the field
    // is entirely ABSENT, not ones where it's explicitly null — a default of
    // null would give every password-only user the same indexed value and
    // break registration after the first user (E11000 on googleId_1).
    googleId: { type: String, index: { unique: true, sparse: true } },
    // Personalization used for recommendations and job matching
    targetRole: { type: String, default: '', trim: true, maxlength: 120 },
    industry: { type: String, default: '', trim: true, maxlength: 120 },
    // Where the user is in their career — tailors onboarding copy and
    // recommendations. Empty string = not asked yet.
    careerStage: {
      type: String,
      enum: ['', 'student', 'new-grad', 'career-changer', 'experienced'],
      default: '',
    },
    jobPreferences: { type: JobPreferencesSchema, default: () => ({}) },
    dashboardLayout: { type: DashboardLayoutSchema, default: () => ({}) },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model('User', UserSchema);
export default User;
export { DASHBOARD_WIDGET_KEYS };
