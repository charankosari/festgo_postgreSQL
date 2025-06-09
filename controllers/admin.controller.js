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
exports.authorizeVendor = async (req, res) => {
  try {
    const vendor = await User.findByPk(req.params.id);
    if (!vendor || vendor.role !== "vendor") {
      return res.status(404).json({ message: "Vendor not found" });
    }
    vendor.is_authorized = true;
    await vendor.save();
    res.status(200).json({ message: "Vendor authorized successfully", vendor });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ De-authorize vendor
exports.deauthorizeVendor = async (req, res) => {
  try {
    const vendor = await User.findByPk(req.params.id);
    if (!vendor || vendor.role !== "vendor") {
      return res.status(404).json({ message: "Vendor not found" });
    }
    vendor.is_authorized = false;
    await vendor.save();
    res
      .status(200)
      .json({ message: "Vendor de-authorized successfully", vendor });
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
