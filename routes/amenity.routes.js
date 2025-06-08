const express = require("express");
const router = express.Router();
const amenityController = require("../controllers/amenity.controller");
const { isAuthorized, authorizedRoles } = require("../middlewares/auth");
router.post(
  "/",
  isAuthorized,
  authorizedRoles("admin"),
  amenityController.createAmenity
);
router.get("/", amenityController.getAllAmenities);
router.get("/allc", amenityController.getAllAmenitiesGroupedByCategory);
router.get("/:id", amenityController.getAmenityById);
router.put(
  "/:id",
  isAuthorized,
  authorizedRoles("admin"),
  amenityController.updateAmenity
);
router.delete(
  "/:id",
  isAuthorized,
  authorizedRoles("admin"),
  amenityController.deleteAmenity
);

module.exports = router;
