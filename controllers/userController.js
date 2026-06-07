
const User   = require('../models/User');
const Item   = require('../models/Item');
const Skill  = require('../models/Skill');
const Deal          = require('../models/Deal');
const Swap          = require('../models/Swap');
const Rating        = require('../models/Rating');
const PaymentMethod = require('../models/PaymentMethod');
const bcrypt        = require('bcryptjs');
const { storeUpload } = require('../utils/media');
const { encrypt } = require('../utils/cardCrypto');
const { isValidId } = require('../utils/db');

exports.getOnboarding = (req, res) => {
  res.render('user/onboarding', { role: req.session.role || 'user' });
};

exports.postOnboarding = async (req, res, next) => {
  try {
    if (!req.session.userId) return res.redirect('/login');

    const { role, location, skillsOffered, skillsWanted } = req.body;

    const offered = Array.isArray(skillsOffered)
      ? skillsOffered.filter(Boolean)
      : skillsOffered ? [skillsOffered] : [];

    const wanted = Array.isArray(skillsWanted)
      ? skillsWanted.filter(Boolean)
      : skillsWanted ? [skillsWanted] : [];

    await User.findByIdAndUpdate(req.session.userId, {
      onboardingRole: ['offer', 'request', 'both'].includes(role) ? role : 'both',
      location:       (location || '').trim(),
      skillsOffered:  offered,
      skillsWanted:   wanted,
      onboardingDone: true
    });

    res.redirect('/skills');
  } catch (err) {
    next(err);
  }
};

exports.getProfile = async (req, res, next) => {
  try {
    if (!req.session.userId) return res.redirect('/login');
    const id = req.session.userId;

    
    const user = await User.findById(id).select('-password');
    if (!user) {
      req.session.destroy((err) => {
        if (err) console.error('[getProfile] session destroy error:', err.message);
      });
      return res.redirect('/login');
    }

    
    let userItems = [], userDeals = [], userSkills = [], purchaseHistory = [];
    try {
      [userItems, userDeals, userSkills, purchaseHistory] = await Promise.all([
        Item.find({ isDeleted: { $ne: true }, creator: id, category: 'object' }).sort({ createdAt: -1 }).limit(20),
        Item.find({ isDeleted: { $ne: true }, creator: id, category: 'deal'   }).sort({ createdAt: -1 }).limit(20),
        Skill.find({ isDeleted: { $ne: true }, creator: id }).sort({ createdAt: -1 }),
        Deal.find({ buyer: id })
            .populate('item', 'title images price')
            .sort({ createdAt: -1 })
            .limit(50)
      ]);
    } catch (queryErr) {
      console.error('[getProfile] secondary query error:', queryErr.message);
      
    }

    res.render('user/profile', {
      profileUser:     user,
      userItems:       userItems       || [],
      userDeals:       userDeals       || [],
      userSkills:      userSkills      || [],
      purchaseHistory: purchaseHistory || []
    });
  } catch (err) {
    next(err);
  }
};

exports.getSettings = async (req, res, next) => {
  try {
    if (!req.session.userId) return res.redirect('/login');

    const user = await User.findById(req.session.userId).select('-password');
    if (!user) return res.redirect('/login');

    res.render('user/settings', { user, error: null, success: null });
  } catch (err) {
    next(err);
  }
};

exports.postSettings = async (req, res, next) => {
  try {
    if (!req.session.userId) return res.redirect('/login');

    const { username, email, newPassword, location, bio } = req.body;

    if (!username || !email) {
      const user = await User.findById(req.session.userId).select('-password');
      return res.status(400).render('user/settings', {
        user,
        error:   'Username and email are required.',
        success: null
      });
    }

    const updateData = {
      username: username.trim(),
      email:    email.toLowerCase().trim(),
      location: (location || '').trim(),
      bio:      (bio      || '').trim().slice(0, 500)
    };

    if (newPassword && newPassword.length >= 6) {
      updateData.password = await bcrypt.hash(newPassword, 10);
    } else if (newPassword && newPassword.length < 6) {
      const user = await User.findById(req.session.userId).select('-password');
      return res.status(400).render('user/settings', {
        user,
        error:   'New password must be at least 6 characters.',
        success: null
      });
    }

    const updated = await User.findByIdAndUpdate(
      req.session.userId,
      updateData,
      { returnDocument: 'after', runValidators: true }
    ).select('-password');

    res.render('user/settings', {
      user:    updated,
      error:   null,
      success: 'Settings saved successfully!'
    });
  } catch (err) {
    next(err);
  }
};

exports.postUploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image file received.' });
    }

        const imageUrl = await storeUpload(req.file, req.session.userId);

    await User.findByIdAndUpdate(req.session.userId, { profileImage: imageUrl });

    res.json({ success: true, imageUrl });
  } catch (err) {
    next(err);
  }
};

exports.getSwapRequests = async (req, res, next) => {
  try {
    if (!req.session.userId) return res.redirect('/login');
    const id = req.session.userId;

    let userSwaps = [];
    try {
      userSwaps = await Swap.find({ isDeleted: { $ne: true }, $or: [{ requester: id }, { receiver: id }] })
        .populate('requester',      'username profileImage')
        .populate('receiver',       'username profileImage')
        .populate('offeredSkill',   'title')
        .populate('requestedSkill', 'title')
        .populate('offeredItem',    'title images')
        .populate('requestedItem',  'title images')
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();
    } catch (queryErr) {
      console.error('[getSwapRequests] query error:', queryErr.message);
    }

    res.render('user/swap-requests', {
      currentUserId: String(id),
      userSwaps:     userSwaps || []
    });
  } catch (err) {
    next(err);
  }
};

