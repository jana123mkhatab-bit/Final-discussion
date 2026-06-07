'use strict';
const mongoose = require('mongoose');

const swapSchema = new mongoose.Schema({
  requester:      { type: mongoose.Schema.Types.ObjectId, ref: 'User',  required: true },
  receiver:       { type: mongoose.Schema.Types.ObjectId, ref: 'User',  required: true },

  
  offeredSkill:   { type: mongoose.Schema.Types.ObjectId, ref: 'Skill', default: null },
  requestedSkill: { type: mongoose.Schema.Types.ObjectId, ref: 'Skill', default: null },

  
  offeredItem:    { type: mongoose.Schema.Types.ObjectId, ref: 'Item',  default: null },
  requestedItem:  { type: mongoose.Schema.Types.ObjectId, ref: 'Item',  default: null },

  
  swapType:       { type: String, enum: ['skill', 'object'], default: 'skill' },

  status:         { type: String, enum: ['pending', 'accepted', 'rejected', 'completed'], default: 'pending' },
  message:        { type: String, default: '', trim: true, maxlength: 500 },
  pointsAwarded:  { type: Boolean, default: false },
  completedAt:    { type: Date, default: null },
  cancelledAt:    { type: Date, default: null },
  isDeleted:      { type: Boolean, default: false },
  deletedAt:      { type: Date,    default: null  },
  flagged:        { type: Boolean, default: false },
  flaggedAt:      { type: Date,    default: null  },
  flaggedBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  
  offeredItemName:    { type: String, default: '' },
  requestedItemName:  { type: String, default: '' },
  offeredSkillName:   { type: String, default: '' },
  requestedSkillName: { type: String, default: '' },
  createdAt:      { type: Date, default: Date.now }
});

swapSchema.index({ isDeleted: 1, requester: 1, status: 1 });
swapSchema.index({ isDeleted: 1, receiver:  1, status: 1 });
swapSchema.index({ isDeleted: 1, swapType:  1, status: 1 });

swapSchema.pre('validate', function(next) {
  if (this.swapType === 'skill') {
    if (!this.offeredSkill || !this.requestedSkill) {
      const err = new Error('Skill swaps require both offeredSkill and requestedSkill.');
      if (typeof next === 'function') return next(err);
      throw err;
    }
  }
  if (this.swapType === 'object') {
    if (!this.offeredItem || !this.requestedItem) {
      const err = new Error('Object swaps require both offeredItem and requestedItem.');
      if (typeof next === 'function') return next(err);
      throw err;
    }
  }
  if (typeof next === 'function') next();
});

module.exports = mongoose.model('Swap', swapSchema);
