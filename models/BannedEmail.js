'use strict';
const mongoose = require('mongoose');

const bannedEmailSchema = new mongoose.Schema({
  email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  userId:   { type: String, default: '' },
  username: { type: String, default: '' },
  reason:   { type: String, default: '' },
  bannedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  bannedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('BannedEmail', bannedEmailSchema);
