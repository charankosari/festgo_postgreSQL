const { city_fest, city_fest_category } = require("../models/services");
const { Op } = require("sequelize");
// 🎉 Create City Fest Category
exports.createCityFestCategory = async (req, res) => {
  try {
    const { image, name } = req.body;

    const category = await city_fest_category.create({
      image,
      name,
    });
    res.status(201).json({
      success: true,
      message: "City fest category created successfully",
      data: category,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 🎉 Get All City Fest Categories (filtered by location if provided)
exports.getCityFestCategories = async (req, res) => {
  try {
    const location =
      (req.body && req.body.location) || req.query.location || "";

    // If no location is provided, return all categories
    if (!location || location.trim() === "") {
      const categories = await city_fest_category.findAll();
      return res.status(200).json({
        success: true,
        data: categories,
      });
    }

    // If location is provided, find city fests matching that location
    const cityFests = await city_fest.findAll({
      where: {
        location: {
          [Op.iLike]: `%${location.trim()}%`, // Case-insensitive partial match
        },
      },
      include: [
        {
          model: city_fest_category,
          as: "festCategory",
          attributes: ["id", "name", "image"],
        },
      ],
    });

    // Extract unique categories from the city fests
    const categoryMap = new Map();
    cityFests.forEach((fest) => {
      if (fest.festCategory) {
        const categoryId = fest.festCategory.id;
        if (!categoryMap.has(categoryId)) {
          categoryMap.set(categoryId, fest.festCategory.toJSON());
        }
      }
    });

    // Convert map values to array
    const categories = Array.from(categoryMap.values());

    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateCityFestCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const category = await city_fest_category.findByPk(id);

    if (!category) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }

    await category.update(updates);

    res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: category,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
exports.deleteCityFestCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await city_fest_category.findByPk(id);

    if (!category) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }

    await category.destroy();

    res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 🎉 Create City Fest
exports.createCityFest = async (req, res) => {
  try {
    const {
      categoryId,
      location,
      available_passes,
      total_passes,
      price_per_pass,
      event_start,
      event_end,
      highlights,
      image_urls,
      gmap_url,
      whats_included,
      latitude,
      longitude,
    } = req.body;
    const startDate = new Date(event_start);
    // normalize startDate to midnight for date-only comparisons
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(event_end);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid event_start or event_end." });
    }
    if (startDate >= endDate) {
      return res.status(400).json({
        success: false,
        message: "event_start must be before event_end.",
      });
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // require startDate to be strictly greater than today (no same-day starts)
    if (startDate <= today) {
      return res.status(400).json({
        success: false,
        message: "event_start must be a future date (greater than today).",
      });
    }

    // Validation: price_per_pass must be a number and not negative
    const price = parseFloat(price_per_pass);
    if (isNaN(price) || price < 0) {
      return res.status(400).json({
        success: false,
        message: "price_per_pass must be a non-negative number.",
      });
    }
    const fest = await city_fest.create({
      categoryId,
      location,
      available_passes,
      total_passes,
      price_per_pass,
      event_start,
      event_end,
      highlights,
      image_urls,
      gmap_url,
      whats_included,
      latitude,
      longitude,
    });

    res.status(201).json({
      success: true,
      message: "City fest created successfully",
      data: fest,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllCityFests = async (req, res) => {
  try {
    const fests = await city_fest.findAll({
      include: [{ model: city_fest_category, as: "festCategory" }],
    });

    res.status(200).json({
      success: true,
      data: fests,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 🎉 Get Specific City Fest
exports.getCityFestById = async (req, res) => {
  try {
    const { id } = req.params;

    const fest = await city_fest.findOne({
      where: { id },
      include: [{ model: city_fest_category, as: "festCategory" }],
    });

    if (!fest) {
      return res
        .status(404)
        .json({ success: false, message: "Fest not found" });
    }

    res.status(200).json({ success: true, data: fest });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 🎉 Update City Fest
exports.updateCityFest = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const fest = await city_fest.findByPk(id);

    if (!fest) {
      return res
        .status(404)
        .json({ success: false, message: "Fest not found" });
    }

    await fest.update(updates);

    res
      .status(200)
      .json({ success: true, message: "Fest updated", data: fest });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 🎉 Delete City Fest
exports.deleteCityFest = async (req, res) => {
  try {
    const { id } = req.params;

    const fest = await city_fest.findByPk(id);

    if (!fest) {
      return res
        .status(404)
        .json({ success: false, message: "Fest not found" });
    }

    await fest.destroy();

    res
      .status(200)
      .json({ success: true, message: "Fest deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getCityFestsByCategory = async (req, res) => {
  try {
    const { categoryid, location } = req.body;

    // Validate required field
    if (!categoryid) {
      return res.status(400).json({
        success: false,
        message: "categoryid is required",
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Build where clause
    const whereClause = {
      categoryId: categoryid,
      event_start: {
        [Op.gte]: today, // event_start >= today
      },
    };

    // Add location filter if provided
    if (location && location.trim() !== "") {
      whereClause.location = {
        [Op.iLike]: `%${location.trim()}%`, // Case-insensitive partial match
      };
    }

    const fests = await city_fest.findAll({
      where: whereClause,
      order: [["event_start", "ASC"]], // soonest first
    });

    res.status(200).json({ success: true, fests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllCityFests = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Build where clause
    const whereClause = {
      event_start: {
        [Op.gte]: today, // event_start >= today
      },
    };
    const fests = await city_fest.findAll({
      where: whereClause,
      order: [["event_start", "ASC"]], // soonest first
    });
    res.status(200).json({ success: true, fests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
