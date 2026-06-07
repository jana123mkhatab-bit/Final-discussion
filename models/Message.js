
const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema({
  url:          { type: String, required: true },
  originalName: { type: String, required: true },
  mimeType:     { type: String, required: true },
  size:         { type: Number, required: true }
}, { _id: false });

const messageSchema = new mongoose.Schema({
  sender:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  receiver:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  text:        { type: String, trim: true, maxlength: 2000, default: '' },
  attachments: { type: [attachmentSchema], default: [] },
  isRead:      { type: Boolean, default: false },
  createdAt:   { type: Date, default: Date.now }
});

messageSchema.pre('validate', function () {
  if (!this.text && this.attachments.length === 0) {
    this.invalidate('text', 'Message must have text or at least one attachment.');
  }
});

messageSchema.index({ sender: 1, receiver: 1, createdAt: 1 });

messageSchema.index({ receiver: 1, isRead: 1 });

module.exports = mongoose.model('Message', messageSchema);
