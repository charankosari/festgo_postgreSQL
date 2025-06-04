const multer = require("multer");

// Use memory storage since we'll upload directly to S3 without saving locally
const storage = multer.memoryStorage();

const upload = multer({ storage });

module.exports = upload;
