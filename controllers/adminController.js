'use strict';
const User = require('../models/User');
const Item = require('../models/Item');
const Skill = require('../models/Skill');
const Deal = require('../models/Deal');
const Swap = require('../models/Swap');
const Notification = require('../models/Notification');
const Report = require('../models/Report');
const ContactMessage = require('../models/ContactMessage');
const AdminLog = require('../models/AdminLog');
const BannedEmail = require('../models/BannedEmail');
const Favorite = require('../models/Favorite');
const { isValidId } = require('../utils/db');
const email = require('../utils/email');
const { notifyUser } = require('../utils/socket');

exports.getDashboard = async (req, res, next) => {
  try {
    const [userCount, itemCount, skillCount, swapCount, dealCount, reportCount] = await Promise.all([
      User.countDocuments(),
      Item.countDocuments({ isDeleted: { $ne: true } }),
      Skill.countDocuments({ isDeleted: { $ne: true } }),
      Swap.countDocuments({ isDeleted: { $ne: true } }),
      Deal.countDocuments(),
      Report.countDocuments({ status: 'open' })
    ]);
    res.render('admin/admin', { userCount, itemCount, skillCount, swapCount, dealCount, reportCount });
  } catch (err) {
    next(err);
  }
};

exports.getUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.render('admin/admin-users', { users });
  } catch (err) {
    next(err);
  }
};

exports.getSkills = async (req, res, next) => {
  try {
    const skills = await Skill.find({ isDeleted: { $ne: true } })
      .populate('creator', 'username email')
      .sort({ createdAt: -1 });
    res.render('admin/admin-skills', { skills });
  } catch (err) {
    next(err);
  }
};

exports.getObjects = async (req, res, next) => {
  try {
    const objects = await Item.find({ isDeleted: { $ne: true }, category: 'object' })
      .populate('creator', 'username email')
      .sort({ createdAt: -1 });
    res.render('admin/admin-objects', { objects });
  } catch (err) {
    next(err);
  }
};

exports.getDealsAdmin = async (req, res, next) => {
  try {
    const [deals, orders] = await Promise.all([
      Item.find({ isDeleted: { $ne: true }, category: 'deal' })
        .populate('creator', 'username email')
        .sort({ createdAt: -1 }),
      Deal.find()
        .populate('buyer', 'username')
        .populate('seller', 'username')
        .populate('item', 'title price isAvailable')
        .sort({ createdAt: -1 })
        .limit(50)
    ]);
    res.render('admin/admin-deals', { deals, orders });
  } catch (err) {
    next(err);
  }
};

exports.getSwaps = async (req, res, next) => {
  try {
    const swaps = await Swap.find({ isDeleted: { $ne: true } })
      .populate('requester', 'username')
      .populate('receiver', 'username')
      .populate('offeredSkill', 'title category')
      .populate('requestedSkill', 'title category')
      .sort({ createdAt: -1 });
    res.render('admin/admin-swaps', { swaps });
  } catch (err) {
    next(err);
  }
};

exports.getReports = async (req, res, next) => {
  try {
    const reports = await Report.find()
      .populate('reporter', 'username')
      .populate('reportedUser', 'username')
      .populate('reportedItem', 'title')
      .populate('reportedSkill', 'title')
      .sort({ createdAt: -1 });
    res.render('admin/admin-reports', { reports });
  } catch (err) {
    next(err);
  }
};

exports.getReportChat = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      const err = new Error('Invalid report ID.');
      err.status = 400;
      return next(err);
    }
    const report = await Report.findById(req.params.id)
      .populate('reporter', 'username')
      .populate('reportedUser', 'username')
      .populate('reportedItem')
      .populate('reportedSkill');

    if (!report) {
      return res.status(404).send('Report not found');
    }

    if (!report.reportedUser) {
      let targetUserId = null;
      if (report.reportedItem) {
        targetUserId = report.reportedItem.creator;
      } else if (report.reportedSkill) {
        targetUserId = report.reportedSkill.creator;
      }
      if (targetUserId) {
        report.reportedUser = await User.findById(targetUserId).select('username');
      }
    }

    if (!report.reportedUser) {
      return res.send('This report does not target a specific user or listing creator, so there is no chat to review.');
    }

    let messages = [];
    if (report.chatLog && report.chatLog.length > 0) {
      messages = report.chatLog.map(m => ({
        sender: { _id: m.author, username: m.role === 'admin' ? 'Admin' : (report.reporter && report.reporter.username) || 'Reporter' },
        text: m.text,
        createdAt: m.timestamp
      }));
    } else {
      const Message = require('../models/Message');
      const reportedId = report.reportedUser._id || report.reportedUser;
      messages = await Message.find({
        $or: [
          { sender: report.reporter._id, receiver: reportedId },
          { sender: reportedId, receiver: report.reporter._id }
        ]
      })
        .populate('sender', 'username')
        .sort({ createdAt: 1 });
    }

    res.render('admin/admin-chat-review', { report, messages });
  } catch (err) {
    next(err);
  }
};

