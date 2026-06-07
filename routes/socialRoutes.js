

const express          = require('express');
const router           = express.Router();
const socialController = require('../controllers/socialController');
const swapController   = require('../controllers/swapController');
const { isLoggedIn }   = require('../middleware/auth');
const messageUpload    = require('../middleware/messageUpload');

router.get('/events',        socialController.getEvents);
router.get('/forum',         socialController.getForum);
router.get('/notifications', isLoggedIn, socialController.getNotifications);

router.get('/messages', isLoggedIn, socialController.getMessages);

router.post('/api/messages/send', isLoggedIn, messageUpload, socialController.sendMessage);

router.get('/api/messages/file/:filename', isLoggedIn, socialController.getMessageFile);
router.get('/api/messages/:partnerId',    isLoggedIn, socialController.getConversation);

router.post('/swap/request',    isLoggedIn, swapController.postRequestSwap);
router.post('/swap/:id/accept', isLoggedIn, swapController.acceptSwap);
router.post('/swap/:id/reject', isLoggedIn, swapController.rejectSwap);
router.post('/swap/:id/cancel', isLoggedIn, swapController.cancelSwap);

router.get('/api/notifications',       isLoggedIn, socialController.getNotificationsJSON);
router.get('/api/notifications/count', isLoggedIn, swapController.getNotificationCount);

router.post('/api/notifications/read-all', isLoggedIn, socialController.markAllNotificationsRead);
router.post('/api/notifications/:id/read', isLoggedIn, socialController.markNotificationRead);

router.post('/api/reports', isLoggedIn, socialController.createReport);

module.exports = router;
