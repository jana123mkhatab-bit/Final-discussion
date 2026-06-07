'use strict';
const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema({
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  target:      { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'targetModel' },
  targetModel: { type: String, required: true, enum: ['Item', 'Skill'] },
  createdAt:   { type: Date, default: Date.now }
});

favoriteSchema.index({ user: 1, target: 1 }, { unique: true });

favoriteSchema.index({ user: 1, targetModel: 1, createdAt: -1 });

favoriteSchema.index({ target: 1, targetModel: 1 });

module.exports = mongoose.model('Favorite', favoriteSchema);