exports.banUser = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      const err = new Error('Invalid user ID.');
      err.status = 400;
      return next(err);
    }
    const { reason } = req.body;
    const bannedUser = await User.findByIdAndUpdate(req.params.id, {
      isBanned: true,
      banReason: reason || '',
    }, { returnDocument: 'after' });

    
    if (bannedUser && bannedUser.email) {
      const BannedEmail = require('../models/BannedEmail');
      await BannedEmail.findOneAndUpdate(
        { email: bannedUser.email.toLowerCase() },
        {
          email: bannedUser.email.toLowerCase(),
          userId: String(bannedUser._id),
          username: bannedUser.username || '',
          reason: reason || '',
          bannedBy: req.session.userId,
          bannedAt: new Date()
        },
        { upsert: true, new: true }
      ).catch(() => { }); 
    }

    await AdminLog.create({
      admin: req.session.userId,
      action: 'ban_user',
      targetCollection: 'users',
      targetId: req.params.id,
      metadata: { banReason: reason || '' }
    });

    
    if (bannedUser) {
      email.sendAccountBanned({
        to: bannedUser.email,
        username: bannedUser.username,
        reason: reason || 'Violation of terms of service',
      }).catch(() => { });
    }

    res.redirect('/admin/users?action=banned');
  } catch (err) {
    next(err);
  }
};

exports.unbanUser = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      const err = new Error('Invalid user ID.');
      err.status = 400;
      return next(err);
    }
    const user = await User.findById(req.params.id).select('email');
    if (!user) {
      const err = new Error('User not found.');
      err.status = 404;
      return next(err);
    }
    await User.findByIdAndUpdate(req.params.id, { isBanned: false, banReason: '' });
    await BannedEmail.deleteOne({ email: user.email.toLowerCase() });
    await AdminLog.create({
      admin: req.session.userId,
      action: 'unban_user',
      targetCollection: 'users',
      targetId: req.params.id,
      metadata: {}
    });
    res.redirect('/admin/users?action=unbanned');
  } catch (err) {
    next(err);
  }
};

exports.adminDeleteUser = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      const err = new Error('Invalid user ID.');
      err.status = 400;
      return next(err);
    }
    const userId = req.params.id;
    const now = new Date();

    
    const deletedUser = await User.findById(userId).select('email username').lean();

    const [itemDocs, skillDocs] = await Promise.all([
      Item.find({ creator: userId, isDeleted: { $ne: true } }).select('_id').lean(),
      Skill.find({ creator: userId, isDeleted: { $ne: true } }).select('_id').lean()
    ]);

    const itemIds = itemDocs.map(d => d._id);
    const skillIds = skillDocs.map(d => d._id);

    await Promise.all([
      Item.updateMany(
        { creator: userId, isDeleted: { $ne: true } },
        { $set: { isDeleted: true, deletedAt: now, isAvailable: false } }
      ),
      Skill.updateMany(
        { creator: userId, isDeleted: { $ne: true } },
        { $set: { isDeleted: true, deletedAt: now, isAvailable: false, approvalStatus: 'rejected' } }
      ),
      Swap.updateMany(
        { isDeleted: { $ne: true }, $or: [{ requester: userId }, { receiver: userId }] },
        { $set: { isDeleted: true, cancelledAt: now, status: 'rejected' } }
      ),
      Deal.updateMany(
        { $or: [{ buyer: userId }, { seller: userId }], status: { $in: ['pending', 'confirmed', 'shipped'] } },
        { $set: { status: 'cancelled' } }
      ),
      itemIds.length > 0
        ? User.updateMany(
          { 'cart.item': { $in: itemIds } },
          { $pull: { cart: { item: { $in: itemIds } } } }
        )
        : Promise.resolve(),
      itemIds.length > 0
        ? Favorite.deleteMany({ target: { $in: itemIds }, targetModel: 'Item' })
        : Promise.resolve(),
      skillIds.length > 0
        ? Favorite.deleteMany({ target: { $in: skillIds }, targetModel: 'Skill' })
        : Promise.resolve(),
      Favorite.deleteMany({ user: userId })
    ]);

    await User.findByIdAndDelete(userId);
    await AdminLog.create({
      admin: req.session.userId,
      action: 'hard_delete',
      targetCollection: 'users',
      targetId: userId,
      metadata: {
        reason: 'admin_delete',
        itemsRemoved: itemIds.length,
        skillsRemoved: skillIds.length
      }
    });

    
    if (deletedUser) {
      email.sendAccountDeleted({
        to: deletedUser.email,
        username: deletedUser.username,
      }).catch(() => { });
    }

    res.redirect('/admin/users?action=deleted');
  } catch (err) {
    next(err);
  }
};

