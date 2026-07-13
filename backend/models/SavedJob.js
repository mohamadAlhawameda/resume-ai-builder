import mongoose from 'mongoose';

// A job the user saved or applied to. We snapshot the job payload because
// provider feeds rotate and external postings disappear.
const SavedJobSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
      index: true,
    },
    jobId: { type: String, required: true }, // provider-scoped id, e.g. "mock:12"
    job: { type: Object, required: true },
    status: {
      type: String,
      enum: ['saved', 'applied', 'interviewing', 'offer', 'rejected'],
      default: 'saved',
    },
    matchPercent: { type: Number, default: null },
    notes: { type: String, default: '', maxlength: 2000 },
    appliedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

SavedJobSchema.index({ userId: 1, jobId: 1 }, { unique: true });

export default mongoose.models.SavedJob || mongoose.model('SavedJob', SavedJobSchema);
