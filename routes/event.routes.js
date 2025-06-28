const express = require("express");
const router = express.Router();
const eventCtrl = require("../controllers/event.controller");
const { isAuthorized } = require("../middlewares/auth");

// Event routes
router.post("/e", isAuthorized, eventCtrl.createEvent);
router.get("/e", eventCtrl.getAllEvents);
router.get("/e/:id", eventCtrl.getEventById);
router.put("/e/:id", eventCtrl.updateEvent);
router.delete("/e/:id", eventCtrl.deleteEvent);
router.get("/vendor-events/:userId", eventCtrl.getEventsByUserId);
router.get("/event-type-events/:eventTypeId", eventCtrl.getEventsByEventTypeId);

// EventType routes
router.post("/event-types", eventCtrl.createEventType);
router.get("/event-types", eventCtrl.getAllEventTypes);
router.get("/event-types/:id", eventCtrl.getEventTypeById);
router.put("/event-types/:id", eventCtrl.updateEventType);
router.delete("/event-types/:id", eventCtrl.deleteEventType);

module.exports = router;