exports.adminDeleteItem = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      const err = new Error('Invalid item ID.');
      err.status = 400;
      return next(err);
    }
    const itemId = req.params.id;
    
    await Item.findByIdAndUpdate(itemId, { isDeleted: true, deletedAt: new Date(), isAvailable: false });
    
    await Promise.all([
      Favorite.deleteMany({ target: itemId, targetModel: 'Item' }),
      User.updateMany(
        { 'cart.item': itemId },
        { $pull: { cart: { item: itemId } } }
      )
    ]);
    await AdminLog.create({
      admin: req.session.userId,
      action: 'delete_item',
      targetCollection: 'items',
      targetId: itemId,
      metadata: {}
    });
    const referrer = req.get('Referrer') || '/admin/objects';
    res.redirect('/admin/objects?action=deleted');
  } catch (err) {
    next(err);
  }
};

exports.adminDeleteSkill = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      const err = new Error('Invalid skill ID.');
      err.status = 400;
      return next(err);
    }
    await Skill.findByIdAndUpdate(req.params.id, { isDeleted: true, deletedAt: new Date() });
    await AdminLog.create({
      admin: req.session.userId,
      action: 'delete_skill',
      targetCollection: 'skills',
      targetId: req.params.id,
      metadata: {}
    });
    res.redirect('/admin/skills?action=deleted');
  } catch (err) {
    next(err);
  }
};

exports.approveSkill = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      const err = new Error('Invalid skill ID.');
      err.status = 400;
      return next(err);
    }
    const skill = await Skill.findByIdAndUpdate(
      req.params.id,
      { approvalStatus: 'approved' },
      { returnDocument: 'after' }
    ).populate('creator', 'username email');

    await AdminLog.create({
      admin: req.session.userId,
      action: 'approve_skill',
      targetCollection: 'skills',
      targetId: req.params.id,
      metadata: { title: skill ? skill.title : '' }
    });

    if (skill && skill.creator && skill.creator.email) {
      const appUrl = process.env.APP_URL || 'http://localhost:3000';
      email.sendListingApproved({
        to: skill.creator.email,
        username: skill.creator.username,
        listingTitle: skill.title,
        listingType: 'skill',
        listingUrl: `${appUrl}/skill-details/${skill._id}`
      }).catch(() => { });
    }

    res.redirect('/admin/skills?action=approved');
  } catch (err) {
    next(err);
  }
};

exports.rejectSkill = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      const err = new Error('Invalid skill ID.');
      err.status = 400;
      return next(err);
    }
    const skill = await Skill.findByIdAndUpdate(
      req.params.id,
      { approvalStatus: 'rejected' },
      { returnDocument: 'after' }
    ).populate('creator', 'username email');

    await AdminLog.create({
      admin: req.session.userId,
      action: 'reject_skill',
      targetCollection: 'skills',
      targetId: req.params.id,
      metadata: { title: skill ? skill.title : '' }
    });

    if (skill && skill.creator && skill.creator.email) {
      email.sendListingRejected({
        to: skill.creator.email,
        username: skill.creator.username,
        listingTitle: skill.title,
        listingType: 'skill',
        reason: req.body.reason || ''
      }).catch(() => { });
    }

    res.redirect('/admin/skills?action=rejected');
  } catch (err) {
    next(err);
  }
};

