const express = require("express");
const router = express.Router();
const rateController = require("../controllers/room_rate_inventory.controller");
const { isAuthorized, authorizedRoles } = require("../middlewares/auth");

// 📌 Submit / Upsert room rates and inventory (bulk for date)
router.post(
  "/u",
  isAuthorized,
  authorizedRoles("admin", "vendor"),
  rateController.submitRoomRates
);

// 📌 Get prices/inventory for a room on a specific date
router.post(
  "/get-room-rate",
  isAuthorized,
  authorizedRoles("admin", "vendor"),
  rateController.getRoomRatesForDate
);

module.exports = router;
