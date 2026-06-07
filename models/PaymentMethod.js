const mongoose = require('mongoose');

const paymentMethodSchema = new mongoose.Schema({
  user:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  cardName:      { type: String, required: true, trim: true },
  last4:         { type: String, required: true },
  expiry:        { type: String, required: true },
  encryptedData: { type: String, required: true, select: false },
  iv:            { type: String, required: true, select: false },
  authTag:       { type: String, required: true, select: false },
  savedAt:       { type: Date, default: Date.now }
});

paymentMethodSchema.index({ user: 1, savedAt: -1 });

module.exports = mongoose.model('PaymentMethod', paymentMethodSchema);
