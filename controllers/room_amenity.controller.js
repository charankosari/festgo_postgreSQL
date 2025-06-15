const db = require("../models/services"); // Assuming index.js exports both models
const RoomAmenity = db.room_amenity;
const RoomAmenityCategory = db.room_amenity_category;

// Category CRUD
exports.createCategory = async (req, res) => {
  try {
    const category = await RoomAmenityCategory.create(req.body);
    res.status(201).json(category);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAllCategories = async (req, res) => {
  try {
    const categories = await RoomAmenityCategory.findAll();
    res.status(200).json(categories);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const category = await RoomAmenityCategory.findByPk(req.params.id);
    if (!category)
      return res.status(404).json({ message: "Category not found" });

    await category.update(req.body);
    res.status(200).json(category);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const category = await RoomAmenityCategory.findByPk(req.params.id);
    if (!category)
      return res.status(404).json({ message: "Category not found" });

    await category.destroy();
    res.status(200).json({ message: "Category deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Amenity CRUD
exports.createAmenity = async (req, res) => {
  try {
    const amenity = await RoomAmenity.create(req.body);
    res.status(201).json(amenity);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAllAmenities = async (req, res) => {
  try {
    const amenities = await RoomAmenity.findAll({
      include: { model: RoomAmenityCategory, as: "category" },
    });
    res.status(200).json(amenities);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateAmenity = async (req, res) => {
  try {
    const amenity = await RoomAmenity.findByPk(req.params.id);
    if (!amenity) return res.status(404).json({ message: "Amenity not found" });

    await amenity.update(req.body);
    res.status(200).json(amenity);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteAmenity = async (req, res) => {
  try {
    const amenity = await RoomAmenity.findByPk(req.params.id);
    if (!amenity) return res.status(404).json({ message: "Amenity not found" });

    await amenity.destroy();
    res.status(200).json({ message: "Amenity deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Grouped amenities
exports.getAmenitiesGroupedByCategory = async (req, res) => {
  try {
    const categories = await RoomAmenityCategory.findAll({
      include: [
        {
          model: RoomAmenity,
          as: "roomAmenities",
        },
      ],
      order: [["categoryName", "ASC"]],
    });
    const result = {};
    categories.forEach((category) => {
      result[category.categoryName] = category.roomAmenities.map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        options: a.options,
        image: a.image,
      }));
    });

    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
