const express = require("express");
const router = express.Router();
const cityFestsController = require("../controllers/city_fests.controller");
const { isAuthorized, authorizedRoles } = require("../middlewares/auth");
// 📌 City Fests CRUD
router.post(
  "/",
  isAuthorized,
  authorizedRoles("admin"),
  cityFestsController.createCityFest
);
router.get("/", cityFestsController.getAllCityFests);
router.get("/:id", cityFestsController.getCityFestById);
router.put(
  "/:id",
  isAuthorized,
  authorizedRoles("admin"),
  cityFestsController.updateCityFest
);
router.delete(
  "/:id",
  isAuthorized,
  authorizedRoles("admin"),
  cityFestsController.deleteCityFest
);

// 📌 City Fest Categories CRUD
router.post(
  "/categories",
  isAuthorized,
  authorizedRoles("admin"),
  cityFestsController.createCityFestCategory
);
router.get("/categories", cityFestsController.getCityFestCategories);
router.put(
  "/categories/:id",
  isAuthorized,
  authorizedRoles("admin"),
  cityFestsController.updateCityFestCategory
);
router.delete(
  "/categories/:id",
  isAuthorized,
  authorizedRoles("admin"),
  cityFestsController.deleteCityFestCategory
);

module.exports = router;
