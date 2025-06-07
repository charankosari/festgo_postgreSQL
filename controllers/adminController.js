const asyncHandler = require("../middlewares/asynchandler");
const errorHandler = require("../utils/errorHandler");
const Amenity = require("../models/amenityModel");
const Policy = require("../models/policyModel");
const Merchant = require("../models/merchantModel");
const RoomAmenity = require("../models/roomAmenityModel");
const EventType = require('../models/eventTypeModel');
// --- Amenity Controllers ---

// @desc    Create New Amenity
// @route   POST /api/v1/admin/amenity/new
// @access  Private (Admin)
exports.createAmenity = asyncHandler(async (req, res, next) => {
    const amenity = await Amenity.create(req.body);
    res.status(201).json({
        success: true,
        amenity,
    });
});

// @desc    Get All Amenities
// @route   GET /api/v1/admin/amenities
// @access  Private (Admin)
exports.getAllAmenities = asyncHandler(async (req, res, next) => {
    const amenities = await Amenity.find();
    res.status(200).json({
        success: true,
        amenities,
    });
});

// @desc    Update Amenity
// @route   PUT /api/v1/admin/amenity/:id
// @access  Private (Admin)
exports.updateAmenity = asyncHandler(async (req, res, next) => {
    let amenity = await Amenity.findById(req.params.id);
    if (!amenity) {
        return next(new errorHandler("Amenity not found", 404));
    }
    amenity = await Amenity.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
        useFindAndModify: false,
    });
    res.status(200).json({
        success: true,
        amenity,
    });
});

// @desc    Delete Amenity
// @route   DELETE /api/v1/admin/amenity/:id
// @access  Private (Admin)
exports.deleteAmenity = asyncHandler(async (req, res, next) => {
    const amenity = await Amenity.findById(req.params.id);
    if (!amenity) {
        return next(new errorHandler("Amenity not found", 404));
    }
    await amenity.remove();
    res.status(200).json({
        success: true,
        message: "Amenity deleted successfully",
    });
});

exports.getAmenitiesByCategory = asyncHandler(async (req, res, next) => {
    try {
      // Fetch distinct categories from Amenity collection
      const categories = await Amenity.distinct("category");
      const result = {};
  
      for (const category of categories) {
        const amenities = await Amenity.find({ category });
        result[category] = amenities;
      }
  
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  });
  

// --- Policy Controllers ---

// @desc    Create New Policy
// @route   POST /api/v1/admin/policy/new
// @access  Private (Admin)
exports.createPolicy = asyncHandler(async (req, res, next) => {
    const policy = await Policy.create(req.body);
    res.status(201).json({
        success: true,
        policy,
    });
});

// @desc    Get All Policies
// @route   GET /api/v1/admin/policies
// @access  Private (Admin)
exports.getAllPolicies = asyncHandler(async (req, res, next) => {
    const policies = await Policy.find();
    res.status(200).json({
        success: true,
        policies,
    });
});

// @desc    Update Policy
// @route   PUT /api/v1/admin/policy/:id
// @access  Private (Admin)
exports.updatePolicy = asyncHandler(async (req, res, next) => {
    let policy = await Policy.findById(req.params.id);
    if (!policy) {
        return next(new errorHandler("Policy not found", 404));
    }
    policy = await Policy.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
        useFindAndModify: false,
    });
    res.status(200).json({
        success: true,
        policy,
    });
});

// @desc    Delete Policy
// @route   DELETE /api/v1/admin/policy/:id
// @access  Private (Admin)
exports.deletePolicy = asyncHandler(async (req, res, next) => {
    const policy = await Policy.findById(req.params.id);
    if (!policy) {
        return next(new errorHandler("Policy not found", 404));
    }
    await policy.remove();
    res.status(200).json({
        success: true,
        message: "Policy deleted successfully",
    });
});

// --- Room Amenity Controllers ---

// @desc    Create New Room Amenity
// @route   POST /api/v1/admin/roomamenity/new
// @access  Private (Admin)
exports.createRoomAmenity = asyncHandler(async (req, res, next) => {
    const roomAmenity = await RoomAmenity.create(req.body);
    res.status(201).json({
        success: true,
        roomAmenity,
    });
});

// @desc    Get All Room Amenities
// @route   GET /api/v1/admin/roomamenities
// @access  Private (Admin)
exports.getAllRoomAmenities = asyncHandler(async (req, res, next) => {
    const roomAmenities = await RoomAmenity.find();
    res.status(200).json({
        success: true,
        roomAmenities,
    });
});

