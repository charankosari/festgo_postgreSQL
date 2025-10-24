const express = require("express");
const router = express.Router();
const trips_booking_controller = require("../controllers/trips_booking.controller");
// Middleware for authentication (if needed)
const { isAuthorized } = require("../middlewares/auth");

// 📦 Create a trip booking — protected route
router.post("/", isAuthorized, trips_booking_controller.createTripBooking);

module.exports = router;
