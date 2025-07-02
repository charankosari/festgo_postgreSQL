const express = require("express");
const router = express.Router();
const contactMessageController = require("../controllers/contactMessage.controller");

router.post("/c", contactMessageController.createMessage);
router.get("/g", contactMessageController.getAllMessages);

module.exports = router;
