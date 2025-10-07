const express = require("express");
const router = express.Router();
const homescreenBannerController = require("../controllers/homescreenbanner.controller");
const { isAuthorized, authorizedRoles } = require("../middlewares/auth");

// Upsert homescreen banner (create or update)
router.post(
  "/upsert",
  isAuthorized,
  authorizedRoles("admin"),
  homescreenBannerController.upsertHomeScreenBanner
);

// Get active homescreen banner (public route)
router.get("/", homescreenBannerController.getHomeScreenBanner);

// Delete homescreen banner (admin only)
router.delete(
  "/:id",
  isAuthorized,
  authorizedRoles("admin"),
  homescreenBannerController.deleteHomeScreenBanner
);

module.exports = router;
