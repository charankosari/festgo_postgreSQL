const express = require("express");
const router = express.Router();
const hotelController = require("../controllers/hotel.controller");
const { isAuthorized, authorizedRoles } = require("../middlewares/auth");

// ✅ Property Payment Routes (for vendors/hotels)
router.get(
  "/payments/unpaid",
  isAuthorized,
  authorizedRoles("vendor"),
  hotelController.getUnpaidHotelPayments
);

router.get(
  "/payments/paid",
  isAuthorized,
  authorizedRoles("vendor"),
  hotelController.getPaidHotelPayments
);

router.get(
  "/payments/summary",
  isAuthorized,
  authorizedRoles("vendor"),
  hotelController.getHotelPaymentSummary
);

module.exports = router;
