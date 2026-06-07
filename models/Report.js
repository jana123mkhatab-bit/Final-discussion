
const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  reporter:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reportedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reportedItem:  { type: mongoose.Schema.Types.ObjectId, ref: 'Item',  default: null },
  reportedSkill: { type: mongoose.Schema.Types.ObjectId, ref: 'Skill', default: null },
  reason:       { type: String, required: true, trim: true },
  details:      { type: String, default: '', trim: true, maxlength: 1000 },
  status:       { type: String, enum: ['open', 'resolved', 'dismissed'], default: 'open' },
  chatLog: [{
    author:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role:      { type: String, enum: ['admin', 'reporter'], required: true },
    text:      { type: String, required: true, trim: true, maxlength: 1000 },
    timestamp: { type: Date, default: Date.now }
  }],
  resolvedBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  resolvedAt:   { type: Date, default: null },
  createdAt:    { type: Date, default: Date.now }
});

reportSchema.index({ status: 1, createdAt: -1 });

reportSchema.index({ reportedUser:  1 }, { sparse: true });
reportSchema.index({ reportedItem:  1 }, { sparse: true });
reportSchema.index({ reportedSkill: 1 }, { sparse: true });

reportSchema.pre('validate', function(next) {
  if (!this.reportedUser && !this.reportedItem && !this.reportedSkill) {
    const err = new Error('A report must target at least one of: a user, an item, or a skill.');
    if (typeof next === 'function') return next(err);
    throw err;
  }
  if (typeof next === 'function') next();
});

module.exports = mongoose.model('Report', reportSchema);

