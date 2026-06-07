'use strict';
const Item = require('../models/Item');
const Skill = require('../models/Skill');
const Deal = require('../models/Deal');
const User = require('../models/User');
const Swap = require('../models/Swap');
const Notification = require('../models/Notification');
const Favorite = require('../models/Favorite');
const { isValidId, saveSession } = require('../utils/db');
const { storeUploads } = require('../utils/media');
const { notifyUser } = require('../utils/socket');
const { awardPoints } = require('./pointsController');
const email = require('../utils/email');

function validateItemFields(title, description, category, pointsValue) {
  if (!title || title.trim().length < 3) {
    return 'Title is required and must be at least 3 characters.';
  }
  if (!description || description.trim().length === 0) {
    return 'Description is required.';
  }
  if (!category || !['object', 'deal'].includes(category)) {
    return 'Category must be "object" or "deal".';
  }
  const pts = Number(pointsValue);
  if (isNaN(pts) || pts < 0 || pts > 10000) {
    return 'Points value must be a number between 0 and 10000.';
  }
  return null;
}

function validateSkillFields(title, description) {
  if (!title || title.trim().length < 3) {
    return 'Title is required and must be at least 3 characters.';
  }
  if (!description || description.trim().length === 0) {
    return 'Description is required.';
  }
  return null;
}

exports.getSkills = async (req, res, next) => {
  try {
    const userId = req.session && req.session.userId;

    const [items, userFavs, mySkillsArray] = await Promise.all([
      Skill.find({ isDeleted: { $ne: true }, isAvailable: true, approvalStatus: 'approved' })
        .populate('creator', 'username profileImage')
        .sort({ createdAt: -1 }),
      userId ? Favorite.find({ user: userId }).lean() : Promise.resolve([]),
      userId ? Skill.find({ isDeleted: { $ne: true }, creator: userId, isAvailable: true, approvalStatus: 'approved' }).select('_id title').lean() : Promise.resolve([])
    ]);

    const userFavorites = userFavs ? userFavs.map(f => f.target.toString()) : [];
    const mySkills = mySkillsArray || [];

    res.render('marketplace/skills', { items, mySkills, userFavorites });
  } catch (err) {
    next(err);
  }
};

exports.getObjects = async (req, res, next) => {
  try {
    const userId = req.session && req.session.userId;
    const limit = 9;
    const currentPage = Math.max(1, parseInt(req.query.page) || 1);
    const skip = (currentPage - 1) * limit;

    const [items, totalCount, userFavs, myItemsArray] = await Promise.all([
      Item.find({ isDeleted: { $ne: true }, category: 'object', isAvailable: true })
        .populate('creator', 'username profileImage')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Item.countDocuments({ isDeleted: { $ne: true }, category: 'object', isAvailable: true }),
      userId ? Favorite.find({ user: userId }).lean() : Promise.resolve([]),
      userId ? Item.find({ isDeleted: { $ne: true }, creator: userId, isAvailable: true }).select('_id title').lean() : Promise.resolve([])
    ]);

    const userFavorites = userFavs ? userFavs.map(f => f.target.toString()) : [];
    const totalPages = Math.ceil(totalCount / limit);
    const myItems = myItemsArray || [];
    res.render('marketplace/objects', { items, currentPage, totalPages, userFavorites, myItems });
  } catch (err) {
    next(err);
  }
};

const RECOMMENDED_IDS = [
  '6a16cc4986e9fb68a1eef397',
  '6a16cc4a86e9fb68a1eef398',
  '6a16cc4a86e9fb68a1eef399',
  '6a16cc4b86e9fb68a1eef39a',
  '6a16cc4b86e9fb68a1eef39b',
  '6a16cc4c86e9fb68a1eef39c',
];

exports.getRecommended = async (req, res, next) => {
  try {
    const items = await Item.find({ isDeleted: { $ne: true }, _id: { $in: RECOMMENDED_IDS } })
      .populate('creator', 'username profileImage')
      .lean();


    const ordered = RECOMMENDED_IDS
      .map(id => items.find(it => it._id.toString() === id))
      .filter(Boolean);

    const mapped = ordered.map(item => ({
      id: item._id,
      title: item.title,
      category: item.subCategory || 'Deal',
      owner: item.creator?.username || 'Seller',
      ownerImg: item.creator?.profileImage || '',
      distance: item.itemLocation || '',
      tags: item.tags || [],
      value: item.price ? `$${item.price}` : `${item.pointsValue} pts`,
      desc: item.description,
      image: item.images[0]
    }));

    res.json({ items: mapped });
  } catch (err) {
    next(err);
  }
};

