'use strict';
const path = require('path');
const { uploadBuffer } = require('./gridfs');

function buildFilename(originalName, userId) {
  const ext = path.extname(originalName || '').toLowerCase();
  const safeUser = userId ? userId.toString() : 'anon';
  return `${safeUser}-${Date.now()}${ext}`;
}

async function storeUploads(files, userId) {
  if (!files || files.length === 0) return [];

  const uploads = files.map((file) => uploadBuffer({
    buffer: file.buffer,
    filename: buildFilename(file.originalname, userId),
    contentType: file.mimetype,
    metadata: {
      userId: userId ? userId.toString() : null,
      originalName: file.originalname
    }
  }));

  const results = await Promise.all(uploads);
  return results.map((file) => `/media/${file._id.toString()}`);
}

async function storeUpload(file, userId) {
  const [url] = await storeUploads(file ? [file] : [], userId);
  return url || '';
}

module.exports = {
  storeUploads,
  storeUpload
};
