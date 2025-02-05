const multer = require('multer');
const uuid = require('uuid/v1');
const path = require('path');

const MIME_TYPE_MAP = {
  'image/png': 'png',
  'image/jpeg': 'jpeg',
  'image/jpg': 'jpg',
  'image/gif': 'gif',
  'application/zip': 'zip',
  'application/x-rar-compressed': 'rar', 
};

// File size limit (5MB max)
const MAX_FILE_SIZE = 5000000;

const fileUpload = multer({
  limits: { fileSize: MAX_FILE_SIZE },
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/attachments'); 
    },
    filename: (req, file, cb) => {
      const ext = MIME_TYPE_MAP[file.mimetype] || path.extname(file.originalname).toLowerCase().slice(1);
      if (!ext) {
        return cb(new Error('Invalid file type'), false);
      }
      cb(null, uuid() + '.' + ext); 
    },
  }),
  fileFilter: (req, file, cb) => {
    // Manually check the file extension if mime type is not available
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    // Allow .rar files explicitly
    if (fileExtension === '.rar') {
      return cb(null, true);
    }

    // Check for valid file extensions
    const ext = MIME_TYPE_MAP[file.mimetype];
    if (!ext && !['.jpeg', '.jpg', '.png', '.gif', '.zip'].includes(fileExtension)) {
      return cb(new Error('File type not allowed'), false);
    }

    // If mime type is valid and extension matches
    if (ext) {
      return cb(null, true);
    }

    return cb(new Error('Invalid mime type'), false);
  },
});

module.exports = fileUpload;