exports.getCartRecommendations = async (req, res, next) => {
  try {

    const pipeline = [
      { $match: { isDeleted: { $ne: true }, category: 'deal', isAvailable: true } },
      { $sample: { size: 3 } },

      {
        $lookup: {
          from: 'users',
          localField: 'creator',
          foreignField: '_id',
          as: 'creator'
        }
      },
      { $unwind: { path: '$creator', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          title: 1,
          price: 1,
          originalPrice: 1,
          subCategory: 1,
          itemLocation: 1,
          tags: 1,
          description: 1,
          images: 1,
          'creator.username': 1,
          'creator.profileImage': 1
        }
      }
    ];

    const items = await Item.aggregate(pipeline).exec();

    const mapped = items.map(item => ({
      id: item._id || item._id,
      title: item.title,
      price: item.price,
      originalPrice: item.originalPrice,
      category: item.subCategory || 'Deal',
      owner: item.creator?.username || 'Seller',
      ownerImg: item.creator?.profileImage || '',
      distance: item.itemLocation || '',
      tags: item.tags || [],
      desc: item.description,
      image: (item.images && item.images.length) ? item.images[0] : ''
    }));

    res.json({ items: mapped });
  } catch (err) {
    next(err);
  }
};

exports.getDeals = async (req, res, next) => {
  try {
    const userId = req.session && req.session.userId;
    const [items, swaps, userFavs] = await Promise.all([
      Item.find({ isDeleted: { $ne: true }, category: 'deal', isAvailable: true })
        .populate('creator', 'username')
        .sort({ pointsValue: -1 })
        .limit(20),
      userId
        ? Swap.find({ isDeleted: { $ne: true }, $or: [{ requester: userId }, { receiver: userId }] })
          .populate('requester', 'username')
          .populate('receiver', 'username')
          .populate('offeredSkill', 'title')
          .populate('requestedSkill', 'title')
          .sort({ createdAt: -1 })
        : Promise.resolve([]),
      userId ? Favorite.find({ user: userId }).lean() : Promise.resolve([])
    ]);
    const userFavorites = userFavs ? userFavs.map(f => f.target.toString()) : [];
    res.render('marketplace/deals', { items, swaps, userFavorites });
  } catch (err) {
    next(err);
  }
};

exports.getAdd = (req, res) => {
  res.render('marketplace/add', { error: null, role: req.session.role || 'user' });
};

exports.postAdd = async (req, res, next) => {
  try {
    const {
      title, description, category, pointsValue,
      condition, itemLocation, price, originalPrice,
      level, wantsInExchange
    } = req.body;

    let imageFiles = [];
    let cvFiles = [];
    if (req.files) {
      if (Array.isArray(req.files)) {
        imageFiles = req.files;
      } else {
        if (req.files.images) imageFiles = req.files.images;
        if (req.files.cv) cvFiles = req.files.cv;
      }
    }

    const images = await storeUploads(imageFiles, req.session.userId);
    const cvUrls = await storeUploads(cvFiles, req.session.userId);
    const cvUrl = cvUrls.length > 0 ? cvUrls[0] : '';

    if (category === 'skill') {
      const validationError = validateSkillFields(title, description);
      if (validationError) {
        return res.status(400).render('marketplace/add', { error: validationError, role: req.session.role || 'user' });
      }
      if (images.length === 0 && process.env.NODE_ENV) {
        return res.status(400).render('marketplace/add', { error: 'At least one photo is required.', role: req.session.role || 'user' });
      }
      await Skill.create({
        title: title.trim(),
        description: description.trim(),
        creator: req.session.userId,
        images,
        level: level || '',
        itemLocation: (itemLocation || '').trim(),
        pointsValue: Number(pointsValue) || 0,
        wantsInExchange: (wantsInExchange || '').trim(),
        cvUrl,
        approvalStatus: 'pending',
        isAvailable: true,
      });
      return res.redirect('/skills');
    }

    const validationError = validateItemFields(title, description, category, pointsValue);
    if (validationError) {
      return res.status(400).render('marketplace/add', { error: validationError, role: req.session.role || 'user' });
    }
    if (images.length === 0 && process.env.NODE_ENV) {
      return res.status(400).render('marketplace/add', { error: 'At least one photo is required.', role: req.session.role || 'user' });
    }

    await Item.create({
      title: title.trim(),
      description: description.trim(),
      category,
      pointsValue: Number(pointsValue) || 0,
      creator: req.session.userId,
      images,
      condition: (condition || '').trim(),
      itemLocation: (itemLocation || '').trim(),
      price: price ? Number(price) : null,
      originalPrice: originalPrice ? Number(originalPrice) : null,
    });

    res.redirect(category === 'deal' ? '/deals' : '/objects');
  } catch (err) {
    next(err);
  }
};

