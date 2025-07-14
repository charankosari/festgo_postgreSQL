const express = require("express");
const router = express.Router();
const rateController = require("../controllers/room_rate_inventory.controller");
const { isAuthorized } = require("../middlewares/auth");

// 📌 Submit / Upsert room rates and inventory (bulk for date)
router.post("/update-rates", isAuthorized, rateController.submitRoomRates);

module.exports = router;
