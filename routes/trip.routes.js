const express = require("express");
const router = express.Router();
const TripsController = require("../controllers/trips.controller");
const PlanMyTripsController = require("../controllers/planmytrips.controller");
const { isAuthorized, authorizedRoles } = require("../middlewares/auth");
router.route("/user").get(isAuthorized, TripsController.getValidTrips);
router
  .route("/planmytrip")
  .post(isAuthorized, PlanMyTripsController.createPlanMyTrip)
  .get(
    isAuthorized,
    authorizedRoles("admin"),
    PlanMyTripsController.getPlanMyTrips
  );
router
  .route("/")
  .post(isAuthorized, authorizedRoles("admin"), TripsController.createTrip)
  .get(isAuthorized, authorizedRoles("admin"), TripsController.getAllTrips);
router
  .route("/:id")
  .put(isAuthorized, authorizedRoles("admin"), TripsController.updateTrip)
  .delete(isAuthorized, authorizedRoles("admin"), TripsController.deleteTrip)
  .get(isAuthorized, TripsController.getTripById);

module.exports = router;
