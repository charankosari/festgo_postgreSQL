const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin.controller");
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

// ✅ Delete vendor
router.delete(
  "/vendors/:id",
  isAuthorized,
  authorizedRoles("admin"),
  adminController.deleteVendor
);

module.exports = router;
