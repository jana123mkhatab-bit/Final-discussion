const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
  reviewer:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  target:      { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'targetModel' },
  targetModel: { type: String, required: true, enum: ['Item', 'Skill'] },
  score:       { type: Number, required: true, min: 1, max: 5 },
  comment:     { type: String, default: '', trim: true, maxlength: 500 },
  createdAt:   { type: Date, default: Date.now }
});

ratingSchema.index({ reviewer: 1, target: 1 }, { unique: true });

ratingSchema.index({ target: 1, targetModel: 1 });

ratingSchema.statics.recomputeRating = async function(targetId, targetModel) {
  const result = await this.aggregate([
    { $match: { target: new mongoose.Types.ObjectId(targetId), targetModel } },
    { $group: { _id: '$target', avg: { $avg: '$score' }, count: { $sum: 1 } } }
  ]);
  
  const cachedRating = result.length > 0 ? Math.round(result[0].avg * 10) / 10 : 0;
  const cachedRatingCount = result.length > 0 ? result[0].count : 0;
  
  const Model = mongoose.model(targetModel);
  await Model.findByIdAndUpdate(targetId, { cachedRating, cachedRatingCount });
};

module.exports = mongoose.model('Rating', ratingSchema);
