const { Event, EventType } = require("../models/services"); // adjust path as per your project

// Create Event
exports.createEvent = async (req, res) => {
  try {
    const userId = req.user.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: User not found" });
    }
    const eventData = {
      ...req.body,
      userId,
    };
    const event = await Event.create(eventData);
    res.status(201).json({
      success: true,
      message: "Event created successfully",
      status: 201,
      event,
    });
  } catch (error) {
    console.error("Error creating event:", error);
    res.status(400).json({
      success: false,
      message: error.message,
      status: 400,
    });
  }
};

// Update Event
exports.updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findByPk(id);

    if (!event) return res.status(404).json({ message: "Event not found" });

    await event.update(req.body);
    res.json(event);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete Event
exports.deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findByPk(id);

    if (!event) return res.status(404).json({ message: "Event not found" });

    await event.destroy();
    res.json({ message: "Event deleted successfully" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get All Events
exports.getAllEvents = async (req, res) => {
  try {
    const events = await Event.findAll({
      include: [{ model: EventType, as: "eventType" }],
    });
    res.json(events);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get Event By Id
exports.getEventById = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findByPk(id, {
      include: [{ model: EventType, as: "eventType" }],
    });

    if (!event) return res.status(404).json({ message: "Event not found" });

    res.json(event);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get Events By VendorId
exports.getEventsByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    const events = await Event.findAll({
      where: { userId: userId },
      include: [{ model: EventType, as: "eventType" }],
    });

    res.json(events);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get Events By EventTypeId
exports.getEventsByEventTypeId = async (req, res) => {
  try {
    const { eventTypeId } = req.params;
    const events = await Event.findAll({
      where: { eventTypeId },
      include: [{ model: EventType, as: "eventType" }],
    });

    res.json(events);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// event types controllers

exports.createEventType = async (req, res) => {
  try {
    const eventType = await EventType.create(req.body);
    res.status(201).json(eventType);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update EventType
exports.updateEventType = async (req, res) => {
  try {
    const { id } = req.params;
    const eventType = await EventType.findByPk(id);

    if (!eventType)
      return res.status(404).json({ message: "EventType not found" });

    await eventType.update(req.body);
    res.json(eventType);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete EventType
exports.deleteEventType = async (req, res) => {
  try {
    const { id } = req.params;
    const eventType = await EventType.findByPk(id);

    if (!eventType)
      return res.status(404).json({ message: "EventType not found" });

    await eventType.destroy();
    res.json({ message: "EventType deleted successfully" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get All EventTypes
exports.getAllEventTypes = async (req, res) => {
  try {
    const eventTypes = await EventType.findAll();
    res.json(eventTypes);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get EventType By Id
exports.getEventTypeById = async (req, res) => {
  try {
    const { id } = req.params;
    const eventType = await EventType.findByPk(id);

    if (!eventType)
      return res.status(404).json({ message: "EventType not found" });

    res.json(eventType);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
