import mongoose from 'mongoose';

// Stores every resume scan / job-description match so users can track
// how their score improves over time.
const ScanResultSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
      index: true,
    },
    resumeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Resume', default: null },
    type: { type: String, enum: ['scan', 'job-match'], required: true },

    // For type 'scan'
    overall: { type: Number, default: null },
    categories: { type: Array, default: [] },
    strengths: { type: [String], default: [] },
    topFixes: { type: [String], default: [] },

    // For type 'job-match'
    jobTitle: { type: String, default: '' },
    matchPercent: { type: Number, default: null },
    missingKeywords: { type: [String], default: [] },
    missingSkills: { type: [String], default: [] },
  },
  { timestamps: true }
);

ScanResultSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.models.ScanResult || mongoose.model('ScanResult', ScanResultSchema);
