const express = require("express");
const router = express.Router();
const cityfest_controller = require("../controllers/city_fest_booking.controller");
// Middleware for authentication (if needed)
const { isAuthorized } = require("../middlewares/auth");

// 📦 Create a property booking — protected route
router.post("/", isAuthorized, cityfest_controller.createCityFestBooking);

module.exports = router;
