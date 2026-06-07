'use strict';
const mongoose = require('mongoose');

const dealSchema = new mongoose.Schema({
  buyer:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  seller:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  item:          { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  quantity:      { type: Number, default: 1, min: 1 },
  amount:        { type: Number, required: true, min: 0 },
  paymentMethod: { type: String, enum: ['card', 'points', 'cod'], default: 'card' },
  status:        {
    type:    String,
    enum:    ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'refunded'],
    default: 'confirmed'
  },
  
  shippedAt:   { type: Date, default: null },
  deliveredAt: { type: Date, default: null },
  refundedAt:  { type: Date, default: null },
  notes:         { type: String, default: '', trim: true },
  shippingAddress: { type: String, default: '', trim: true },
  migrationNote: { type: String, default: null },
  createdAt:     { type: Date, default: Date.now }
});

dealSchema.index({ buyer: 1, createdAt: -1 });

dealSchema.index({ seller: 1, createdAt: -1 });

dealSchema.index({ createdAt: -1 });

dealSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Deal', dealSchema);

