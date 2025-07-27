const express = require("express");
const router = express.Router();
const beachfest_controller = require("../controllers/beachfests_booking.controller");
// Middleware for authentication (if needed)
const { isAuthorized } = require("../middlewares/auth");

// 📦 Create a property booking — protected route
router.post("/", isAuthorized, beachfest_controller.createBeachFestBooking);

module.exports = router;
