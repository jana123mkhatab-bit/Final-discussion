
const crypto = require('crypto');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

function getEmail() {
  try { return require('../utils/email'); } catch (e) { return {}; }
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function wantsJSON(req) {
  const accept = req.headers.accept || '';
  return accept.includes('application/json');
}

function sendError(req, res, status, view, errorMsg, extraJSON) {
  if (wantsJSON(req)) {
    return res.status(status).json({ success: false, error: errorMsg, ...(extraJSON || {}) });
  }
  return res.status(status).render(view, { error: errorMsg });
}

function isStrongPassword(password) {
  if (!password || password.length < 10) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[a-z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  if (!/[^a-zA-Z0-9]/.test(password)) return false;
  return true;
}

function getPasswordErrors(password) {
  const missing = [];
  if (!password || password.length < 10) missing.push('Minimum 10 characters');
  if (!/[A-Z]/.test(password || '')) missing.push('At least one uppercase letter');
  if (!/[a-z]/.test(password || '')) missing.push('At least one lowercase letter');
  if (!/[0-9]/.test(password || '')) missing.push('At least one number');
  if (!/[^a-zA-Z0-9]/.test(password || '')) missing.push('At least one special character');
  return missing;
}

exports.getLogin = (req, res) => {
  if (req.session.userId) return res.redirect('/');
  res.render('auth/login', { error: null });
};

exports.getRegister = (req, res) => {
  if (req.session.userId) return res.redirect('/');
  res.render('auth/register', { error: null });
};

exports.getForgotPassword = (req, res) => {
  res.render('auth/forgot-password', { error: null, success: null });
};

exports.postRegister = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    
    if (!username || !email || !password) {
      return sendError(req, res, 400, 'auth/register', 'All fields are required.', { field: 'general' });
    }
    if (username.trim().length < 3) {
      return sendError(req, res, 400, 'auth/register', 'Username must be at least 3 characters.', { field: 'username' });
    }
    if (!isValidEmail(email)) {
      return sendError(req, res, 400, 'auth/register', 'Please enter a valid email address.', { field: 'email' });
    }

    
    if (!isStrongPassword(password)) {
      const missing = getPasswordErrors(password);
      const errorMsg = 'Password must include:\n• ' + missing.join('\n• ');
      return sendError(req, res, 400, 'auth/register', errorMsg, { field: 'password', missing: missing });
    }

    
    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      return sendError(req, res, 400, 'auth/register', 'This email is already registered.', { field: 'email' });
    }

    
    const BannedEmail = require('../models/BannedEmail');
    const bannedRecord = await BannedEmail.findOne({ email: email.toLowerCase().trim() });
    if (bannedRecord) {
      return sendError(req, res, 403, 'auth/register',
        'This email address is not eligible for registration.',
        { field: 'email' });
    }

    const existingUsername = await User.findOne({ username: username.trim() });
    if (existingUsername) {
      return sendError(req, res, 400, 'auth/register', 'That username is already taken.', { field: 'username' });
    }

    
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      username: username.trim(),
      email: email.toLowerCase(),
      password: hashedPassword
    });

    
    
    req.session.regenerate((regenErr) => {
      if (regenErr) return next(regenErr);

      req.session.userId = newUser._id.toString();
      req.session.role = newUser.role || 'user';

      req.session.save((saveErr) => {
        if (saveErr) return next(saveErr);

        
        const emailSvc = getEmail();
        if (typeof emailSvc.sendWelcome === 'function') {
          emailSvc.sendWelcome({ to: newUser.email, username: newUser.username }).catch(() => {});
        }

        if (wantsJSON(req)) {
          return res.json({
            success: true,
            redirect: '/',
            user: {
              id: newUser._id.toString(),
              email: newUser.email,
              name: newUser.username,
              role: newUser.role || 'user'
            }
          });
        }
        res.redirect('/'); 
      });
    });

  } catch (err) {
    next(err);
  }
};