exports.approveObject = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      const err = new Error('Invalid object ID.');
      err.status = 400;
      return next(err);
    }
    const item = await Item.findByIdAndUpdate(
      req.params.id,
      { approvalStatus: 'approved', isAvailable: true },
      { returnDocument: 'after' }
    ).populate('creator', 'username email');

    await AdminLog.create({
      admin: req.session.userId,
      action: 'approve_object',
      targetCollection: 'items',
      targetId: req.params.id,
      metadata: { title: item ? item.title : '' }
    });

    if (item && item.creator && item.creator.email) {
      const appUrl = process.env.APP_URL || 'http://localhost:3000';
      email.sendListingApproved({
        to: item.creator.email,
        username: item.creator.username,
        listingTitle: item.title,
        listingType: 'object',
        listingUrl: `${appUrl}/item-details/${item._id}`
      }).catch(() => { });
    }

    res.redirect('/admin/objects?action=approved');
  } catch (err) {
    next(err);
  }
};

exports.rejectObject = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      const err = new Error('Invalid object ID.');
      err.status = 400;
      return next(err);
    }
    const item = await Item.findByIdAndUpdate(
      req.params.id,
      { approvalStatus: 'rejected', isAvailable: false },
      { returnDocument: 'after' }
    ).populate('creator', 'username email');

    await AdminLog.create({
      admin: req.session.userId,
      action: 'reject_object',
      targetCollection: 'items',
      targetId: req.params.id,
      metadata: { title: item ? item.title : '' }
    });

    if (item && item.creator && item.creator.email) {
      email.sendListingRejected({
        to: item.creator.email,
        username: item.creator.username,
        listingTitle: item.title,
        listingType: 'object',
        reason: req.body.reason || ''
      }).catch(() => { });
    }

    res.redirect('/admin/objects?action=rejected');
  } catch (err) {
    next(err);
  }
};

exports.resolveReport = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      const err = new Error('Invalid report ID.');
      err.status = 400;
      return next(err);
    }
    const logAction = req.body.action === 'dismiss' ? 'dismiss_report' : 'resolve_report';
    const dbStatus = req.body.action === 'dismiss' ? 'dismissed' : 'resolved';
    await Report.findByIdAndUpdate(req.params.id, {
      status: dbStatus,
      resolvedBy: req.session.userId,
      resolvedAt: new Date(),
    });
    await AdminLog.create({
      admin: req.session.userId,
      action: logAction,
      targetCollection: 'reports',
      targetId: req.params.id,
      metadata: { previousStatus: 'open', resolution: dbStatus }
    });
    const actionKey = req.body.action === 'dismiss' ? 'dismissed' : 'resolved';
    res.redirect('/admin/reports?action=' + actionKey);
  } catch (err) {
    next(err);
  }
};

exports.adminHardDeleteItem = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      const err = new Error('Invalid item ID.');
      err.status = 400;
      return next(err);
    }
    await Item.findByIdAndDelete(req.params.id);
    await AdminLog.create({
      admin: req.session.userId,
      action: 'hard_delete',
      targetCollection: 'items',
      targetId: req.params.id,
      metadata: { reason: 'gdpr_erasure' }
    });
    const referrer = req.get('Referrer') || '/admin/objects';
    res.redirect(referrer);
  } catch (err) {
    next(err);
  }
};

exports.adminHardDeleteSkill = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      const err = new Error('Invalid skill ID.');
      err.status = 400;
      return next(err);
    }
    await Skill.findByIdAndDelete(req.params.id);
    await AdminLog.create({
      admin: req.session.userId,
      action: 'hard_delete',
      targetCollection: 'skills',
      targetId: req.params.id,
      metadata: { reason: 'gdpr_erasure' }
    });
    res.redirect('/admin/skills');
  } catch (err) {
    next(err);
  }
};

exports.adminHardDeleteSwap = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      const err = new Error('Invalid swap ID.');
      err.status = 400;
      return next(err);
    }
    await Swap.findByIdAndDelete(req.params.id);
    await AdminLog.create({
      admin: req.session.userId,
      action: 'delete_swap',
      targetCollection: 'swaps',
      targetId: req.params.id,
      metadata: { reason: 'admin_hard_delete' }
    });
    res.redirect('/admin/swaps');
  } catch (err) {
    next(err);
  }
};

