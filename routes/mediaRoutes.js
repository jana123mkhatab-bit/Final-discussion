'use strict';
const express = require('express');
const router = express.Router();
const mediaController = require('../controllers/mediaController');

router.get('/:id', mediaController.getMedia);

module.exports = router;
