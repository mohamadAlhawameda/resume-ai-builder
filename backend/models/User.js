import mongoose from 'mongoose';

const JobPreferencesSchema = new mongoose.Schema(
  {
    titles: { type: [String], default: [] },
    skills: { type: [String], default: [] },
    locations: { type: [String], default: [] },
    workType: {
      type: String,
      enum: ['any', 'full-time', 'part-time', 'contract', 'internship'],
      default: 'any',
    },
    remote: {
      type: String,
      enum: ['any', 'remote', 'hybrid', 'onsite'],
      default: 'any',
    },
    salaryMin: { type: Number, default: null },
    salaryMax: { type: Number, default: null },
    alertsEnabled: { type: Boolean, default: true },
    emailAlerts: { type: Boolean, default: false },
    alertThreshold: { type: Number, default: 75, min: 0, max: 100 },
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
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters long'],
      select: false, // Prevent returning password in queries by default
    },
    // Personalization used for recommendations and job matching
    targetRole: { type: String, default: '', trim: true, maxlength: 120 },
    industry: { type: String, default: '', trim: true, maxlength: 120 },
    jobPreferences: { type: JobPreferencesSchema, default: () => ({}) },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model('User', UserSchema);
export default User;