exports.getFavorites = async (req, res, next) => {
  try {
    const favorites = await Favorite.find({ user: req.session.userId })
      .populate({
        path: 'target',
        populate: { path: 'creator', select: 'username' }
      })
      .sort({ createdAt: -1 });


    const activeFavorites = favorites
      .filter(f => f.target && !f.target.isDeleted)
      .map(f => {
        const target = f.target.toObject ? f.target.toObject() : f.target;
        return {
          _id: target._id,
          title: target.title,
          category: f.targetModel === 'Skill' ? 'skill' : target.category,
          condition: f.targetModel === 'Skill' ? target.level : target.condition,
          itemLocation: target.itemLocation,
          images: target.images,
          creator: target.creator
        };
      });

    res.render('marketplace/favorites', { favorites: activeFavorites });
  } catch (err) {
    next(err);
  }
};

exports.toggleFavorite = async (req, res, next) => {
  try {
    const { itemId } = req.body;

    if (!itemId || !isValidId(itemId)) {
      return res.status(400).json({ success: false, error: 'Invalid item ID.' });
    }


    let targetModel = null;
    const isItem = await Item.exists({ _id: itemId });
    if (isItem) {
      targetModel = 'Item';
    } else {
      const isSkill = await Skill.exists({ _id: itemId });
      if (isSkill) {
        targetModel = 'Skill';
      }
    }

    if (!targetModel) {
      return res.status(404).json({ success: false, error: 'Listing not found.' });
    }

    const userId = req.session.userId;
    const existing = await Favorite.findOne({ user: userId, target: itemId });

    let added = false;
    if (existing) {

      await Favorite.deleteOne({ _id: existing._id });
    } else {

      await Favorite.create({
        user: userId,
        target: itemId,
        targetModel
      });
      added = true;
    }

    const totalFavorites = await Favorite.countDocuments({ user: userId });
    res.json({ success: true, added, totalFavorites });
  } catch (err) {
    next(err);
  }
};

exports.getCart = async (req, res, next) => {
  try {
    const userId = req.session.userId;


    const user = await User.findById(userId)
      .populate({
        path: 'cart.item',
        match: { isDeleted: { $ne: true } },
        select: 'title price images category pointsValue condition isAvailable'
      })
      .lean();


    const dbCart = (user && user.cart ? user.cart : [])
      .filter(c => c.item && c.item.isAvailable !== false);


    const validItemIds = dbCart.map(c => c.item._id.toString());
    const allItemIds = (user && user.cart ? user.cart : []).map(c => c.item ? c.item._id.toString() : null).filter(Boolean);
    if (validItemIds.length !== allItemIds.length) {
      await User.updateOne(
        { _id: userId },
        { $pull: { cart: { item: { $nin: validItemIds } } } }
      );
    }


    req.session.cart = validItemIds;
    await saveSession(req);

    res.render('marketplace/cart', { cartItems: dbCart });
  } catch (err) {
    next(err);
  }
};

exports.getCartItems = async (req, res, next) => {
  try {
    const userId = req.session.userId;
    const user = await User.findById(userId)
      .populate({
        path: 'cart.item',
        match: { isDeleted: { $ne: true } },
        select: 'title price images category pointsValue condition isAvailable'
      })
      .lean();

    const dbCart = (user && user.cart ? user.cart : [])
      .filter(c => c.item && c.item.isAvailable !== false);

    const items = dbCart.map(c => ({
      id: c.item._id.toString(),
      name: c.item.title,
      price: c.item.price || 0,
      img: (c.item.images && c.item.images[0]) ? c.item.images[0] : '/img/placeholder.jpg',
      condition: c.item.condition || '',
      category: c.item.category || '',
      qty: c.qty || 1,
      addedAt: c.addedAt
    }));

    res.json({ success: true, items });
  } catch (err) {
    next(err);
  }
};

