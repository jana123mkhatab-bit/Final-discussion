'use strict';
const mongoose = require('mongoose');
const { getGridFSBucket } = require('../utils/gridfs');

exports.getMedia = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).send('Invalid media id.');
    }

    const bucket = getGridFSBucket();
    const _id = new mongoose.Types.ObjectId(id);
    const files = await bucket.find({ _id }).toArray();

    if (!files || files.length === 0) {
      return res.status(404).send('File not found.');
    }

    const file = files[0];
    const filename = file.metadata?.originalName || file.filename || 'document';

    if (file.contentType) {
      res.set('Content-Type', file.contentType);
    }
    res.set('Content-Length', file.length);
    res.set('Content-Disposition', `inline; filename="${encodeURIComponent(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`);

    const stream = bucket.openDownloadStream(_id);
    stream.on('error', next);
    stream.pipe(res);
  } catch (err) {
    next(err);
  }
};
