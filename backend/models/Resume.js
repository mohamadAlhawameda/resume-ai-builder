// models/Resume.js
import mongoose from 'mongoose';

const ResumeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  data: {
    type: Object,
    required: true
  },
  templateId: { type: String, default: 'default' }, // e.g., 'modern', 'minimal', etc.
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

export default mongoose.models.Resume || mongoose.model('Resume', ResumeSchema);
