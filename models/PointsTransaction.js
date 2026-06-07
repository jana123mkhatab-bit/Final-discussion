'use strict';
const mongoose = require('mongoose');

const pointsTransactionSchema = new mongoose.Schema({
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  delta:       { type: Number, required: true },           
  balance:     { type: Number, required: true },           
  reason:      { type: String, required: true, trim: true, enum: [
    'swap_completed',   
    'deal_purchase',    
    'deal_refund',      
    'admin_adjustment', 
    'bonus'             
  ]},
  relatedSwap: { type: mongoose.Schema.Types.ObjectId, ref: 'Swap', default: null },
  relatedDeal: { type: mongoose.Schema.Types.ObjectId, ref: 'Deal', default: null },
  note:        { type: String, default: '', trim: true, maxlength: 300 },
  createdAt:   { type: Date, default: Date.now }
});

pointsTransactionSchema.index({ user: 1, createdAt: -1 });

pointsTransactionSchema.index({ createdAt: -1 });

module.exports = mongoose.model('PointsTransaction', pointsTransactionSchema);
