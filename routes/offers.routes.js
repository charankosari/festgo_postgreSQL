const express = require("express");
const router = express.Router();
const offerController = require("../controllers/offers.controller");
const { isAuthorized, authorizedRoles } = require("../middlewares/auth");

router.post(
  "/create",
  isAuthorized,
  authorizedRoles("admin", "merchant"),
  offerController.createOffer
);

module.exports = router;