exports.getContactMessages = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (!status || status === 'open') {
      filter.status = 'open';
    } else if (['in_progress', 'resolved'].includes(status)) {
      filter.status = status;
    }
    

    const messages = await ContactMessage.find(filter)
      .populate('handledBy', 'username')
      .sort({ createdAt: -1 })
      .limit(200);

    res.render('admin/admin-contact-messages', {
      messages,
      activeStatus: status || 'open'
    });
  } catch (err) {
    next(err);
  }
};

exports.claimContactMessage = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      const err = new Error('Invalid message ID.');
      err.status = 400;
      return next(err);
    }
    const msg = await ContactMessage.findByIdAndUpdate(
      req.params.id,
      { status: 'in_progress', handledBy: req.session.userId },
      { returnDocument: 'after' }
    );
    if (msg) {
      await AdminLog.create({
        admin: req.session.userId,
        action: 'assign_contact_message',
        targetCollection: 'contactmessages',
        targetId: msg._id,
        metadata: { topic: msg.topic, email: msg.email }
      });
    }
    res.redirect('/admin/contact-messages');
  } catch (err) {
    next(err);
  }
};

exports.resolveContactMessage = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) {
      const err = new Error('Invalid message ID.');
      err.status = 400;
      return next(err);
    }
    const msg = await ContactMessage.findByIdAndUpdate(
      req.params.id,
      { status: 'resolved', resolvedAt: new Date() },
      { returnDocument: 'after' }
    );
    if (msg) {
      await AdminLog.create({
        admin: req.session.userId,
        action: 'resolve_contact_message',
        targetCollection: 'contactmessages',
        targetId: msg._id,
        metadata: { topic: msg.topic, email: msg.email }
      });
    }
    res.redirect('/admin/contact-messages');
  } catch (err) {
    next(err);
  }
};

exports.getAdminLogs = async (req, res, next) => {
  try {
    const { admin, action, targetId, page } = req.query;
    const filter = {};
    if (admin && isValidId(admin)) filter.admin = admin;
    if (action) filter.action = action;
    if (targetId && isValidId(targetId)) filter.targetId = targetId;

    const PAGE_SIZE = 50;
    const currentPage = Math.max(1, parseInt(page) || 1);
    const skip = (currentPage - 1) * PAGE_SIZE;

    const [logs, total] = await Promise.all([
      AdminLog.find(filter)
        .populate('admin', 'username')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(PAGE_SIZE)
        .lean(),
      AdminLog.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / PAGE_SIZE);
    res.render('admin/admin-logs', { logs, currentPage, totalPages, filter: req.query });
  } catch (err) {
    next(err);
  }
};

exports.flagSwap = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ success: false, error: 'Invalid swap ID.' });
    await Swap.findByIdAndUpdate(req.params.id, { flagged: true });
    await AdminLog.create({
      admin: req.session.userId,
      action: 'flag_swap',
      targetCollection: 'swaps',
      targetId: req.params.id,
      metadata: {}
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

exports.adminCancelSwap = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ success: false, error: 'Invalid swap ID.' });
    const swap = await Swap.findOne({ _id: req.params.id, isDeleted: { $ne: true } });
    if (!swap) return res.status(404).json({ success: false, error: 'Swap not found.' });

    
    swap.status = 'rejected';
    swap.cancelledAt = new Date();
    await swap.save();

    
    const message = 'Swap Cancelled — This swap has been cancelled by an administrator.';
    const notifs = [];
    try {
      if (swap.requester) {
        const n = await Notification.create({ recipient: swap.requester, type: 'swap_cancelled', message, relatedSwap: swap._id });
        notifs.push(n);
        notifyUser(String(swap.requester), 'notification', {
          id: String(n._id), type: n.type, message: n.message, relatedSwap: String(swap._id), createdAt: n.createdAt
        });
      }
      if (swap.receiver) {
        const n2 = await Notification.create({ recipient: swap.receiver, type: 'swap_cancelled', message, relatedSwap: swap._id });
        notifs.push(n2);
        notifyUser(String(swap.receiver), 'notification', {
          id: String(n2._id), type: n2.type, message: n2.message, relatedSwap: String(swap._id), createdAt: n2.createdAt
        });
      }
    } catch (e) {
      
    }

    await AdminLog.create({ admin: req.session.userId, action: 'cancel_swap', targetCollection: 'swaps', targetId: swap._id, metadata: {} });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

exports.unflagSwap = async (req, res, next) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ success: false, error: 'Invalid swap ID.' });
    await Swap.findByIdAndUpdate(req.params.id, { flagged: false });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};