exports.getEarnPoints = (req, res) => {
  res.render('marketplace/earn-points');
};

exports.addToCart = async (req, res, next) => {
  try {
    const { itemId } = req.body;

    if (!itemId || !isValidId(itemId)) {
      return res.status(400).json({ success: false, error: 'Invalid item ID.' });
    }

    const item = await Item.findOne({ _id: itemId, isDeleted: { $ne: true } }).select('_id creator isAvailable');
    if (!item) {
      return res.status(404).json({ success: false, error: 'Item not found.' });
    }
    if (item.isAvailable === false) {
      return res.status(409).json({ success: false, error: 'This item is sold out.' });
    }
    if (String(item.creator) === String(req.session.userId)) {
      return res.status(403).json({ success: false, error: 'You cannot buy your own deal.' });
    }


    if (!req.session.cart) req.session.cart = [];
    if (!req.session.cart.includes(itemId)) req.session.cart.push(itemId);
    await saveSession(req);



    await User.updateOne(
      { _id: req.session.userId, 'cart.item': { $ne: item._id } },
      { $push: { cart: { item: item._id, qty: 1, addedAt: new Date() } } }
    );


    const dbUser = await User.findById(req.session.userId).select('cart').lean();
    const cartCount = dbUser ? dbUser.cart.length : req.session.cart.length;

    res.json({ success: true, cartCount });
  } catch (err) {
    next(err);
  }
};

exports.removeFromCart = async (req, res, next) => {
  try {
    const { itemId } = req.body;

    if (!itemId || !isValidId(itemId)) {
      return res.status(400).json({ success: false, error: 'Invalid item ID.' });
    }


    const before = (req.session.cart || []).length;
    req.session.cart = (req.session.cart || []).filter(id => id !== itemId);
    if (req.session.cart.length !== before) await saveSession(req);


    await User.updateOne(
      { _id: req.session.userId },
      { $pull: { cart: { item: itemId } } }
    );

    const dbUser = await User.findById(req.session.userId).select('cart').lean();
    const cartCount = dbUser ? dbUser.cart.length : req.session.cart.length;

    res.json({ success: true, cartCount });
  } catch (err) {
    next(err);
  }
};

exports.getItemDetails = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      const err = new Error('Invalid item ID.');
      err.status = 400;
      return next(err);
    }

    const [item, isFavorited] = await Promise.all([
      Item.findOne({ _id: id, isDeleted: { $ne: true } }).populate('creator', 'username email profileImage showLocation'),
      req.session.userId ? Favorite.exists({ user: req.session.userId, target: id }).then(x => !!x) : Promise.resolve(false)
    ]);

    if (!item) {
      const err = new Error('Item not found.');
      err.status = 404;
      return next(err);
    }

    res.render('marketplace/item-details', { item, isFavorited });
  } catch (err) {
    next(err);
  }
};

exports.getEditItem = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      const err = new Error('Invalid item ID.');
      err.status = 400;
      return next(err);
    }

    const item = await Item.findOne({ _id: id, isDeleted: { $ne: true } });
    if (!item) {
      const err = new Error('Item not found.');
      err.status = 404;
      return next(err);
    }

    if (item.creator.toString() !== req.session.userId) {
      const err = new Error('You are not authorised to edit this item.');
      err.status = 403;
      return next(err);
    }

    res.render('marketplace/edit-item', { item, error: null });
  } catch (err) {
    next(err);
  }
};

