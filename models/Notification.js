'use strict';
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: {
    type: String,
    enum: [
      'swap_request', 'swap_accepted', 'swap_rejected', 'swap_completed',
      'deal_confirmed', 'deal_cancelled',
      'message', 'system'
    ],
    required: true
  },
  message:     { type: String, required: true, trim: true, maxlength: 500 },
  relatedSwap: { type: mongoose.Schema.Types.ObjectId, ref: 'Swap', default: null },
  relatedDeal: { type: mongoose.Schema.Types.ObjectId, ref: 'Deal', default: null },
  isRead:      { type: Boolean, default: false },
  createdAt:   { type: Date, default: Date.now }
});

notificationSchema.index({ recipient: 1, isRead: 1 });

notificationSchema.index({ recipient: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
