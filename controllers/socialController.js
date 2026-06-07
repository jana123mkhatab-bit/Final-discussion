
const path         = require('path');
const fs           = require('fs');
const Item         = require('../models/Item');
const User         = require('../models/User');
const Swap         = require('../models/Swap');
const Message      = require('../models/Message');
const Notification = require('../models/Notification');
const Report       = require('../models/Report');
const Skill        = require('../models/Skill');
const { isValidId } = require('../utils/db');
const { notifyUser } = require('../utils/socket');
const email         = require('../utils/email');

function buildConversations(msgs, uid, userMap) {
  const seen = new Map();
  const uidStr = uid ? uid.toString() : '';

  for (const m of msgs) {
    const senderId = m.sender ? String(m.sender) : '';
    const receiverId = m.receiver ? String(m.receiver) : '';
    if (!senderId || !receiverId) continue;

    const partnerId = senderId === uidStr ? receiverId : senderId;
    if (!partnerId || seen.has(partnerId)) continue;

    const partner = userMap && userMap.get(partnerId);
    const partnerName = partner ? partner.username : 'Deleted user';
    const partnerImg = partner ? (partner.profileImage || '') : '';
    const partnerDeleted = !partner;
    const partnerOnline = partner ? !!partner.isOnline : false;

    seen.set(partnerId, {
      partnerId,
      partnerName,
      partnerImg,
      partnerDeleted,
      partnerOnline,
      lastText: m.text || (m.attachments && m.attachments.length > 0 ? '📎 Attachment' : ''),
      lastTime: m.createdAt
    });
  }

  return Array.from(seen.values());
}

exports.getEvents = async (req, res, next) => {
  try {
    const items = await Item.find({ isDeleted: { $ne: true }, category: 'skill', isAvailable: true })
      .populate('owner', 'username')
      .sort({ createdAt: -1 })
      .limit(10);
    res.render('social/events', { items });
  } catch (err) {
    next(err);
  }
};

exports.getForum = async (req, res, next) => {
  try {
    const users = await User.find()
      .select('username createdAt')
      .sort({ createdAt: -1 })
      .limit(10);
    res.render('social/forum', { users });
  } catch (err) {
    next(err);
  }
};

exports.getMessages = async (req, res, next) => {
  try {
    const uid = req.session.userId;
    const msgs = await Message.find({ $or: [{ sender: uid }, { receiver: uid }] })
      .sort({ createdAt: -1 })
      .lean();

    const userIds = new Set();
    msgs.forEach(m => {
      if (m.sender) userIds.add(String(m.sender));
      if (m.receiver) userIds.add(String(m.receiver));
    });

    const users = await User.find({ _id: { $in: Array.from(userIds) } })
      .select('username profileImage isOnline')
      .lean();
    const userMap = new Map(users.map(u => [String(u._id), u]));

    res.render('social/messages', {
      conversations: buildConversations(msgs, uid, userMap),
      currentUserId: uid
    });
  } catch (err) {
    next(err);
  }
};

exports.getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ recipient: req.session.userId })
      .populate('relatedSwap')
      .sort({ createdAt: -1 });
    res.render('social/notifications', { notifications });
  } catch (err) {
    next(err);
  }
};

exports.getNotificationsJSON = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
    const query = { recipient: req.session.userId };

    if (req.query.since) {
      const sinceRaw = Number(req.query.since) || req.query.since;
      const sinceDate = new Date(sinceRaw);
      if (!isNaN(sinceDate.getTime())) {
        query.createdAt = { $gt: sinceDate };
      }
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    res.json({ success: true, notifications });
  } catch (err) {
    next(err);
  }
};

