const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin.controller");
const propertyController = require("../controllers/property.controller");
const beachfestController = require("../controllers/beachfest.controller");
const { isAuthorized, authorizedRoles } = require("../middlewares/auth");
// ✅ Get all vendors
router.get(
  "/vendors",
  isAuthorized,
  authorizedRoles("admin"),
  adminController.getAllVendors
);

// ✅ Get vendor by ID
router.get(
  "/vendors/:id",
  isAuthorized,
  authorizedRoles("admin"),
  adminController.getVendorById
);

// ✅ Authorize vendor
router.put(
  "/property/:id/authorize",
  isAuthorized,
  authorizedRoles("admin"),
  adminController.authorizeProperty
);
// ✅ De-authorize vendor
router.put(
  "/property/:id/deauthorize",
  isAuthorized,
  authorizedRoles("admin"),
  adminController.deauthorizeProperty
);
router.get(
  "/property/:vendorId/",
  isAuthorized,
  authorizedRoles("admin"),
  propertyController.getPropertiesByVendor
);

// ✅ Delete vendor
router.delete(
  "/vendors/:id",
  isAuthorized,
  authorizedRoles("admin"),
  adminController.deleteVendor
);

router.post(
  "/coin-setting",
  isAuthorized,
  authorizedRoles("admin"),
  adminController.createFestgoCoinSettings
);
router.get(
  "/coin-setting",
  isAuthorized,
  authorizedRoles("admin"),
  adminController.getAllCoinSettings
);

router.post(
  "/usage-limits",
  isAuthorized,
  authorizedRoles("admin"),
  adminController.upsertCoinUsageLimit
);
router.get(
  "/usage-limits",
  isAuthorized,
  authorizedRoles("admin"),
  adminController.getCoinUsageLimit
);
router.post(
  "/events/:eventId",
  isAuthorized,
  authorizedRoles("admin"),
  adminController.updateEventStatus
);
router.get(
  "/beach-fests",
  isAuthorized,
  authorizedRoles("admin"),
  beachfestController.getAllBeachFestsForAdmin
);
module.exports = router;
