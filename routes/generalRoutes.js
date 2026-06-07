

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const infoController = require('../controllers/infoController');
const pointsController = require('../controllers/pointsController');
const { isLoggedIn, isNotAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.get('/profile', isLoggedIn, userController.getProfile);

router.get('/swap-requests', isLoggedIn, userController.getSwapRequests);

router.get('/users/:id', userController.getPublicProfile);

router.get('/api/me', isLoggedIn, userController.getCurrentUser);

router.post('/profile/avatar', isLoggedIn, upload.single('avatar'), userController.postUploadAvatar);

router.get('/settings', isLoggedIn, userController.getSettings);

router.post('/settings', isLoggedIn, userController.postSettings);

router.post('/settings/privacy', isLoggedIn, userController.postPrivacySettings);

router.get('/leaderboard', pointsController.getLeaderboard);

router.get('/about', infoController.getAbout);

router.get('/careers', infoController.getCareers);

router.get('/contact', infoController.getContact);
router.post('/contact', infoController.postContact);

router.get('/faq', infoController.getFaq);

router.get('/guidelines', infoController.getGuidelines);

router.get('/help-center', infoController.getHelpCenter);

router.get('/how-it-works', infoController.getHowItWorks);

router.get('/our-story', infoController.getOurStory);

router.get('/success-stories', infoController.getSuccessStories);

router.get('/sustainability', infoController.getSustainability);

router.get('/terms', infoController.getTerms);

router.get('/trust-safety', infoController.getTrustSafety);

router.post('/api/wallet/save-card', isLoggedIn, userController.postSaveCard);
router.get('/api/wallet/cards', isLoggedIn, userController.getWalletCards);
router.delete('/api/wallet/cards/:cardId', isLoggedIn, userController.deleteWalletCard);

module.exports = router;
