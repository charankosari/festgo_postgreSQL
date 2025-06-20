const express = require("express");
const router = express.Router();
const propertyController = require("../controllers/property.controller");
const { isAuthorized, authorizedRoles } = require("../middlewares/auth");
// ✅ Create property
router.post(
  "/",
  isAuthorized,
  authorizedRoles("vendor"),
  propertyController.createProperty
);

// ✅ Update property by ID
router.put(
  "/:id",
  isAuthorized,
  authorizedRoles("vendor"),
  propertyController.updateProperty
);

// ✅ Get all properties
router.get("/", propertyController.getAllProperties);
router.get("/active", propertyController.getAllActiveProperties);
router.post("/active-r", propertyController.getAllActivePropertiesByRange);
router.post("/details", propertyController.getAmenitiesForProperty);

// ✅ Get property by ID
router.get("/:id", propertyController.getPropertyById);

// ✅ Get properties by vendor
router.get(
  "/vendor/:vendorId",
  isAuthorized,
  authorizedRoles("vendor"),
  propertyController.getPropertiesByVendor
);
router.post(
  "/property-details",
  propertyController.getSelectedPropertyDetailed
);

// ✅ Delete property by ID
router.delete(
  "/:id",
  isAuthorized,
  authorizedRoles("admin", "vendor"),
  propertyController.deleteProperty
);

module.exports = router;
