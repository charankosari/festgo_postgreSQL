const { HomeScreenBanner } = require("../models/services");

// Upsert homescreen banner (create or update)
// ✅ Upsert homescreen banner (create or update with an array)
exports.upsertHomeScreenBanner = async (req, res) => {
  try {
    const { content } = req.body;

    // --- VALIDATION FOR AN ARRAY ---
    // Check if content is a non-empty array of non-empty strings
    if (
      !content ||
      !Array.isArray(content) ||
      content.length === 0 ||
      content.some((item) => typeof item !== "string" || item.trim() === "")
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Content is required and must be a non-empty array of strings.",
        status: 400,
      });
    }

    // --- UPSERT LOGIC ---
    // This logic remains the same, but now handles an array.
    // It assumes you only ever want one banner document in the collection.
    let banner = await HomeScreenBanner.findOne();

    if (banner) {
      // Update the existing banner's content
      banner.content = content;
      await banner.save();

      return res.status(200).json({
        success: true,
        message: "Home screen banner updated successfully",
        data: banner,
        status: 200,
      });
    } else {
      // Create a new banner since none exists
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
      error: error.message,
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
