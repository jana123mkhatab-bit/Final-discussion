
const User               = require('../models/User');
const PointsTransaction  = require('../models/PointsTransaction');

exports.awardPoints = async ({ userId, delta, reason, relatedSwapId = null, relatedDealId = null, note = '' }) => {
  
  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $inc: { points: delta } },
    { returnDocument: 'after' }   
  );

  if (!updatedUser) return;   

  
  await PointsTransaction.create({
    user:        userId,
    delta,
    balance:     updatedUser.points,   
    reason,
    relatedSwap: relatedSwapId || null,
    relatedDeal: relatedDealId || null,
    note:        note || ''
  });
};

exports.getLeaderboard = async (req, res, next) => {
  try {
    const users = await User.find()
      .select('username profileImage points')
      .sort({ points: -1 })
      .limit(10);

    res.render('user/leaderboard', { users });
  } catch (err) {
    next(err);
  }
};

exports.getAdminUserPoints = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { isValidId } = require('../utils/db');

    if (!isValidId(userId)) {
      return res.status(400).json({ success: false, error: 'Invalid user ID.' });
    }

    const [user, transactions] = await Promise.all([
      User.findById(userId).select('username points'),
      PointsTransaction.find({ user: userId })
        .sort({ createdAt: -1 })
        .lean()
    ]);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }

    res.json({
      success: true,
      user:    { id: user._id, username: user.username, currentBalance: user.points },
      ledger:  transactions
    });
  } catch (err) {
    next(err);
  }
};

exports.postAdminAdjustPoints = async (req, res, next) => {
  try {
    const { isValidId } = require('../utils/db');
    const AdminLog       = require('../models/AdminLog');
    const { userId }     = req.params;
    const delta          = Number(req.body.delta);
    const note           = (req.body.note || '').trim().slice(0, 300);

    if (!isValidId(userId)) {
      return res.status(400).json({ success: false, error: 'Invalid user ID.' });
    }
    if (isNaN(delta) || delta === 0) {
      return res.status(400).json({ success: false, error: 'delta must be a non-zero number.' });
    }

    await exports.awardPoints({ userId, delta, reason: 'admin_adjustment', note });

    await AdminLog.create({
      admin:            req.session.userId,
      action:           'adjust_points',
      targetCollection: 'users',
      targetId:         userId,
      metadata:         { delta, note }
    });

    res.json({ success: true, message: `Points adjusted by ${delta > 0 ? '+' : ''}${delta}.` });
  } catch (err) {
    next(err);
  }
};
