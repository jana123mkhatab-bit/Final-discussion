'use strict';
const express = require('express');
const router = express.Router();
const ratingsController = require('../controllers/ratingsController');
const { isLoggedIn } = require('../middleware/auth');

router.get('/api/ratings/:targetId', ratingsController.getSummary);
router.post('/api/ratings', isLoggedIn, ratingsController.upsert);

module.exports = router;
