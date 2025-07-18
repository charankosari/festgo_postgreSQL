const { Property, FestgoCoinSetting } = require("../models/services");
const { User } = require("../models/users");

// ✅ Get all vendors
exports.getAllVendors = async (req, res) => {
  try {
    const vendors = await User.findAll({ where: { role: "vendor" } });
    res.status(200).json(vendors);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Get specific vendor by ID
exports.getVendorById = async (req, res) => {
  try {
    const vendor = await User.findByPk(req.params.id);
    if (!vendor || vendor.role !== "vendor") {
      return res.status(404).json({ message: "Vendor not found" });
    }
    res.status(200).json(vendor);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Authorize vendor
exports.authorizeProperty = async (req, res) => {
  try {
    const property = await Property.findByPk(req.params.id);
    if (!property) {
      return res.status(404).json({ message: "property not found" });
    }
    property.active = true;
    await property.save();
    res
      .status(200)
      .json({ message: "property authorized successfully", property });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ De-authorize vendor
exports.deauthorizeProperty = async (req, res) => {
  try {
    const property = await Property.findByPk(req.params.id);
    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }
    property.active = false;
    await property.save();
    res
      .status(200)
      .json({ message: "property de-authorized successfully", vendor });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Delete vendor
exports.deleteVendor = async (req, res) => {
  try {
    const vendor = await User.findByPk(req.params.id);
    if (!vendor || vendor.role !== "vendor") {
      return res.status(404).json({ message: "Vendor not found" });
    }
    await vendor.destroy();
    res.status(200).json({ message: "Vendor deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Get all Festgo Coin settings
exports.createFestgoCoinSettings = async (req, res) => {
  try {
    const {
      type,
      monthly_limit_value,
      single_transaction_limit_value,
      monthly_referral_limit,
    } = req.body;
    const allowedTypes = [
      "event",
      "property",
      "beach_fest",
      "city_fest",
      "festbite",
      "user_referral",
    ];
    if (!type) {
      return res
        .status(400)
        .json({ success: false, message: "Type is required." });
    }

    if (!allowedTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid type '${type}'. Allowed types are: ${allowedTypes.join(
          ", "
        )}`,
      });
    }

    // Check if a setting already exists for the given type
    const [setting, created] = await FestgoCoinSetting.upsert(
      {
        type,
        monthly_limit_value,
        single_transaction_limit_value,
        monthly_referral_limit,
      },
      {
        returning: true,
        conflictFields: ["type"], // ensure it updates based on 'type'
      }
    );

    res.status(created ? 201 : 200).json({
      success: true,
      message: created
        ? "Setting created successfully."
        : "Setting updated successfully.",
      data: setting,
    });
  } catch (error) {
    console.error("Error in createOrUpdateCoinSetting:", error);
    res.status(500).json({ success: false, message: "Internal Server Error." });
  }
};

// GET: Fetch all FestGo Coin Settings
exports.getAllCoinSettings = async (req, res) => {
  try {
    const settings = await FestgoCoinSetting.findAll({
      order: [["updatedAt", "DESC"]],
    });

    res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error("Error in getAllCoinSettings:", error);
    res.status(500).json({ success: false, message: "Internal Server Error." });
  }
};
