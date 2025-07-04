const express = require('express');
const uploadController = require('../controllers/uploadController');
const upload = require("../middlewares/multer");

const router = express.Router();
router.post("/public",upload.single("file"), uploadController.uploadPublic);
router.post("/private",upload.single("file"), uploadController.uploadPrivate);
router.get("/getpresignedurl",  uploadController.getPresignedUrl);
module.exports = router;