exports.getCurrentUser = (req, res) => {
  const user = res.locals.currentUser;
  if (!user) {
    return res.status(401).json({ success: false, error: 'Unauthorized.' });
  }

  res.json({
    success: true,
    user: {
      id: user._id.toString(),
      username: user.username,
      profileImage: user.profileImage || '',
      role: user.role || 'user'
    }
  });
};

exports.postSaveCard = async (req, res, next) => {
  try {
    const { cardNumber, cardName, expiry } = req.body;

    const digits = (cardNumber || '').replace(/\s/g, '');
    if (!/^\d{13,19}$/.test(digits)) {
      return res.status(400).json({ success: false, error: 'Invalid card number.' });
    }
    if (!/^\d{2}\/\d{2}$/.test((expiry || '').trim())) {
      return res.status(400).json({ success: false, error: 'Invalid expiry (MM/YY).' });
    }
    const name = (cardName || '').trim();
    if (!name) {
      return res.status(400).json({ success: false, error: 'Cardholder name required.' });
    }

    const last4 = digits.slice(-4);

    const duplicate = await PaymentMethod.findOne({ user: req.session.userId, last4 });
    if (duplicate) {
      return res.json({ success: true, card: { _id: duplicate._id, cardName: duplicate.cardName, last4, expiry: duplicate.expiry } });
    }

    const { encryptedData, iv, authTag } = encrypt(digits);
    const saved = await PaymentMethod.create({ 
      user: req.session.userId, 
      cardName: name, 
      last4, 
      expiry: expiry.trim(), 
      encryptedData, 
      iv, 
      authTag 
    });

    return res.json({ success: true, card: { _id: saved._id, cardName: saved.cardName, last4, expiry: saved.expiry } });
  } catch (err) {
    next(err);
  }
};

exports.getWalletCards = async (req, res, next) => {
  try {
    
    
    const cards = await PaymentMethod.find({ user: req.session.userId })
      .sort({ savedAt: -1 });
    return res.json({ success: true, cards });
  } catch (err) {
    next(err);
  }
};

exports.deleteWalletCard = async (req, res, next) => {
  try {
    await PaymentMethod.findOneAndDelete({ _id: req.params.cardId, user: req.session.userId });
    return res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

exports.getPublicProfile = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      const err = new Error('User not found.');
      err.status = 404;
      return next(err);
    }

    
    if (req.session && req.session.userId && String(req.session.userId) === id) {
      return res.redirect('/profile');
    }

    
    const profileUser = await User.findById(id)
      .select('username profileImage bio location points createdAt role isBanned profileVisibility showLocation');

    if (!profileUser || profileUser.isBanned) {
      const err = new Error('User not found.');
      err.status = 404;
      return next(err);
    }

    let userSkills = [], userItems = [], completedSwaps = [], userRatings = [], swapCount = 0;
    
    
    if (profileUser.profileVisibility !== false) {
      try {
        
        const [skills, items] = await Promise.all([
          Skill.find({ creator: id, isDeleted: { $ne: true } }).select('_id'),
          Item.find({ creator: id, isDeleted: { $ne: true } }).select('_id')
        ]);

        const targetIds = [
          ...skills.map(s => s._id),
          ...items.map(i => i._id)
        ];

        [userSkills, userItems, completedSwaps, userRatings] = await Promise.all([
          Skill.find({
            creator:        id,
            isDeleted:      { $ne: true },
            isAvailable:    true,
            approvalStatus: 'approved'
          }).sort({ createdAt: -1 }).limit(20),
          Item.find({ creator: id, isDeleted: { $ne: true }, isAvailable: true })
            .sort({ createdAt: -1 }).limit(20),
          Swap.find({
            isDeleted: { $ne: true },
            status:    { $in: ['accepted', 'completed'] },
            $or: [{ requester: id }, { receiver: id }]
          })
          .populate('requester', 'username profileImage')
          .populate('receiver', 'username profileImage')
          .populate('offeredSkill', 'title')
          .populate('requestedSkill', 'title')
          .populate('offeredItem', 'title')
          .populate('requestedItem', 'title')
          .sort({ createdAt: -1 })
          .limit(20),
          Rating.find({ target: { $in: targetIds } })
            .populate('reviewer', 'username profileImage')
            .populate('target', 'title')
            .sort({ createdAt: -1 })
            .limit(20)
        ]);

        swapCount = completedSwaps.length;
      } catch (queryErr) {
        console.error('[getPublicProfile] secondary query error:', queryErr.message);
      }
    }

    let averageRating = 0;
    let ratingCount = userRatings.length;
    if (ratingCount > 0) {
      const sum = userRatings.reduce((acc, r) => acc + r.score, 0);
      averageRating = Math.round((sum / ratingCount) * 10) / 10;
    }

    res.render('user/public-profile', {
      profileUser,
      userSkills:     userSkills     || [],
      userItems:      userItems      || [],
      completedSwaps: completedSwaps || [],
      userRatings:    userRatings    || [],
      averageRating,
      ratingCount,
      swapCount:      swapCount      || 0
    });
  } catch (err) {
    next(err);
  }
};

exports.postPrivacySettings = async (req, res, next) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized.' });
    }

    const { profileVisibility, showLocation } = req.body;

    const updateFields = {};
    if (profileVisibility !== undefined) {
      updateFields.profileVisibility = profileVisibility === true || profileVisibility === 'true';
    }
    if (showLocation !== undefined) {
      updateFields.showLocation = showLocation === true || showLocation === 'true';
    }

    await User.findByIdAndUpdate(req.session.userId, updateFields);
    return res.json({ success: true });
  } catch (err) {
    next(err);
  }
};
