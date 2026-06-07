'use strict';
const Swap         = require('../models/Swap');
const Skill        = require('../models/Skill');
const Item         = require('../models/Item');
const User         = require('../models/User');
const Notification = require('../models/Notification');
const { awardPoints } = require('./pointsController');
const { isValidId }   = require('../utils/db');
const { notifyUser }  = require('../utils/socket');

function getEmail() {
  try { return require('../utils/email'); } catch (e) { return {}; }
}

exports.postRequestSwap = async (req, res, next) => {
  try {
    const { offeredSkillId, requestedSkillId, requestedItemId, offeredItemId } = req.body;
    const isJson = req.headers['content-type'] === 'application/json';

    
    if (requestedItemId) {
      if (!isValidId(requestedItemId) || !isValidId(offeredItemId)) {
        const err = new Error('Invalid item ID.');
        err.status = 400;
        if (isJson) return res.status(400).json({ success: false, message: err.message });
        return next(err);
      }

      const offeredItem = await Item.findOne({ _id: offeredItemId, isDeleted: { $ne: true } }).select('creator isAvailable title');
      if (!offeredItem || offeredItem.creator.toString() !== req.session.userId) {
        const err = new Error('You do not own the offered item or it does not exist.');
        err.status = 400;
        if (isJson) return res.status(400).json({ success: false, message: err.message });
        return next(err);
      }
      if (!offeredItem.isAvailable) {
        const err = new Error('Offered item is not available.');
        err.status = 400;
        if (isJson) return res.status(400).json({ success: false, message: err.message });
        return next(err);
      }

      const requestedItem = await Item.findOne({ _id: requestedItemId, isDeleted: { $ne: true } }).select('creator title isAvailable');
      if (!requestedItem) {
        const err = new Error('Item not found.');
        err.status = 404;
        if (isJson) return res.status(404).json({ success: false, message: err.message });
        return next(err);
      }

      if (!requestedItem.isAvailable) {
        if (isJson) return res.status(400).json({ success: false, message: 'This item is no longer available for swapping.' });
        const err = new Error('This item is no longer available for swapping.');
        err.status = 400;
        return next(err);
      }

      if (requestedItem.creator.toString() === req.session.userId) {
        if (isJson) return res.status(400).json({ success: false, message: 'You cannot swap with yourself.' });
        const err = new Error('You cannot swap with yourself.');
        err.status = 400;
        return next(err);
      }

      const duplicate = await Swap.findOne({
        isDeleted:     { $ne: true },
        requester:     req.session.userId,
        requestedItem: requestedItem._id,
        status:        { $in: ['pending', 'accepted'] },
      });
      if (duplicate) {
        if (isJson) return res.status(400).json({ success: false, message: 'You already have an active swap request for this item.' });
        const err = new Error('You already have an active swap request for this item.');
        err.status = 400;
        return next(err);
      }

      const newSwap = await Swap.create({
        requester:         req.session.userId,
        receiver:          requestedItem.creator,
        offeredItem:       offeredItemId,
        requestedItem:     requestedItem._id,
        swapType:          'object',
        offeredItemName:   offeredItem.title   || '',
        requestedItemName: requestedItem.title || '',
      });

      const notif = await Notification.create({
        recipient:   requestedItem.creator,
        type:        'swap_request',
        message:     `Someone wants to swap for your "${requestedItem.title}". Check your swaps!`,
        relatedSwap: newSwap._id,
      });

      notifyUser(String(requestedItem.creator), 'notification', {
        id:          String(notif._id),
        type:        notif.type,
        message:     notif.message,
        relatedSwap: String(newSwap._id),
        createdAt:   notif.createdAt,
      });

      
      const requesterUser = await User.findById(req.session.userId).select('email username').lean();
      if (requesterUser) {
        const emailSvc = getEmail();
        if (typeof emailSvc.sendSwapRequestSubmitted === 'function') {
          emailSvc.sendSwapRequestSubmitted({
            to:        requesterUser.email,
            username:  requesterUser.username,
            swapType:  'object',
            itemTitle: requestedItem.title,
          }).catch(() => {});
        }
      }

      if (isJson) return res.json({ success: true, message: 'Swap requested!' });
      return res.redirect('/objects');
    }

    
    if (!offeredSkillId || !requestedSkillId) {
      const msg = 'Skill swaps require both offeredSkillId and requestedSkillId.';
      if (isJson) return res.status(400).json({ success: false, message: msg });
      const err = new Error(msg);
      err.status = 400;
      return next(err);
    }

    if (!isValidId(offeredSkillId) || !isValidId(requestedSkillId)) {
      const err = new Error('Invalid skill ID.');
      err.status = 400;
      if (isJson) return res.status(400).json({ success: false, message: err.message });
      return next(err);
    }

    const requestedSkill = await Skill.findOne({ _id: requestedSkillId, isDeleted: { $ne: true } }).select('creator title isAvailable');
    if (!requestedSkill) {
      const err = new Error('Requested skill not found.');
      err.status = 404;
      if (isJson) return res.status(404).json({ success: false, message: err.message });
      return next(err);
    }

    if (requestedSkill.creator.toString() === req.session.userId) {
      const err = new Error('You cannot swap with yourself.');
      err.status = 400;
      if (isJson) return res.status(400).json({ success: false, message: err.message });
      return next(err);
    }

    const offeredSkillDoc = await Skill.findOne({ _id: offeredSkillId, isDeleted: { $ne: true } }).select('title').lean();

    const newSwap = await Swap.create({
      requester:          req.session.userId,
      receiver:           requestedSkill.creator,
      offeredSkill:       offeredSkillId,
      requestedSkill:     requestedSkillId,
      swapType:           'skill',
      offeredSkillName:   offeredSkillDoc ? offeredSkillDoc.title : '',
      requestedSkillName: requestedSkill.title || '',
    });

    const notif = await Notification.create({
      recipient:   requestedSkill.creator,
      type:        'swap_request',
      message:     `Someone wants to swap for your "${requestedSkill.title}". Check your swaps!`,
      relatedSwap: newSwap._id,
    });

    notifyUser(String(requestedSkill.creator), 'notification', {
      id:          String(notif._id),
      type:        notif.type,
      message:     notif.message,
      relatedSwap: String(newSwap._id),
      createdAt:   notif.createdAt,
    });

    
    const requesterUser = await User.findById(req.session.userId).select('email username').lean();
    if (requesterUser) {
      const emailSvc = getEmail();
      if (typeof emailSvc.sendSwapRequestSubmitted === 'function') {
        emailSvc.sendSwapRequestSubmitted({
          to:        requesterUser.email,
          username:  requesterUser.username,
          swapType:  'skill',
          itemTitle: requestedSkill.title,
        }).catch(() => {});
      }
    }

    if (isJson) return res.json({ success: true, message: 'Swap requested!' });
    res.redirect('/skills');
  } catch (err) {
    if (req.headers['content-type'] === 'application/json') {
      return res.status(500).json({ success: false, message: err.message });
    }
    next(err);
  }
};

