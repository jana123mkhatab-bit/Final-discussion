'use strict';
const Rating = require('../models/Rating');
const Item = require('../models/Item');
const Skill = require('../models/Skill');
const Deal = require('../models/Deal');
const Swap = require('../models/Swap');
const { isValidId } = require('../utils/db');

function resolveTargetModel(targetModel) {
  if (targetModel === 'Item') return Item;
  if (targetModel === 'Skill') return Skill;
  return null;
}

function parseScore(value) {
  const score = Number(value);
  if (!Number.isInteger(score)) return null;
  if (score < 1 || score > 5) return null;
  return score;
}

async function canRateTarget({ reviewerId, targetId, targetModel, target }) {
  if (!reviewerId) {
    return { canRate: false, reason: 'Log in to rate this listing.' };
  }

  if (target && target.creator && String(target.creator) === String(reviewerId)) {
    return { canRate: false, reason: 'You cannot rate your own listing.' };
  }

  const completedSwapStatuses = ['accepted', 'completed'];

  if (targetModel === 'Item') {
    const isDeal = target && target.category === 'deal';
    if (isDeal) {
      const deal = await Deal.exists({
        item: targetId,
        buyer: reviewerId,
        status: 'delivered'
      });

      if (deal) return { canRate: true };
      return { canRate: false, reason: 'Rating is available after the order is delivered.' };
    }

    const swap = await Swap.exists({
      isDeleted: { $ne: true },
      status: { $in: completedSwapStatuses },
      $or: [
        { offeredItem: targetId },
        { requestedItem: targetId }
      ],
      $and: [
        { $or: [{ requester: reviewerId }, { receiver: reviewerId }] }
      ]
    });

    if (swap) return { canRate: true };
    return { canRate: false, reason: 'Rating is available after the swap is completed.' };
  }

  if (targetModel === 'Skill') {
    const swap = await Swap.exists({
      isDeleted: { $ne: true },
      status: { $in: completedSwapStatuses },
      $or: [
        { offeredSkill: targetId },
        { requestedSkill: targetId }
      ],
      $and: [
        { $or: [{ requester: reviewerId }, { receiver: reviewerId }] }
      ]
    });

    if (swap) return { canRate: true };
    return { canRate: false, reason: 'Rating is available after the swap is completed.' };
  }

  return { canRate: false, reason: 'Rating is not available for this listing.' };
}

exports.getSummary = async (req, res, next) => {
  try {
    const targetId = req.params.targetId;
    const targetModel = req.query.model || req.query.targetModel;

    if (!isValidId(targetId)) {
      return res.status(400).json({ success: false, error: 'Invalid target ID.' });
    }

    const Model = resolveTargetModel(targetModel);
    if (!Model) {
      return res.status(400).json({ success: false, error: 'Invalid target model.' });
    }

    const target = await Model.findOne({ _id: targetId, isDeleted: { $ne: true } })
      .select('cachedRating cachedRatingCount creator category');

    if (!target) {
      return res.status(404).json({ success: false, error: 'Target not found.' });
    }

    let userRating = null;
    if (req.session && req.session.userId) {
      const existing = await Rating.findOne({ reviewer: req.session.userId, target: targetId })
        .select('score comment');
      if (existing) {
        userRating = { score: existing.score, comment: existing.comment || '' };
      }
    }

    const eligibility = await canRateTarget({
      reviewerId: req.session && req.session.userId,
      targetId,
      targetModel,
      target
    });

    const canRate = userRating ? true : eligibility.canRate;

    res.json({
      success: true,
      rating: {
        average: target.cachedRating || 0,
        count: target.cachedRatingCount || 0
      },
      userRating,
      canRate,
      reason: canRate ? '' : eligibility.reason
    });
  } catch (err) {
    next(err);
  }
};

exports.upsert = async (req, res, next) => {
  try {
    const { targetId, targetModel, score, comment } = req.body;

    if (!isValidId(targetId)) {
      return res.status(400).json({ success: false, error: 'Invalid target ID.' });
    }

    const Model = resolveTargetModel(targetModel);
    if (!Model) {
      return res.status(400).json({ success: false, error: 'Invalid target model.' });
    }

    const parsedScore = parseScore(score);
    if (!parsedScore) {
      return res.status(400).json({ success: false, error: 'Score must be an integer from 1 to 5.' });
    }

    const target = await Model.findOne({ _id: targetId, isDeleted: { $ne: true } })
      .select('creator category');
    if (!target) {
      return res.status(404).json({ success: false, error: 'Target not found.' });
    }

    const reviewerId = req.session.userId;
    if (target.creator && String(target.creator) === String(reviewerId)) {
      return res.status(403).json({ success: false, error: 'You cannot rate your own listing.' });
    }

    const eligibility = await canRateTarget({
      reviewerId,
      targetId,
      targetModel,
      target
    });
    if (!eligibility.canRate) {
      return res.status(403).json({ success: false, error: eligibility.reason || 'Rating not allowed yet.' });
    }

    const payload = {
      reviewer: reviewerId,
      target: targetId,
      targetModel,
      score: parsedScore,
      comment: (comment || '').trim()
    };

    const rating = await Rating.findOneAndUpdate(
      { reviewer: reviewerId, target: targetId },
      payload,
      { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
    );

    await Rating.recomputeRating(targetId, targetModel);
    const updated = await Model.findById(targetId).select('cachedRating cachedRatingCount');

    res.json({
      success: true,
      rating: { score: rating.score, comment: rating.comment || '' },
      average: updated ? (updated.cachedRating || 0) : 0,
      count: updated ? (updated.cachedRatingCount || 0) : 0
    });
  } catch (err) {
    next(err);
  }
};
