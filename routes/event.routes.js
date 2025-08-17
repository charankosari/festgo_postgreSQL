const express = require("express");
const router = express.Router();
const eventCtrl = require("../controllers/event.controller");
const { isAuthorized, authorizedRoles } = require("../middlewares/auth");

// Event routes
router.post("/e", isAuthorized, eventCtrl.createEvent);
router.get(
  "/e",
  isAuthorized,
  authorizedRoles("admin"),
  eventCtrl.getAllEvents
);
router.get("/e/:id", isAuthorized, eventCtrl.getEventById);
router.put("/e/:id", isAuthorized, eventCtrl.updateEvent);
router.delete("/e/:id", isAuthorized, eventCtrl.deleteEvent);
router.get("/vendor-events/:userId", eventCtrl.getEventsByUserId);
router.get("/event-type-events/:eventTypeId", eventCtrl.getEventsByEventTypeId);

// EventType routes
router.post(
  "/event-types",
  isAuthorized,
  authorizedRoles("admin"),
  eventCtrl.createEventType
);
router.get("/event-types", eventCtrl.getAllEventTypes);
router.get("/event-types/:id", eventCtrl.getEventTypeById);
router.put(
  "/event-types/:id",
  isAuthorized,
  authorizedRoles("admin"),
  eventCtrl.updateEventType
);
router.delete(
  "/event-types/:id",
  isAuthorized,
  authorizedRoles("admin"),
  eventCtrl.deleteEventType
);

module.exports = router;
