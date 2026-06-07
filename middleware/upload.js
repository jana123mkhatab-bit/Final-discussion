
const multer = require('multer');
const path   = require('path');

const storage = multer.memoryStorage();
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_DOC_BYTES = 10 * 1024 * 1024;

const imageOnlyFilter = function (req, file, cb) {
  const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPG, PNG, and WEBP images are allowed.'));
  }
};

const listingFilter = function (req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (file.fieldname === 'images') {
    const allowedImages = ['.jpg', '.jpeg', '.png', '.webp'];
    if (allowedImages.includes(ext)) return cb(null, true);
    return cb(new Error('Only JPG, PNG, and WEBP images are allowed.'));
  }
  if (file.fieldname === 'cv') {
    const allowedDocs = ['.pdf', '.doc', '.docx'];
    if (allowedDocs.includes(ext)) return cb(null, true);
    return cb(new Error('Only PDF and Word documents are allowed.'));
  }
  return cb(new Error('Unsupported file upload field.'));
};

const upload = multer({
  storage,
  fileFilter: imageOnlyFilter,
  limits: { fileSize: MAX_IMAGE_BYTES }
});

const listingUpload = multer({
  storage,
  fileFilter: listingFilter,
  limits: { fileSize: MAX_DOC_BYTES }
});

upload.listing = listingUpload;
module.exports = upload;
