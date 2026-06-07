'use strict';
const mongoose = require('mongoose');

let bucket;

function getGridFSBucket() {
  if (bucket) return bucket;
  const db = mongoose.connection && mongoose.connection.db;
  if (!db) {
    throw new Error('MongoDB is not connected yet.');
  }
  bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'uploads' });
  return bucket;
}

function uploadBuffer({ buffer, filename, contentType, metadata }) {
  const grid = getGridFSBucket();
  return new Promise((resolve, reject) => {
    const uploadStream = grid.openUploadStream(filename, {
      contentType,
      metadata
    });

    uploadStream.on('finish', () => resolve({ _id: uploadStream.id }));
    uploadStream.on('error', reject);
    uploadStream.end(buffer);
  });
}

module.exports = {
  getGridFSBucket,
  uploadBuffer
};
