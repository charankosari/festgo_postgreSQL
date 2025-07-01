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
router.post(
  "/:id",
  isAuthorized,
  authorizedRoles("vendor"),
  propertyController.updateProperty
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
router.post("/p/active-r", propertyController.getAllActivePropertiesByRange);
router.post("/p/details", propertyController.getAmenitiesForProperty);

// ✅ Get property by ID
router.get("/p/:id", propertyController.getPropertyById);

// ✅ Get properties by vendor
router.get(
  "/vendor/:vendorId",
  isAuthorized,
  authorizedRoles("vendor"),
  propertyController.getPropertiesByVendor
);
router.get(
  "/vendor/r/:vendorId",
  isAuthorized,
  authorizedRoles("vendor"),
  propertyController.getRoomsByVendor
);
router.get(
  "/r/:propertyId",
  isAuthorized,
  authorizedRoles("vendor"),
  propertyController.getRoomsByPropertyId
);
router.post(
  "/r",
  isAuthorized,
  authorizedRoles("vendor"),
  propertyController.createRoom
);
router.put(
  "/r/:id",
  isAuthorized,
  authorizedRoles("vendor"),
  propertyController.editRoom
);
router.delete(
  "/r/:id",
  isAuthorized,
  authorizedRoles("vendor"),
  propertyController.deleteRoom
);
router.post(
  "/p/property-details",
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
