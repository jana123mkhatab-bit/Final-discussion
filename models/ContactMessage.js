
const mongoose = require('mongoose');

const contactMessageSchema = new mongoose.Schema({
  name:       { type: String, required: true, trim: true },
  email:      { type: String, required: true, trim: true, lowercase: true },
  topic:      { type: String, default: 'General Question' },
  message:    { type: String, required: true, trim: true },
  
  status:     { type: String, enum: ['open', 'in_progress', 'resolved'], default: 'open' },
  handledBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  resolvedAt: { type: Date, default: null },
  createdAt:  { type: Date, default: Date.now }
});

contactMessageSchema.index({ status: 1, createdAt: -1 });

contactMessageSchema.index({ handledBy: 1, status: 1 }, { sparse: true });

module.exports = mongoose.model('ContactMessage', contactMessageSchema, 'contactmessages');

