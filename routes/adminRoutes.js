

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const pointsController = require('../controllers/pointsController');
const marketplaceController = require('../controllers/marketplaceController');
const { isAdmin } = require('../middleware/auth');

router.get('/', isAdmin, adminController.getDashboard);

router.get('/users', isAdmin, adminController.getUsers);

router.get('/skills', isAdmin, adminController.getSkills);

router.get('/objects', isAdmin, adminController.getObjects);

router.get('/deals', isAdmin, adminController.getDealsAdmin);

router.get('/swaps', isAdmin, adminController.getSwaps);

router.get('/reports', isAdmin, adminController.getReports);

router.get('/reports/:id/chat', isAdmin, adminController.getReportChat);

router.get('/points/:userId', isAdmin, pointsController.getAdminUserPoints);

router.post('/users/:id/ban', isAdmin, adminController.banUser);

router.post('/users/:id/unban', isAdmin, adminController.unbanUser);

router.post('/users/:id/delete', isAdmin, adminController.adminDeleteUser);

router.post('/items/:id/delete', isAdmin, adminController.adminDeleteItem);

router.post('/skills/:id/delete', isAdmin, adminController.adminDeleteSkill);

router.post('/skills/:id/approve', isAdmin, adminController.approveSkill);

router.post('/skills/:id/reject', isAdmin, adminController.rejectSkill);

router.post('/objects/:id/approve', isAdmin, adminController.approveObject);

router.post('/objects/:id/reject', isAdmin, adminController.rejectObject);

router.post('/reports/:id/resolve', isAdmin, adminController.resolveReport);

router.post('/items/:id/hard-delete', isAdmin, adminController.adminHardDeleteItem);

router.post('/skills/:id/hard-delete', isAdmin, adminController.adminHardDeleteSkill);

router.post('/swaps/:id/hard-delete', isAdmin, adminController.adminHardDeleteSwap);

router.post('/swaps/:id/cancel', isAdmin, adminController.adminCancelSwap);

router.post('/swaps/:id/flag', isAdmin, adminController.flagSwap);

router.post('/swaps/:id/unflag', isAdmin, adminController.unflagSwap);

router.get('/contact-messages', isAdmin, adminController.getContactMessages);
router.post('/contact-messages/:id/claim', isAdmin, adminController.claimContactMessage);
router.post('/contact-messages/:id/resolve', isAdmin, adminController.resolveContactMessage);

router.get('/logs', isAdmin, adminController.getAdminLogs);

router.post('/points/:userId/adjust', isAdmin, pointsController.postAdminAdjustPoints);

router.post('/deal/:id/refund', isAdmin, marketplaceController.adminRefundDeal);

module.exports = router;
