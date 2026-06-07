'use strict';
const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  title:           { type: String, required: true },
  description:     { type: String, required: true },
  category:        { type: String, enum: ['object', 'deal'], required: true },
  creator:         { type: mongoose.Schema.Types.ObjectId, ref: 'User' },   
  images:          [{ type: String }],
  pointsValue:     { type: Number, default: 0 },
  isAvailable:     { type: Boolean, default: true },
  condition:       { type: String, default: '' },
  itemLocation:    { type: String, default: '' },
  price:           { type: Number, default: null },          
  originalPrice:   { type: Number, default: null },          
  subCategory:     { type: String, default: '' },            
  wantsInExchange: { type: String, default: '' },            
  cachedRating:          { type: Number, default: 0, min: 0, max: 5 },
  cachedRatingCount:     { type: Number, default: 0 },
  tags:            [{ type: String }],
  approvalStatus:  { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' },
  isDeleted:       { type: Boolean, default: false },
  deletedAt:       { type: Date,    default: null  },
  createdAt:       { type: Date, default: Date.now }
});

itemSchema.index({ isDeleted: 1, category: 1, isAvailable: 1, createdAt: -1 });

itemSchema.index({ creator: 1 });

module.exports = mongoose.model('Item', itemSchema);
