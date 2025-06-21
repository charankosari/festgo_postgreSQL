const express = require("express");
const router = express.Router();
const beachFestController = require("../controllers/beachfest.controller");
const { isAuthorized, authorizedRoles } = require("../middlewares/auth");
router.post(
  "/",
  isAuthorized,
  authorizedRoles("admin"),
  beachFestController.createBeachFest
);
router.put(
  "/:id",
  isAuthorized,
  authorizedRoles("admin"),
  beachFestController.updateBeachFest
);
router.get("/", beachFestController.getAllBeachFests);
router.get("/:id", beachFestController.getBeachFestById);
router.delete(
  "/:id",
  isAuthorized,
  authorizedRoles("admin"),
  beachFestController.deleteBeachFest
);

module.exports = router;
