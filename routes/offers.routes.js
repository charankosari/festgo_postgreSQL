const express = require("express");
const router = express.Router();
const offerController = require("../controllers/offers.controller");
const { isAuthorized, authorizedRoles } = require("../middlewares/auth");

router.post(
  "/create",
  isAuthorized,
  authorizedRoles("admin", "vendor"),
  offerController.createOffer
);
router.get(
  "/get",
  isAuthorized,
  authorizedRoles("admin", "vendor"),
  offerController.getAllOffers
);
router.get("/getoffers", isAuthorized, offerController.getOffersForUsers);
router.get(
  "/activate/:id",
  isAuthorized,
  authorizedRoles("admin"),
  offerController.activateOffer
);
router.get(
  "/deactivate/:id",
  isAuthorized,
  authorizedRoles("admin"),
  offerController.deactivateOffer
);

// Delete an offer: admins can delete any, vendors can delete their own
router.delete(
  "/delete/:id",
  isAuthorized,
  authorizedRoles("admin", "vendor"),
  offerController.deleteOffer
);

module.exports = router;