exports.acceptSwap = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      const err = new Error('Invalid swap ID.');
      err.status = 400;
      return next(err);
    }

    const swap = await Swap.findOne({ _id: id, isDeleted: { $ne: true } });
    if (!swap) {
      const err = new Error('Swap not found.');
      err.status = 404;
      return next(err);
    }

    if (swap.receiver.toString() !== req.session.userId) {
      const err = new Error('Only the receiver can accept this swap.');
      err.status = 403;
      return next(err);
    }

    if (swap.status === 'accepted' && swap.pointsAwarded) {
      return res.redirect('/swap-requests');
    }

    swap.status        = 'accepted';
    swap.pointsAwarded = true;
    await swap.save();

    if (swap.swapType === 'object' && swap.requestedItem) {
      await Item.findByIdAndUpdate(swap.requestedItem, { isAvailable: false });
      await Swap.updateMany(
        { requestedItem: swap.requestedItem, status: 'pending', _id: { $ne: swap._id } },
        { status: 'rejected', cancelledAt: new Date() }
      );
    }

    const [, , notif] = await Promise.all([
      awardPoints({ userId: swap.requester, delta: 10, reason: 'swap_completed', relatedSwapId: swap._id }),
      awardPoints({ userId: swap.receiver,  delta: 10, reason: 'swap_completed', relatedSwapId: swap._id }),
      Notification.create({
        recipient:   swap.requester,
        type:        'swap_accepted',
        message:     'Your swap request was accepted!',
        relatedSwap: swap._id,
      })
    ]);

    notifyUser(String(swap.requester), 'notification', {
      id:          String(notif._id),
      type:        notif.type,
      message:     notif.message,
      relatedSwap: String(swap._id),
      createdAt:   notif.createdAt
    });

    
    const requesterUser = await User.findById(swap.requester).select('email username').lean();
    if (requesterUser) {
      
      let swappedTitle = 'your item';
      if (swap.swapType === 'object' && swap.requestedItem) {
        const it = await Item.findById(swap.requestedItem).select('title').lean();
        if (it) swappedTitle = it.title;
      } else if (swap.swapType === 'skill' && swap.requestedSkill) {
        const sk = await Skill.findById(swap.requestedSkill).select('title').lean();
        if (sk) swappedTitle = sk.title;
      }
      const emailSvc = getEmail();
      if (typeof emailSvc.sendSwapAccepted === 'function') {
        emailSvc.sendSwapAccepted({
          to:        requesterUser.email,
          username:  requesterUser.username,
          itemTitle: swappedTitle,
          swapType:  swap.swapType || 'object',
        }).catch(() => {});
      }
    }

    res.redirect('/swap-requests');
  } catch (err) {
    next(err);
  }
};

