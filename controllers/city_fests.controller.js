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

// 🎉 Get All City Fest Categories
exports.getCityFestCategories = async (req, res) => {
  try {
    const categories = await city_fest_category.findAll();
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
    const id = req.params.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const fests = await city_fest.findAll({
      where: {
        categoryId: id,
        event_start: {
          [Op.gte]: today, // event_start >= today
        },
      },
      order: [["event_start", "ASC"]], // soonest first
    });
    res.status(200).json({ success: true, fests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
