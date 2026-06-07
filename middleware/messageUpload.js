
const multer = require('multer');
const path   = require('path');

const ALLOWED_MIME = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
]);

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: function (req, file, cb) {
    if (ALLOWED_MIME.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only images (JPEG, PNG, GIF, WEBP), PDF, DOC, DOCX, and TXT files are allowed.'));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024, files: 5 }
});

const _multerArray = upload.array('attachments', 5);

function messageUploadMiddleware(req, res, next) {
  _multerArray(req, res, function (err) {
    if (!err) return next();
    if (err.name === 'MulterError') {
      const msg =
        err.code === 'LIMIT_FILE_SIZE'  ? 'Each attachment must be 10 MB or less.'   :
        err.code === 'LIMIT_FILE_COUNT' ? 'Maximum 5 attachments per message.'        :
        err.message;
      return res.status(400).json({ success: false, error: msg });
    }
    res.status(400).json({ success: false, error: err.message || 'File upload failed.' });
  });
}

module.exports = messageUploadMiddleware;
