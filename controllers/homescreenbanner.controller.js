const { HomeScreenBanner } = require("../models/services");

// Upsert homescreen banner (create or update)
exports.upsertHomeScreenBanner = async (req, res) => {
  try {
    const { content } = req.body;

    // Validate required fields
    if (!content || content.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Content is required and cannot be empty",
        status: 400,
      });
    }

    // Check if a banner already exists
    let banner = await HomeScreenBanner.findOne();

    if (banner) {
      // Update existing banner
      banner.content = content;

      await banner.save();

      return res.status(200).json({
        success: true,
        message: "Home screen banner updated successfully",
        data: banner,
        status: 200,
      });
    } else {
      // Create new banner
      banner = await HomeScreenBanner.create({
        content,
      });

      return res.status(201).json({
        success: true,
        message: "Home screen banner created successfully",
        data: banner,
        status: 201,
      });
    }
  } catch (error) {
    console.error("Error in upsertHomeScreenBanner:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      status: 500,
    });
  }
};

// Get homescreen banner
exports.getHomeScreenBanner = async (req, res) => {
  try {
    const banner = await HomeScreenBanner.findOne({
      order: [["updatedAt", "DESC"]],
    });

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "No active home screen banner found",
        status: 404,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Home screen banner retrieved successfully",
      data: banner,
      status: 200,
    });
  } catch (error) {
    console.error("Error in getHomeScreenBanner:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      status: 500,
    });
  }
};

// Delete homescreen banner
exports.deleteHomeScreenBanner = async (req, res) => {
  try {
    const { id } = req.params;

    const banner = await HomeScreenBanner.findByPk(id);

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Home screen banner not found",
        status: 404,
      });
    }

    await banner.destroy();

    return res.status(200).json({
      success: true,
      message: "Home screen banner deleted successfully",
      status: 200,
    });
  } catch (error) {
    console.error("Error in deleteHomeScreenBanner:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      status: 500,
    });
  }
};
