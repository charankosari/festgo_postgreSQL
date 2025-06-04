const express = require('express');
const { isAuthorized, roleAuthorize } = require('../middlewares/auth');
const uploadController = require('../controllers/uploadController');
const upload = require("../middlewares/multer");

const router = express.Router();
router.post("/public", isAuthorized,upload.single("file"), uploadController.uploadPublic);
router.post("/private", isAuthorized, roleAuthorize("merchant"),upload.single("file"), uploadController.uploadPrivate);
router.get("/getpresignedurl", isAuthorized, roleAuthorize("merchant"), uploadController.getPresignedUrl);
module.exports = router;