exports.markNotificationRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ success: false, error: 'Invalid notification ID.' });
    }
    await Notification.findOneAndUpdate(
      { _id: id, recipient: req.session.userId },
      { $set: { isRead: true } }
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

exports.markAllNotificationsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { recipient: req.session.userId, isRead: false },
      { $set: { isRead: true } }
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

exports.sendMessage = async (req, res, next) => {
  try {
    const { receiverId, text } = req.body;
    const files       = req.files || [];
    const trimmedText = (text || '').trim();

    if (!receiverId || !isValidId(receiverId)) {
      return res.status(400).json({ success: false, error: 'Invalid receiver ID.' });
    }
    if (!trimmedText && files.length === 0) {
      return res.status(400).json({ success: false, error: 'Message must have text or at least one attachment.' });
    }
    if (trimmedText.length > 2000) {
      return res.status(400).json({ success: false, error: 'Message exceeds 2000 character limit.' });
    }
    if (receiverId === req.session.userId) {
      return res.status(400).json({ success: false, error: 'You cannot message yourself.' });
    }

    const [receiver, sender] = await Promise.all([
      User.findById(receiverId).select('_id'),
      User.findById(req.session.userId).select('username profileImage')
    ]);

    if (!receiver) {
      return res.status(410).json({ success: false, error: 'This account was deleted.', code: 'ACCOUNT_DELETED' });
    }

    const { uploadBuffer } = require('../utils/gridfs');
    const uploadPromises = files.map(async (f) => {
      const dbFile = await uploadBuffer({
        buffer: f.buffer,
        filename: f.originalname,
        contentType: f.mimetype,
        metadata: {
          userId: req.session.userId ? req.session.userId.toString() : null,
          originalName: f.originalname
        }
      });
      return {
        url:          '/media/' + dbFile._id.toString(),
        originalName: f.originalname,
        mimeType:     f.mimetype,
        size:         f.size
      };
    });

    const attachments = await Promise.all(uploadPromises);

    const saved = await Message.create({
      sender:      req.session.userId,
      receiver:    receiverId,
      text:        trimmedText,
      attachments
    });

    
    const notif = await Notification.create({
      recipient: receiverId,
      type:      'message',
      message:   `New message from ${sender.username}`
    });

    
    const msgPayload = {
      id:          saved._id,
      text:        saved.text,
      senderId:    String(req.session.userId),
      senderName:  sender.username,
      senderImg:   sender.profileImage || '',
      attachments: saved.attachments,
      createdAt:   saved.createdAt
    };

    notifyUser(receiverId, 'new_message', msgPayload);
    notifyUser(receiverId, 'notification', {
      id:        String(notif._id),
      type:      'message',
      message:   notif.message,
      createdAt: notif.createdAt
    });

    
    const receiverUser = await User.findById(receiverId).select('email username').lean();
    if (receiverUser) {
      email.sendNewMessageNotification({
        to:         receiverUser.email,
        username:   receiverUser.username,
        senderName: sender.username,
      }).catch(() => {});
    }

    res.json({
      success: true,
      message: {
        id:          saved._id,
        text:        saved.text,
        senderId:    saved.sender,
        attachments: saved.attachments,
        createdAt:   saved.createdAt
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.getConversation = async (req, res, next) => {
  try {
    const uid       = req.session.userId;
    const partnerId = req.params.partnerId;

    if (!isValidId(partnerId)) {
      return res.status(400).json({ success: false, error: 'Invalid partner ID.' });
    }

    await Message.updateMany(
      { sender: partnerId, receiver: uid, isRead: false },
      { $set: { isRead: true } }
    );

    const [messages, partner] = await Promise.all([
      Message.find({
        $or: [
          { sender: uid,       receiver: partnerId },
          { sender: partnerId, receiver: uid       }
        ]
      }).sort({ createdAt: 1 }),
      User.findById(partnerId).select('username profileImage isOnline')
    ]);

    const partnerDeleted = !partner;
    const partnerPayload = partnerDeleted
      ? { id: partnerId, name: 'Deleted user', img: '', deleted: true, isOnline: false }
      : { id: partner._id, name: partner.username, img: partner.profileImage || '', deleted: false, isOnline: !!partner.isOnline };

    res.json({
      success: true,
      partner: partnerPayload,
      partnerDeleted,
      messages: messages.map(m => ({
        id:          m._id,
        text:        m.text,
        senderId:    m.sender,
        isRead:      m.isRead,
        attachments: m.attachments || [],
        createdAt:   m.createdAt
      }))
    });
  } catch (err) {
    next(err);
  }
};

exports.createReport = async (req, res, next) => {
  try {
    const { reportedUserId, relatedListing, description, issueLabel, otherReason, chatLog: clientChatLog } = req.body;

    if (!reportedUserId || !isValidId(reportedUserId)) {
      return res.status(400).json({ success: false, error: 'Invalid reported user ID.' });
    }
    if (!description || description.trim().length < 20) {
      return res.status(400).json({ success: false, error: 'Description must be at least 20 characters.' });
    }

    
    const { incidentDate } = req.body;
    if (incidentDate) {
      const d = new Date(incidentDate);
      if (isNaN(d.getTime())) {
        return res.status(400).json({ success: false, error: 'Invalid incident date.' });
      }
      const today = new Date(); today.setHours(23, 59, 59, 999);
      if (d > today) {
        return res.status(400).json({ success: false, error: 'Incident date cannot be in the future.' });
      }
      const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      thirtyDaysAgo.setHours(0, 0, 0, 0);
      if (d < thirtyDaysAgo) {
        return res.status(400).json({ success: false, error: 'Incident date cannot be more than 30 days in the past.' });
      }
    }

    const reporter = req.session.userId;
    const reason = (issueLabel || 'Other') + (otherReason ? ': ' + otherReason : '');

    let reportedItem = null;
    let reportedSkill = null;
    if (relatedListing) {
      const [item, skill] = await Promise.all([
        Item.findOne({ isDeleted: { $ne: true }, title: { $regex: new RegExp('^' + relatedListing.trim() + '$', 'i') } }),
        Skill.findOne({ isDeleted: { $ne: true }, title: { $regex: new RegExp('^' + relatedListing.trim() + '$', 'i') } })
      ]);
      if (item) reportedItem = item._id;
      else if (skill) reportedSkill = skill._id;
    }

    const mongoose = require('mongoose');
    const r1 = new mongoose.Types.ObjectId(reporter);
    const r2 = new mongoose.Types.ObjectId(reportedUserId);

    let chatLog = [];
    if (clientChatLog && Array.isArray(clientChatLog) && clientChatLog.length > 0) {
      chatLog = clientChatLog
        .filter(m => m.text && m.sender && isValidId(m.sender))
        .map(m => ({
          author:    new mongoose.Types.ObjectId(m.sender),
          role:      'reporter',
          text:      String(m.text).slice(0, 1000),
          timestamp: m.createdAt ? new Date(m.createdAt) : new Date()
        }));
    } else {
      const dbMessages = await Message.find({
        $or: [
          { sender: r1, receiver: r2 },
          { sender: r2, receiver: r1 }
        ]
      })
      .populate('sender', 'username')
      .sort({ createdAt: 1 });

      chatLog = dbMessages
        .filter(m => m.sender)
        .map(m => ({
          author:    m.sender._id,
          role:      'reporter',
          text:      (m.text || (m.attachments && m.attachments.length > 0 ? '[Attachment]' : '')).slice(0, 1000),
          timestamp: m.createdAt
        }));
    }

    const report = await Report.create({
      reporter,
      reportedUser: reportedUserId,
      reportedItem,
      reportedSkill,
      reason: reason.trim(),
      details: description.trim(),
      chatLog
    });

    
    const reporterUser = await User.findById(reporter).select('email username').lean();
    if (reporterUser) {
      email.sendReportSubmitted({
        to:       reporterUser.email,
        username: reporterUser.username,
      }).catch(() => {});
    }

    res.json({ success: true, reportId: report._id });
  } catch (err) {
    next(err);
  }
};

exports.getMessageFile = async (req, res, next) => {
  try {
    const { filename } = req.params;
    if (!filename) {
      return res.status(400).end();
    }

    const mongoose = require('mongoose');
    const { getGridFSBucket } = require('../utils/gridfs');

    
    if (mongoose.Types.ObjectId.isValid(filename)) {
      const bucket = getGridFSBucket();
      const _id = new mongoose.Types.ObjectId(filename);
      const files = await bucket.find({ _id }).toArray();
      if (!files || files.length === 0) {
        return res.status(404).end();
      }

      const file = files[0];
      const originalName = file.metadata?.originalName || file.filename || 'attachment';
      if (file.contentType) {
        res.set('Content-Type', file.contentType);
      }
      res.set('Content-Length', file.length);
      res.set('Content-Disposition', `attachment; filename="${encodeURIComponent(originalName)}"; filename*=UTF-8''${encodeURIComponent(originalName)}`);

      const stream = bucket.openDownloadStream(_id);
      stream.on('error', next);
      return stream.pipe(res);
    }

    
    if (filename.includes('..') || /[/\\]/.test(filename)) {
      return res.status(400).end();
    }
    const uploadsDir = path.resolve(__dirname, '../public/uploads/messages');
    const filePath   = path.resolve(uploadsDir, filename);
    
    if (!filePath.startsWith(uploadsDir + path.sep)) {
      return res.status(403).end();
    }
    if (!fs.existsSync(filePath)) {
      return res.status(404).end();
    }
    res.setHeader('Content-Disposition', 'attachment');
    res.sendFile(filePath, function (err) {
      if (err && !res.headersSent) res.status(500).end();
    });
  } catch (err) {
    next(err);
  }
};
