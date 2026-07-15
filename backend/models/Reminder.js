import mongoose from 'mongoose';

// A user-scheduled follow-up: "nudge me about this application / contact /
// interview on this date." Delivery is read-time ("due" = dueDate <= now,
// status pending) plus a daily in-process sweep that turns newly-due
// reminders into Notifications — see services/scheduledChecks.js.
const ReminderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
      index: true,
    },
    type: {
      type: String,
      enum: ['follow-up', 'interview', 'networking', 'other'],
      default: 'follow-up',
    },
    title: { type: String, required: true, trim: true, maxlength: 300 },
    dueDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['pending', 'done', 'dismissed'],
      default: 'pending',
    },
    relatedContactId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact', default: null },
    // Provider-scoped job id, same shape as SavedJob.jobId.
    relatedJobId: { type: String, default: '', maxlength: 200 },
    // Set when the daily sweep has already created a Notification for this
    // reminder, so it never double-notifies.
    notifiedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

ReminderSchema.index({ userId: 1, status: 1, dueDate: 1 });

export default mongoose.models.Reminder || mongoose.model('Reminder', ReminderSchema);