// @desc    Update Room Amenity
// @route   PUT /api/v1/admin/roomamenity/:id
// @access  Private (Admin)
exports.updateRoomAmenity = asyncHandler(async (req, res, next) => {
    let roomAmenity = await RoomAmenity.findById(req.params.id);
    if (!roomAmenity) {
        return next(new errorHandler("Room Amenity not found", 404));
    }
    roomAmenity = await RoomAmenity.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
        useFindAndModify: false,
    });
    res.status(200).json({
        success: true,
        roomAmenity,
    });
});

// @desc    Delete Room Amenity
// @route   DELETE /api/v1/admin/roomamenity/:id
// @access  Private (Admin)
exports.deleteRoomAmenity = asyncHandler(async (req, res, next) => {
    const roomAmenity = await RoomAmenity.findById(req.params.id);
    if (!roomAmenity) {
        return next(new errorHandler("Room Amenity not found", 404));
    }
    await roomAmenity.remove();
    res.status(200).json({
        success: true,
        message: "Room Amenity deleted successfully",
    });
});


exports.getRoomAmenitiesByCategory = asyncHandler(async (req, res, next) => {
    try {
      // Fetch distinct categories from RoomAmenity collection
      const categories = await RoomAmenity.distinct("category");
      const result = {};
  
      for (const category of categories) {
        const roomAmenities = await RoomAmenity.find({ category });
        result[category] = roomAmenities;
      }
  
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  });


// @desc    Get all merchants with role 'merchant'
// @route   GET /api/v1/admin/merchants
// @access  Private (Admin only)
exports.getAllMerchants = asyncHandler(async (req, res, next) => {
  const merchants = await Merchant.find({ role: 'merchant' });

  res.status(200).json({
    success: true,
    count: merchants.length,
    data: merchants,
  });
});

// @desc    Authorize a merchant (set is_authorized to true)
// @route   PUT /api/v1/admin/merchant/:id/authorize
// @access  Private (Admin only)
exports.authorizeMerchant = asyncHandler(async (req, res, next) => {
  const merchant = await Merchant.findById(req.params.id);

  if (!merchant) {
    return next(new errorHandler(`Merchant not found with id of ${req.params.id}`, 404));
  }

  merchant.is_authorized = true;
  await merchant.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    data: merchant,
    message: 'Merchant authorized successfully',
  });
});

// event type controllers
// @desc    Create a new event type
// @route   POST /api/v1/admin/eventtype/new
// @access  Private (Admin only)
exports.createEventType = asyncHandler(async (req, res, next) => {
    const eventType = await EventType.create(req.body);
    res.status(201).json({
      success: true,
      eventType,
    });
  });
  
  // @desc    Get single event type by ID
  // @route   GET /api/v1/admin/eventtypes
  // @access  Public (Admin only)
  // Get all event types or a single event type by ID
  exports.getEventTypes = asyncHandler(async (req, res, next) => {
    let eventTypes;
    if (req.params.id) {
      eventTypes = await EventType.findById(req.params.id);
      if (!eventTypes) {
        return next(new errorHandler('Event Type not found', 404));
      }
    } else {
      eventTypes = await EventType.find();
    }
    res.status(200).json({
      success: true,
      count: eventTypes.length || 1,
      eventTypes,
    });
  });

  
  // @desc    Get all event types 
  // @route   GET /api/v1/admin/eventtypes
  // @access  Public (Admin only)
  exports.getAllEventTypes = asyncHandler(async (req, res, next) => {
   
     const eventTypes = await EventType.find();
    
    res.status(200).json({
      success: true,
      count: eventTypes.length || 1,
      eventTypes,
    });
  });
  
  // @desc    Update an event type
  // @route   PUT /api/v1/admin/eventtype/:id
  // @access  Private (Admin only)
  // Update an event type
  exports.updateEventType = asyncHandler(async (req, res, next) => {
    let eventType = await EventType.findById(req.params.id);
  
    if (!eventType) {
      return next(new errorHandler('Event Type not found', 404));
    }
  
    eventType = await EventType.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
      useFindAndModify: false,
    });
  
    res.status(200).json({
      success: true,
      eventType,
    });
  });
  // @desc    Delete an event type
  // @route   DELETE /api/v1/admin/eventtype/:id
  // @access  Private (Admin only)
  // Delete an event type
  exports.deleteEventType = asyncHandler(async (req, res, next) => {
    const eventType = await EventType.findById(req.params.id);
  
    if (!eventType) {
      return next(new errorHandler('Event Type not found', 404));
    }
  
    await eventType.remove();
  
    res.status(200).json({
      success: true,
      message: 'Event Type deleted successfully',
    });
  });