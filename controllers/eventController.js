const Event = require('../models/eventModel');
const asyncHandler = require('../middlewares/asynchandler');
const ErrorHandler = require('../utils/errorHandler');

// Create a new event
exports.createEvent = asyncHandler(async (req, res, next) => {
  const event = await Event.create(req.body);
  res.status(201).json({
    success: true,
    event,
  });
});

// Get all events or a single event by ID
exports.getEvents = asyncHandler(async (req, res, next) => {
  let events;
  if (req.params.id) {
    events = await Event.findById(req.params.id);
    if (!events) {
      return next(new ErrorHandler('Event not found', 404));
    }
  } else {
    events = await Event.find();
  }
  res.status(200).json({
    success: true,
    count: events.length || 1,
    events,
  });
});

// Update an event
exports.updateEvent = asyncHandler(async (req, res, next) => {
  let event = await Event.findById(req.params.id);

  if (!event) {
    return next(new ErrorHandler('Event not found', 404));
  }

  event = await Event.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
    useFindAndModify: false,
  });

  res.status(200).json({
    success: true,
    event,
  });
});

// Delete an event
exports.deleteEvent = asyncHandler(async (req, res, next) => {
  const event = await Event.findById(req.params.id);

  if (!event) {
    return next(new ErrorHandler('Event not found', 404));
  }

  await event.remove();

  res.status(200).json({
    success: true,
    message: 'Event deleted successfully',
  });
});

// Get all events
exports.getAllEvents = asyncHandler(async (req, res, next) => {
  const events = await Event.find({});

  res.status(200).json({
    success: true,
    events,
  });
});