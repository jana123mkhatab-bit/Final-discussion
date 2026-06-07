'use strict';
const mongoose = require('mongoose');

const skillSchema = new mongoose.Schema({
  title:           { type: String, required: true, trim: true },
  description:     { type: String, required: true, trim: true },
  creator:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  images:          [{ type: String }],
  category:        { type: String, default: '', trim: true },   
  level:           { type: String, enum: ['beginner', 'intermediate', 'expert', ''], default: '' },
  itemLocation:    { type: String, default: '', trim: true },
  pointsValue:     { type: Number, default: 0, min: 0 },
  isAvailable:     { type: Boolean, default: true },
  wantsInExchange: { type: String, default: '', trim: true },
  cvUrl:           { type: String, default: '', trim: true },
  cachedRating:          { type: Number, default: 0, min: 0, max: 5 },
  cachedRatingCount:     { type: Number, default: 0 },
  tags:            [{ type: String }],
  approvalStatus:  { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' },
  isDeleted:       { type: Boolean, default: false },
  deletedAt:       { type: Date,    default: null  },
  createdAt:       { type: Date, default: Date.now }
});

skillSchema.index({ isDeleted: 1, isAvailable: 1, approvalStatus: 1, createdAt: -1 });

skillSchema.index({ creator: 1 });

skillSchema.index({ approvalStatus: 1, createdAt: -1 });

module.exports = mongoose.model('Skill', skillSchema);
