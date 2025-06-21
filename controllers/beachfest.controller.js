const { beach_fests } = require("../models/services");

// ✅ Create a Beach Fest
exports.createBeachFest = async (req, res) => {
  try {
    const data = req.body;

    const newFest = await beach_fests.create(data);

    res.status(201).json({
      success: true,
      message: "Beach fest created successfully",
      data: newFest,
    });
  } catch (error) {
    console.error("Error creating beach fest:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ Update a Beach Fest
exports.updateBeachFest = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const fest = await beach_fests.findByPk(id);
    if (!fest) {
      return res
        .status(404)
        .json({ success: false, message: "Beach fest not found" });
    }

    await fest.update(data);

    res.status(200).json({
      success: true,
      message: "Beach fest updated successfully",
      data: fest,
    });
  } catch (error) {
    console.error("Error updating beach fest:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ Get All Beach Fests
exports.getAllBeachFests = async (req, res) => {
  try {
    const fests = await beach_fests.findAll({
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json({
      success: true,
      message: "Beach fests fetched successfully",
      data: fests,
    });
  } catch (error) {
    console.error("Error fetching beach fests:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ Get a Specific Beach Fest
exports.getBeachFestById = async (req, res) => {
  try {
    const { id } = req.params;

    const fest = await beach_fests.findByPk(id);

    if (!fest) {
      return res
        .status(404)
        .json({ success: false, message: "Beach fest not found" });
    }

    res.status(200).json({
      success: true,
      message: "Beach fest fetched successfully",
      data: fest,
    });
  } catch (error) {
    console.error("Error fetching beach fest:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ Delete a Beach Fest
exports.deleteBeachFest = async (req, res) => {
  try {
    const { id } = req.params;

    const fest = await beach_fests.findByPk(id);
    if (!fest) {
      return res
        .status(404)
        .json({ success: false, message: "Beach fest not found" });
    }

    await fest.destroy();

    res.status(200).json({
      success: true,
      message: "Beach fest deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting beach fest:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
