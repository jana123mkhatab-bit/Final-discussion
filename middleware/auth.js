

exports.isLoggedIn = (req, res, next) => {
  if (req.session && req.session.userId) {
    return next(); 
  }

  
  if (req.originalUrl.startsWith('/api/') || req.headers.accept === 'application/json') {
    return res.status(401).json({ success: false, error: 'Not authenticated.' });
  }

  
  req.session.returnTo = req.originalUrl;

  
  
  req.session.save((err) => {
    if (err) return next(err);
    res.redirect('/login');
  });
};

exports.isAdmin = (req, res, next) => {
  if (req.session && req.session.role === 'admin') {
    return next();
  }
  const err = new Error('Access denied. Admins only.');
  err.status = 403;
  next(err);
};

exports.isNotAdmin = (req, res, next) => {
  if (req.session && req.session.role === 'admin') {
    
    if (req.originalUrl.startsWith('/api/') || req.headers.accept === 'application/json') {
      return res.status(403).json({ success: false, error: 'Admins cannot perform this action.' });
    }
    
    const err = new Error('Admins cannot perform user-level actions.');
    err.status = 403;
    return next(err);
  }
  next();
};

exports.redirectIfLoggedIn = (req, res, next) => {
  if (req.session && req.session.userId) {
    return res.redirect('/');
  }
  next();
};