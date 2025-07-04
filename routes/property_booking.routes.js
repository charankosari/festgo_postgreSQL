const express = require("express");
const router = express.Router();
const propertyBookingController = require("../controllers/property_booking.controller");
// Middleware for authentication (if needed)
const { isAuthorized } = require("../middlewares/auth");

// 📦 Create a property booking — protected route
router.post("/", isAuthorized, propertyBookingController.bookProperty);
router.post(
  "/cancel/:id",
  isAuthorized,
  propertyBookingController.cancelBooking
);
// You can add more endpoints later — e.g. get bookings, cancel, etc.
router.get(
  "/my-bookings",
  isAuthorized,
  propertyBookingController.getMyBookings
);

module.exports = router;
