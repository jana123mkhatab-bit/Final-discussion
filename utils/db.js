const mongoose = require('mongoose');

exports.isValidId = id => mongoose.Types.ObjectId.isValid(id);

exports.saveSession = req =>
  new Promise((resolve, reject) =>
    req.session.save(err => (err ? reject(err) : resolve()))
  );
