const express = require("express");
const router = express.Router();
const beachFestController = require("../controllers/beachfest.controller");
const { isAuthorized, authorizedRoles } = require("../middlewares/auth");

// Create beach fest (admin and vendor)
router.post(
  "/",
  isAuthorized,
  authorizedRoles("admin", "vendor"),
  beachFestController.createBeachFest
);

// Update beach fest (admin and vendor)
router.put(
  "/:id",
  isAuthorized,
  authorizedRoles("admin", "vendor"),
  beachFestController.updateBeachFest
);

// Get all valid beach fests (public)
router.get("/", beachFestController.getAllBeachFests);
// Get all beach fests for admin
router.get(
  "/admin",
  isAuthorized,
  authorizedRoles("admin"),
  beachFestController.getAllBeachFestsForAdmin
);
// Get a beach fest by id (public)
router.get("/:id", beachFestController.getBeachFestById);
// Get beach fests by type (public)
router.post("/type", beachFestController.getBeachFestsByType);

// Delete beach fest (admin and vendor)
router.delete(
  "/:id",
  isAuthorized,
  authorizedRoles("admin", "vendor"),
  beachFestController.deleteBeachFest
);

// Get all beach fests for current vendor
router.get(
  "/merchant/myfests",
  isAuthorized,
  authorizedRoles("vendor"),
  beachFestController.getBeachFestsByMerchant
);

module.exports = router;
