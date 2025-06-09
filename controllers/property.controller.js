const { Property } = require("../models/services/index");
const { User } = require("../models/users");
const { Op } = require("sequelize");

// total steps in your property creation process
const TOTAL_STEPS = 7;

// helper function to calculate status
const calculateStatus = (currentStep) => {
  return Math.floor((currentStep / TOTAL_STEPS) * 100);
};

// ✅ Create Property
exports.createProperty = async (req, res) => {
  try {
    const { vendorId, current_step = 1, ...details } = req.body;

    const vendor = await User.findByPk(vendorId);
    if (!vendor) return res.status(404).json({ message: "Vendor not found" });
    if (vendor.role !== "vendor")
      return res
        .status(403)
        .json({ message: "Vendor can only create a property" });
    if (!vendor.is_authorized)
      return res.status(403).json({ message: "Vendor is not authorized" });

    const status = calculateStatus(current_step);
    const in_progress = status < 100;
    const is_completed = status === 100;

    const property = await Property.create({
      vendorId,
      current_step,
      status,
      in_progress,
      is_completed,
      ...details,
    });

    res.status(201).json({ success: true, property });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Update Property by ID
exports.updateProperty = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const property = await Property.findByPk(id);
    if (!property)
      return res.status(404).json({ message: "Property not found" });

    // update fields
    await property.update(updates);

    // recalculate status and completion state
    const currentStep = updates.current_step || property.current_step + 1;
    const status = calculateStatus(currentStep);
    const in_progress = status < 100;
    const is_completed = status === 100;

    await property.update({
      current_step: currentStep,
      status,
      in_progress,
      is_completed,
    });

    res.json({ success: true, property });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Get All Properties
exports.getAllProperties = async (req, res) => {
  try {
    const properties = await Property.findAll();
    res.json({ success: true, properties });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Get Property by ID
exports.getPropertyById = async (req, res) => {
  try {
    const { id } = req.params;
    const property = await Property.findByPk(id);
    if (!property)
      return res.status(404).json({ message: "Property not found" });
    res.json({ success: true, property });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Get Properties by Vendor
exports.getPropertiesByVendor = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const properties = await Property.findAll({ where: { vendorId } });
    res.json({ success: true, properties });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Delete Property by ID
exports.deleteProperty = async (req, res) => {
  try {
    const { id } = req.params;
    const property = await Property.findByPk(id);
    if (!property)
      return res.status(404).json({ message: "Property not found" });

    await property.destroy();
    res.json({ success: true, message: "Property deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
