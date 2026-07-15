import mongoose from 'mongoose';

// A company the user watches. The daily sweep (services/scheduledChecks.js)
// checks the live job cache for new postings at watched companies that match
// the user's profile and raises a Notification — alerts reuse the existing
// Notification model rather than adding new infrastructure.
const WatchlistCompanySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
      index: true,
    },
    companyName: { type: String, required: true, trim: true, maxlength: 300 },
    // Job ids already alerted on, so a job only ever notifies once.
    notifiedJobIds: { type: [String], default: [] },
  },
  { timestamps: true }
);

WatchlistCompanySchema.index({ userId: 1, companyName: 1 }, { unique: true });

export default mongoose.models.WatchlistCompany || mongoose.model('WatchlistCompany', WatchlistCompanySchema);