exports.rejectSwap = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      const err = new Error('Invalid swap ID.');
      err.status = 400;
      return next(err);
    }

    const swap = await Swap.findOne({ _id: id, isDeleted: { $ne: true } });
    if (!swap) {
      const err = new Error('Swap not found.');
      err.status = 404;
      return next(err);
    }

    if (swap.receiver.toString() !== req.session.userId) {
      const err = new Error('Only the receiver can reject this swap.');
      err.status = 403;
      return next(err);
    }

    swap.status      = 'rejected';
    swap.cancelledAt = new Date();
    await swap.save();

    const notif = await Notification.create({
      recipient:   swap.requester,
      type:        'swap_rejected',
      message:     'Your swap request was declined. Feel free to try another skill!',
      relatedSwap: swap._id,
    });

    notifyUser(String(swap.requester), 'notification', {
      id:          String(notif._id),
      type:        notif.type,
      message:     notif.message,
      relatedSwap: String(swap._id),
      createdAt:   notif.createdAt
    });

    res.redirect('/swap-requests?action=declined');
  } catch (err) {
    next(err);
  }
};

exports.cancelSwap = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      const err = new Error('Invalid swap ID.'); err.status = 400; return next(err);
    }
    const swap = await Swap.findOne({ _id: id, isDeleted: { $ne: true } });
    if (!swap) {
      const err = new Error('Swap not found.'); err.status = 404; return next(err);
    }
    if (swap.requester.toString() !== req.session.userId) {
      const err = new Error('Only the requester can cancel this swap.'); err.status = 403; return next(err);
    }
    if (swap.status !== 'pending') {
      const err = new Error('Only pending swaps can be cancelled.'); err.status = 400; return next(err);
    }
    swap.status      = 'rejected';
    swap.cancelledAt = new Date();
    await swap.save();
    res.redirect('/swap-requests?action=cancelled');
  } catch (err) {
    next(err);
  }
};

exports.getNotificationCount = async (req, res, next) => {
  try {
    const count = await Notification.countDocuments({
      recipient: req.session.userId,
      isRead:    false,
    });
    res.json({ count });
  } catch (err) {
    next(err);
  }
};
