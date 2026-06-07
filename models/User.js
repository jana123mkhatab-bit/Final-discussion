
const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  item:     { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  qty:      { type: Number, default: 1, min: 1 },
  addedAt:  { type: Date, default: Date.now }
}, { _id: false });

const userSchema = new mongoose.Schema({
  username:       { type: String, required: true, unique: true, trim: true },
  email:          { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:       { type: String, required: true },
  profileImage:   { type: String, default: '' },
  bio:            { type: String, default: '', maxlength: 500, trim: true },
  points:         { type: Number, default: 0 },
  role:           { type: String, enum: ['user', 'admin'], default: 'user' },
  isBanned:       { type: Boolean, default: false },
  location:       { type: String, default: '' },
  skillsOffered:  [{ type: String }],
  skillsWanted:   [{ type: String }],
  onboardingRole: { type: String, enum: ['offer', 'request', 'both', ''], default: '' },
  onboardingDone: { type: Boolean, default: false },
  lastLogin:      { type: Date, default: null },
  banReason:      { type: String, default: '', trim: true },
  moderationNote: { type: String, default: '', trim: true },
  profileVisibility: { type: Boolean, default: true },
  showLocation:      { type: Boolean, default: true },
  isOnline:          { type: Boolean, default: false },
  createdAt:      { type: Date, default: Date.now },

  
  cart: { type: [cartItemSchema], default: [] },

  
  resetToken:       { type: String, default: null },
  resetTokenExpiry: { type: Date,   default: null }
});

userSchema.index({ points: -1 });

module.exports = mongoose.model('User', userSchema);
