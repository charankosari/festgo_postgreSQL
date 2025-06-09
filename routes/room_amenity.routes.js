const express = require("express");
const router = express.Router();
const controller = require("../controllers/room_amenity.controller");
const { isAuthorized, authorizedRoles } = require("../middlewares/auth");
// Category Routes
router.post(
  "/c",
  isAuthorized,
  authorizedRoles("admin"),
  controller.createCategory
);
router.get("/c", controller.getAllCategories);
router.put(
  "/c/:id",
  isAuthorized,
  authorizedRoles("admin"),
  controller.updateCategory
);
router.delete(
  "/c/:id",
  isAuthorized,
  authorizedRoles("admin"),
  controller.deleteCategory
);

// Amenity Routes
router.post(
  "/",
  isAuthorized,
  authorizedRoles("admin"),
  controller.createAmenity
);
router.get("/a", controller.getAllAmenities);
router.put(
  "/a/:id",
  isAuthorized,
  authorizedRoles("admin"),
  controller.updateAmenity
);
router.delete(
  "/a/:id",
  isAuthorized,
  authorizedRoles("admin"),
  controller.deleteAmenity
);

// Grouped amenities
router.get("/allc", controller.getAmenitiesGroupedByCategory);

module.exports = router;
