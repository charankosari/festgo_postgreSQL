const express = require("express");
const router = express.Router();
const eventCtrl = require("../controllers/event.controller");

// Event routes
router.post("/events", eventCtrl.createEvent);
router.get("/events", eventCtrl.getAllEvents);
router.get("/events/:id", eventCtrl.getEventById);
router.put("/events/:id", eventCtrl.updateEvent);
router.delete("/events/:id", eventCtrl.deleteEvent);
router.get("/vendor-events/:vendorId", eventCtrl.getEventsByVendorId);
router.get("/event-type-events/:eventTypeId", eventCtrl.getEventsByEventTypeId);

// EventType routes
router.post("/event-types", eventCtrl.createEventType);
router.get("/event-types", eventCtrl.getAllEventTypes);
router.get("/event-types/:id", eventCtrl.getEventTypeById);
router.put("/event-types/:id", eventCtrl.updateEventType);
router.delete("/event-types/:id", eventCtrl.deleteEventType);

module.exports = router;
