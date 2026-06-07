

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.get('/login', authController.getLogin);

router.get('/register', authController.getRegister);

router.get('/forgot-password', authController.getForgotPassword);

router.get('/logout', authController.getLogout);

router.post('/login', authController.postLogin);

router.post('/register', authController.postRegister);

router.post('/forgot-password', authController.postForgotPassword);

router.get('/reset-password/:token', authController.getResetPassword);

router.post('/reset-password/:token', authController.postResetPassword);

module.exports = router;
