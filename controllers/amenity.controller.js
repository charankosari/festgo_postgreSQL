const { amenity, amenity_category } = require("../models/services");

exports.createAmenity = async (req, res) => {
  try {
    const { categoryId, name, type, options, image } = req.body;

    if (type === "MULTI" && (!options || !Array.isArray(options)))
      return res
        .status(400)
        .json({ message: "Options are required for MULTI type." });

    const newAmenity = await amenity.create({
      categoryId,
      name,
      type,
      image,
      options: type === "BOOLEAN" ? null : options,
    });

    res.status(201).json(newAmenity);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAllAmenities = async (req, res) => {
  try {
    const amenities = await amenity.findAll();
    res.status(200).json(amenities);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAmenityById = async (req, res) => {
  try {
    const ament = await amenity.findByPk(req.params.id);
    if (!ament) return res.status(404).json({ message: "Amenity not found" });
    res.status(200).json(ament);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateAmenity = async (req, res) => {
  try {
    const ament = await amenity.findByPk(req.params.id);
    if (!ament) return res.status(404).json({ message: "Amenity not found" });

    const { name, type, options, image } = req.body;

    if (type && type === "MULTI" && (!options || !Array.isArray(options)))
      return res
        .status(400)
        .json({ message: "Options are required for MULTI type." });

    await ament.update({
      name: name ?? ament.name,
      type: type ?? ament.type,
      image: image ?? ament.image,
      options: type === "BOOLEAN" ? null : options ?? ament.options,
    });

    res.status(200).json(ament);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.deleteAmenity = async (req, res) => {
  try {
    const ament = await amenity.findByPk(req.params.id);
    if (!ament) return res.status(404).json({ message: "Amenity not found" });

    await ament.destroy();
    res.status(200).json({ message: "Amenity deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAllAmenitiesGroupedByCategory = async (req, res) => {
  try {
    const categories = await amenity_category.findAll({
      include: [
        {
          model: amenity,
          as: "amenities",
        },
      ],
      order: [["categoryName", "ASC"]],
    });

    const result = {};

    categories.forEach((category) => {
      result[category.categoryName] = category.amenities.map((ament) => ({
        id: ament.id,
        name: ament.name,
        type: ament.type,
        options: ament.options,
        image: ament.image,
      }));
    });

    res.status(200).json(result);
  } catch (error) {
    console.error("Fetch Amenities Error:", error);
    res.status(500).json({ message: "Failed to fetch amenities" });
  }
};
