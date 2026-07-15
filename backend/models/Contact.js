import mongoose from 'mongoose';

// A recruiter / hiring-manager contact the user saved manually. Every field
// is user-entered: we never look up, scrape, or guess contact details —
// `email` is only what the user typed in, labeled in the UI as "add if
// publicly listed". The activity log is embedded (like Resume.versions)
// because one contact's history is small and always loaded with the contact.
const ActivityEntrySchema = new mongoose.Schema(
  {
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    type: {
      type: String,
      enum: ['connection-request-sent', 'message-sent', 'call', 'reply-received', 'meeting', 'other'],
      default: 'other',
    },
    note: { type: String, default: '', maxlength: 1000 },
    date: { type: Date, default: Date.now },
  },
  { _id: false }
);

const ContactSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
      index: true,
    },
    name: { type: String, required: true, trim: true, maxlength: 200 },
    role: { type: String, default: '', trim: true, maxlength: 200 },
    company: { type: String, default: '', trim: true, maxlength: 300 },
    email: { type: String, default: '', trim: true, maxlength: 320 },
    linkedinUrl: { type: String, default: '', trim: true, maxlength: 500 },
    // Public company careers/recruiting page — an approved-source link, not a
    // scraped one.
    careerPageUrl: { type: String, default: '', trim: true, maxlength: 500 },
    notes: { type: String, default: '', maxlength: 2000 },
    contacted: { type: Boolean, default: false },
    lastContactDate: { type: Date, default: null },
    // Provider-scoped job id (e.g. "greenhouse:stripe:123"), same shape as
    // SavedJob.jobId — links the contact to a tracked application.
    relatedJobId: { type: String, default: '', maxlength: 200 },
    activity: { type: [ActivityEntrySchema], default: [] },
  },
  { timestamps: true }
);

ContactSchema.index({ userId: 1, company: 1 });

export default mongoose.models.Contact || mongoose.model('Contact', ContactSchema);
