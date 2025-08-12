const { beach_fests } = require("../models/services");
const { Op, Sequelize } = require("sequelize");
// ✅ Create a Beach Fest
exports.createBeachFest = async (req, res) => {
  try {
    const data = req.body;
    const { event_start, event_end } = data;
    if (!event_start || !event_end) {
      return res.status(400).json({
        success: false,
        message: "Both eventStart and eventEnd dates are required",
      });
    }

    const startDate = new Date(event_start);
    const endDate = new Date(event_end);
    if (endDate <= startDate) {
      return res.status(400).json({
        success: false,
        message: "eventEnd must be after eventStart",
      });
    }
    const now = new Date();
    if (startDate < now) {
      return res.status(400).json({
        success: false,
        message: "eventStart cannot be in the past",
      });
    }
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

    // Validate dates if provided
    if (data.event_start || data.event_end) {
      const eventStart = data.event_start
        ? new Date(data.event_start)
        : new Date(fest.event_start);
      const eventEnd = data.event_end
        ? new Date(data.event_end)
        : new Date(fest.event_end);

      // Check valid dates
      if (isNaN(eventStart.getTime()) || isNaN(eventEnd.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Invalid date format for event_start or event_end",
        });
      }

      // Check order
      if (eventEnd <= eventStart) {
        return res.status(400).json({
          success: false,
          message: "event_end must be after event_start",
        });
      }

      // Optional: prevent setting start date in past
      const now = new Date();
      if (eventStart < now) {
        return res.status(400).json({
          success: false,
          message: "event_start cannot be in the past",
        });
      }
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
exports.getAllBeachFestsForAdmin = async (req, res) => {
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
// ✅ Get All Valid Beach Fests
exports.getAllBeachFests = async (req, res) => {
  try {
    const now = new Date();

    const fests = await beach_fests.findAll({
      where: {
        event_end: { [Op.gte]: now }, // event not ended yet
        event_start: { [Op.lt]: Sequelize.col("event_end") }, // start < end
      },
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json({
      success: true,
      message: "Valid beach fests fetched successfully",
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
// ✅ Get a Specific by type
exports.getBeachFestsByType = async (req, res) => {
  try {
    const { type } = req.body;

    if (!type) {
      return res.status(400).json({
        success: false,
        message: "Type is required to fetch beach fests",
      });
    }

    const fests = await beach_fests.findAll({
      where: { type },
      order: [["createdAt", "DESC"]], // optional: latest first
    });

    if (fests.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No beach fests found for the given type",
      });
    }

    res.status(200).json({
      success: true,
      message: "Beach fests fetched successfully",
      data: fests,
    });
  } catch (error) {
    console.error("Error fetching beach fests by type:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
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
