const express = require("express");
const router = express.Router();
const cityFestsController = require("../controllers/city_fests.controller");
const { isAuthorized, authorizedRoles } = require("../middlewares/auth");
// 📌 City Fests CRUD
router.post(
  "/create",
  isAuthorized,
  authorizedRoles("admin"),
  cityFestsController.createCityFest
);
router.post("/categories/", cityFestsController.getCityFestCategories);
router.get("/", cityFestsController.getAllCityFests);
router.get("/:id", cityFestsController.getCityFestById);
router.post("/types", cityFestsController.getCityFestsByCategory);
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
  "/categories/create",
  isAuthorized,
  authorizedRoles("admin"),
  cityFestsController.createCityFestCategory
);

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
router.get(
  "/getall/cityfests",
  isAuthorized,
  cityFestsController.getAllCityFests
);

module.exports = router;