exports.postEditItem = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      const err = new Error('Invalid item ID.');
      err.status = 400;
      return next(err);
    }

    const item = await Item.findOne({ _id: id, isDeleted: { $ne: true } });
    if (!item) {
      const err = new Error('Item not found.');
      err.status = 404;
      return next(err);
    }

    if (item.creator.toString() !== req.session.userId) {
      const err = new Error('You are not authorised to edit this item.');
      err.status = 403;
      return next(err);
    }

    const {
      title, description, category, pointsValue,
      condition, itemLocation, price, originalPrice
    } = req.body;

    const validationError = validateItemFields(title, description, category, pointsValue);
    if (validationError) {
      return res.status(400).render('marketplace/edit-item', { item, error: validationError });
    }

    const newImages = await storeUploads(req.files, req.session.userId);
    const updatedImages = [...(item.images || []), ...newImages];

    await Item.findByIdAndUpdate(
      id,
      {
        title: title.trim(),
        description: description.trim(),
        category,
        pointsValue: Number(pointsValue),
        images: updatedImages,
        condition: (condition || '').trim(),
        itemLocation: (itemLocation || '').trim(),
        price: price ? Number(price) : null,
        originalPrice: originalPrice ? Number(originalPrice) : null,
      },
      { returnDocument: 'after', runValidators: true }
    );

    res.redirect(`/item-details/${id}`);
  } catch (err) {
    next(err);
  }
};

exports.deleteItem = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidId(id)) {
      const err = new Error('Invalid item ID.');
      err.status = 400;
      return next(err);
    }

    const item = await Item.findOne({ _id: id, isDeleted: { $ne: true } });
    if (!item) {
      const err = new Error('Item not found.');
      err.status = 404;
      return next(err);
    }

    if (item.creator.toString() !== req.session.userId) {
      const err = new Error('You are not authorised to delete this item.');
      err.status = 403;
      return next(err);
    }

    await Item.findByIdAndUpdate(id, { isDeleted: true, deletedAt: new Date() });
    res.redirect(item.category === 'deal' ? '/deals' : '/objects');
  } catch (err) {
    next(err);
  }
};

exports.deleteSkill = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      const err = new Error('Invalid skill ID.');
      err.status = 400;
      return next(err);
    }
    const skill = await Skill.findOne({ _id: id, isDeleted: { $ne: true } });
    if (!skill) {
      const err = new Error('Skill not found.');
      err.status = 404;
      return next(err);
    }
    if (skill.creator.toString() !== req.session.userId) {
      const err = new Error('You are not authorised to delete this skill.');
      err.status = 403;
      return next(err);
    }
    await Skill.findByIdAndUpdate(id, { isDeleted: true, deletedAt: new Date() });
    res.redirect('/profile');
  } catch (err) {
    next(err);
  }
};

exports.getPayment = async (req, res, next) => {
  try {
    const { id } = req.query;
    let item = null;
    if (id && isValidId(id)) {
      item = await Item.findOne({ _id: id, isDeleted: { $ne: true } })
        .select('title price condition images pointsValue creator isAvailable');
    }
    res.render('marketplace/payment', { item });
  } catch (err) {
    next(err);
  }
};

exports.postPayment = async (req, res, next) => {
  try {
    const { itemId, quantity, amount, paymentMethod, notes, shippingAddress } = req.body;
    const isFetch = req.get('X-Requested-With') === 'fetch';

    if (!shippingAddress || !shippingAddress.trim()) {
      if (isFetch) return res.status(400).json({ success: false, error: 'Shipping address is required.' });
      return res.redirect('/payment?error=missing_address');
    }

    if (!itemId || !isValidId(itemId)) {
      if (isFetch) return res.status(400).json({ success: false, error: 'Invalid item ID.' });
      return res.redirect('/payment?error=invalid_item');
    }

    const item = await Item.findOne({ _id: itemId, isDeleted: { $ne: true } })
      .select('_id title creator isAvailable');
    if (!item) {
      if (isFetch) return res.status(404).json({ success: false, error: 'Item not found.' });
      return res.redirect('/payment?error=item_not_found');
    }
    if (item.isAvailable === false) {
      if (isFetch) return res.status(409).json({ success: false, error: 'This item is sold out.' });
      return res.redirect('/payment?error=item_sold_out');
    }
    if (item.creator && String(item.creator) === String(req.session.userId)) {
      if (isFetch) return res.status(403).json({ success: false, error: 'You cannot buy your own deal.' });
      return res.redirect('/payment?error=own_deal');
    }

    const parsedQty = Math.max(1, parseInt(quantity) || 1);
    const parsedAmount = Math.max(0, parseFloat(amount) || 0);
    const method = ['card', 'points', 'cod'].includes(paymentMethod)
      ? paymentMethod : 'card';

    const deal = await Deal.create({
      buyer: req.session.userId,
      seller: item.creator,
      item: itemId,
      quantity: parsedQty,
      amount: parsedAmount,
      paymentMethod: method,
      status: 'confirmed',
      notes: (notes || '').trim(),
      shippingAddress: shippingAddress.trim(),
    });

    await awardPoints({
      userId: req.session.userId,
      delta: 5,
      reason: 'deal_purchase',
      relatedDealId: deal._id,
      note: `Purchased "${item.title}"`
    });


    if (item.creator && String(item.creator) !== String(req.session.userId)) {
      const notif = await Notification.create({
        recipient: item.creator,
        type: 'deal_confirmed',
        message: `Your item "${item.title}" was purchased!`,
        relatedDeal: deal._id
      });

      notifyUser(String(item.creator), 'notification', {
        id: String(notif._id),
        type: notif.type,
        message: notif.message,
        relatedDeal: String(deal._id),
        createdAt: notif.createdAt
      });
    }

    const cartBefore = (req.session.cart || []).length;
    req.session.cart = (req.session.cart || []).filter(id => id !== itemId);
    if (req.session.cart.length !== cartBefore) await saveSession(req);


    await User.updateOne(
      { _id: req.session.userId },
      { $pull: { cart: { item: itemId } } }
    );

    await Item.findByIdAndUpdate(itemId, { isAvailable: false });


    const buyer = await User.findById(req.session.userId).select('email username').lean();
    if (buyer) {
      email.sendOrderConfirmation({
        to: buyer.email,
        username: buyer.username,
        deal: {
          _id: deal._id,
          quantity: parsedQty,
          amount: parsedAmount,
          paymentMethod: method,
          shippingAddress: shippingAddress.trim(),
        },
        item: { title: item.title },
      }).catch(() => { });
    }

    if (isFetch) return res.json({ success: true, dealId: String(deal._id) });
    res.redirect('/deals?ordered=1');
  } catch (err) {
    next(err);
  }
};