exports.postLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    

    
    if (!email || !password) {
      return sendError(req, res, 400, 'auth/login', 'Email and password are required.');
    }
    if (!isValidEmail(email)) {
      return sendError(req, res, 400, 'auth/login', 'Please enter a valid email address.');
    }

    
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      
      return sendError(req, res, 401, 'auth/login', 'Email not found.', { field: 'email' });
    }

    
    if (user.isBanned) {
      return sendError(req, res, 403, 'auth/login', 'This account has been suspended. Contact support.', { emailExists: true });
    }

    
    const match = await bcrypt.compare(password, user.password);
    
    if (!match) {
      
      return sendError(req, res, 401, 'auth/login', 'Incorrect password.', { field: 'password' });
    }

    
    
    
    
    
    
    
    const returnTo = req.session.returnTo || '/';

    req.session.regenerate((regenErr) => {
      if (regenErr) return next(regenErr);

      req.session.userId = user._id.toString();
      req.session.role = user.role;

      req.session.save((saveErr) => {
        if (saveErr) return next(saveErr);

        
        const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Unknown';
        const loginTime = new Date().toLocaleString();
        const emailSvc = getEmail();
        if (typeof emailSvc.sendLoginAlert === 'function') {
          emailSvc.sendLoginAlert({ to: user.email, username: user.username, ip: clientIp, time: loginTime }).catch(() => {});
        }

        if (wantsJSON(req)) {
          return res.json({
            success: true,
            redirect: returnTo,
            user: {
              id: user._id.toString(),
              email: user.email,
              name: user.username,
              role: user.role || 'user'
            }
          });
        }
        res.redirect(returnTo);    
      });
    });

  } catch (err) {
    next(err);
  }
};

exports.getLogout = (req, res, next) => {
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie('connect.sid');
    res.redirect('/login?action=loggedout');
  });
};

exports.postForgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ success: false, error: 'Please enter a valid email address.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    
    if (!user) {
      return res.json({ success: true });
    }

    
    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000); 

    
    await User.findByIdAndUpdate(user._id, {
      resetToken: token,
      resetTokenExpiry: expiry
    });

    
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const resetUrl = `${appUrl}/reset-password/${token}`;

    
    const emailSvc = getEmail();
    if (typeof emailSvc.sendPasswordReset === 'function') {
      emailSvc.sendPasswordReset({
        to: user.email,
        username: user.username,
        resetUrl
      }).catch(() => {});
    }

    return res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

exports.getResetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    if (!token) {
      return res.render('auth/reset-password', { error: 'Invalid or missing reset link.', token: null, valid: false });
    }

    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: new Date() }
    });

    if (!user) {
      return res.render('auth/reset-password', {
        error: 'This reset link is invalid or has expired. Please request a new one.',
        token: null,
        valid: false
      });
    }

    res.render('auth/reset-password', { error: null, token, valid: true });
  } catch (err) {
    next(err);
  }
};

exports.postResetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    if (!token) {
      return res.status(400).render('auth/reset-password', { error: 'Invalid reset link.', token: null, valid: false });
    }

    
    if (!password || !confirmPassword) {
      return res.status(400).render('auth/reset-password', { error: 'Both password fields are required.', token, valid: true });
    }
    if (password !== confirmPassword) {
      return res.status(400).render('auth/reset-password', { error: 'Passwords do not match.', token, valid: true });
    }
    if (!isStrongPassword(password)) {
      const missing = getPasswordErrors(password);
      return res.status(400).render('auth/reset-password', {
        error: 'Password must include: ' + missing.join(', '),
        token,
        valid: true
      });
    }

    
    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).render('auth/reset-password', {
        error: 'This reset link is invalid or has expired. Please request a new one.',
        token: null,
        valid: false
      });
    }

    
    const hashedPassword = await bcrypt.hash(password, 10);
    await User.findByIdAndUpdate(user._id, {
      password: hashedPassword,
      resetToken: null,
      resetTokenExpiry: null
    });

    
    res.redirect('/login?action=passwordreset');
  } catch (err) {
    next(err);
  }
};