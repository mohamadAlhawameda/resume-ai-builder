// models/Resume.js
import mongoose from 'mongoose';

// Snapshot of a resume at save time — powers version history & comparison.
const VersionSchema = new mongoose.Schema(
  {
    data: { type: Object, required: true },
    templateId: { type: String, default: 'classic' },
    label: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const ResumeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
      index: true,
    },
    data: {
      type: Object,
      required: true,
    },
    title: { type: String, default: '', trim: true, maxlength: 160 },
    templateId: { type: String, default: 'classic' }, // 'classic' | 'modern' | 'minimal' | 'executive' | 'creative'
    // Capped list of previous saves (most recent last).
    versions: { type: [VersionSchema], default: [] },
    // Cached result of the latest scan for dashboard display.
    lastScore: { type: Number, default: null },
    lastScannedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const MAX_VERSIONS = 20;

export default mongoose.models.Resume || mongoose.model('Resume', ResumeSchema);