exports.getSkillDetails = async (req, res, next) => {
  try {
    const id = req.query.id || req.params.id;

    if (!id || !isValidId(id)) {
      const err = new Error('Invalid skill ID.');
      err.status = 400;
      return next(err);
    }

    const item = await Skill.findOne({ _id: id, isDeleted: { $ne: true } }).populate('creator', 'username email profileImage showLocation');
    if (!item) {
      const err = new Error('Skill not found.');
      err.status = 404;
      return next(err);
    }

    res.render('marketplace/skill-details', { item });
  } catch (err) {
    next(err);
  }
};

exports.markDealShipped = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ success: false, error: 'Invalid deal ID.' });
    }
    const deal = await Deal.findOne({ _id: id, seller: req.session.userId, status: 'confirmed' });
    if (!deal) {
      return res.status(404).json({ success: false, error: 'Deal not found or already shipped.' });
    }
    deal.status = 'shipped';
    deal.shippedAt = new Date();
    await deal.save();
    res.json({ success: true, status: 'shipped', shippedAt: deal.shippedAt });
  } catch (err) {
    next(err);
  }
};

exports.markDealDelivered = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ success: false, error: 'Invalid deal ID.' });
    }
    const deal = await Deal.findOne({ _id: id, buyer: req.session.userId, status: 'shipped' });
    if (!deal) {
      return res.status(404).json({ success: false, error: 'Deal not found or not yet shipped.' });
    }
    deal.status = 'delivered';
    deal.deliveredAt = new Date();
    await deal.save();
    res.json({ success: true, status: 'delivered', deliveredAt: deal.deliveredAt });
  } catch (err) {
    next(err);
  }
};

exports.adminRefundDeal = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ success: false, error: 'Invalid deal ID.' });
    }
    const deal = await Deal.findOne({ _id: id, status: { $in: ['confirmed', 'shipped', 'delivered'] } });
    if (!deal) {
      return res.status(404).json({ success: false, error: 'Deal not found or already cancelled/refunded.' });
    }
    deal.status = 'refunded';
    deal.refundedAt = new Date();
    await deal.save();


    if (deal.item) {
      await Item.findByIdAndUpdate(deal.item, { isAvailable: true });
    }


    if (deal.paymentMethod === 'points') {
      await awardPoints({
        userId: deal.buyer,
        delta: deal.amount,
        reason: 'deal_refund',
        relatedDealId: deal._id,
        note: `Refund for deal ${deal._id}`
      });
    }

    res.json({ success: true, status: 'refunded', refundedAt: deal.refundedAt });
  } catch (err) {
    next(err);
  }
};
