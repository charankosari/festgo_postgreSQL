const asyncHandler = require("../middlewares/asynchandler");
const errorHandler = require("../utils/errorHandler");
const Amenity = require("../models/amenityModel");
const Policy = require("../models/policyModel");
const RoomAmenity = require("../models/roomAmenityModel");

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