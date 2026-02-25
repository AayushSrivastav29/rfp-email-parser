import mongoose from 'mongoose';

const LogSchema = new mongoose.Schema({
  status: { type: String, enum: ['success', 'skipped', 'error'], required: true },
  sender: { type: String },
  subject: { type: String },
  reason: { type: String, default: null },
  error_message: { type: String, default: null },
}, { timestamps: true });

// Auto-delete logs after 30 days
LogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

export default mongoose.models.Log || mongoose.model('Log', LogSchema);