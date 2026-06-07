'use strict';
const mongoose = require('mongoose');

const adminLogSchema = new mongoose.Schema({
  admin:            { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action:           {
    type: String, required: true, trim: true,
    enum: [
      'ban_user',
      'unban_user',
      'delete_item',
      'delete_skill',
      'delete_swap',
      'resolve_report',
      'dismiss_report',
      'adjust_points',
      'hard_delete',
      'assign_contact_message',
      'resolve_contact_message',
      'flag_swap',
      'unflag_swap',
      'approve_skill',
      'reject_skill',
      'approve_object',
      'reject_object'
    ]
  },
  targetCollection: { type: String, required: true, trim: true }, 
  targetId:         { type: mongoose.Schema.Types.ObjectId, required: true },
  metadata:         { type: mongoose.Schema.Types.Mixed, default: {} }, 
  createdAt:        { type: Date, default: Date.now }
});

adminLogSchema.index({ createdAt: -1 });

adminLogSchema.index({ admin: 1, createdAt: -1 });

adminLogSchema.index({ targetCollection: 1, targetId: 1, createdAt: -1 });

module.exports = mongoose.model('AdminLog', adminLogSchema);
