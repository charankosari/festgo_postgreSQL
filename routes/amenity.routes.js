const express = require("express");
const router = express.Router();
const amenityController = require("../controllers/amenity.controller");
const categoryController = require("../controllers/amenityCategory.controller");
const { isAuthorized, authorizedRoles } = require("../middlewares/auth");
router.post(
  "/",
  isAuthorized,
  authorizedRoles("admin"),
  amenityController.createAmenity
);
router.get("/", amenityController.getAllAmenities);
router.get("/allc", amenityController.getAllAmenitiesGroupedByCategory);
router.get("/a/:id", amenityController.getAmenityById);
router.put(
  "/a/:id",
  isAuthorized,
  authorizedRoles("admin"),
  amenityController.updateAmenity
);
router.delete(
  "/a/:id",
  isAuthorized,
  authorizedRoles("admin"),
  amenityController.deleteAmenity
);

// amenity categories
router.post(
  "/c",
  isAuthorized,
  authorizedRoles("admin"),
  categoryController.createCategory
);
router.get("/c", categoryController.getAllCategories);
router.get("/c/:id", categoryController.getCategoryById);
router.put(
  "/c/:id",
  isAuthorized,
  authorizedRoles("admin"),
  categoryController.updateCategory
);
router.delete(
  "/c/:id",
  isAuthorized,
  authorizedRoles("admin"),
  categoryController.deleteCategory
);

module.exports = router;
