

const express               = require('express');
const router                = express.Router();
const marketplaceController = require('../controllers/marketplaceController');
const { isLoggedIn, isNotAdmin } = require('../middleware/auth');
const upload                = require('../middleware/upload');

router.get('/api/recommended',  marketplaceController.getRecommended);
router.get('/api/recommendations/cart', marketplaceController.getCartRecommendations);

router.get('/skills',           marketplaceController.getSkills);
router.get('/objects',          marketplaceController.getObjects);
router.get('/deals',            marketplaceController.getDeals);
router.get('/earn-points',      marketplaceController.getEarnPoints);
router.get('/item-details/:id', marketplaceController.getItemDetails);
router.get('/skill-details',    marketplaceController.getSkillDetails);

router.get('/favorites', isLoggedIn, marketplaceController.getFavorites);

router.post('/api/favorites/toggle', isLoggedIn, marketplaceController.toggleFavorite);

router.get('/api/cart', isLoggedIn, marketplaceController.getCartItems);

router.get('/cart', isLoggedIn, marketplaceController.getCart);

router.post('/api/cart/add', isLoggedIn, marketplaceController.addToCart);

router.post('/api/cart/remove', isLoggedIn, marketplaceController.removeFromCart);

router.get('/payment',  marketplaceController.getPayment);
router.post('/payment', isLoggedIn, marketplaceController.postPayment);

router.get('/add',  isLoggedIn, isNotAdmin, marketplaceController.getAdd);
router.post('/add', isLoggedIn, isNotAdmin, upload.listing.fields([{ name: 'images', maxCount: 5 }, { name: 'cv', maxCount: 1 }]), marketplaceController.postAdd);

router.get('/item/:id/edit',  isLoggedIn, isNotAdmin, marketplaceController.getEditItem);
router.post('/item/:id/edit', isLoggedIn, isNotAdmin, upload.array('images', 5), marketplaceController.postEditItem);

router.post('/item/:id/delete',  isLoggedIn, marketplaceController.deleteItem);
router.post('/skill/:id/delete', isLoggedIn, marketplaceController.deleteSkill);

router.post('/deal/:id/ship',    isLoggedIn, marketplaceController.markDealShipped);
router.post('/deal/:id/deliver', isLoggedIn, marketplaceController.markDealDelivered);

module.exports = router;
