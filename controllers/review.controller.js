const { Review } = require("../models/users");
const { Property } = require("../models/services");
const { Sequelize } = require("sequelize");

// ✅ Create Review
exports.createReview = async (req, res) => {
  try {
    const { propertyId, rating, comment } = req.body;
    const userId = req.user.id;

    const review = await Review.create({ propertyId, userId, rating, comment });
    res.status(201).json(review);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ✅ Update Review
exports.updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const review = await Review.findByPk(id);

    if (!review) return res.status(404).json({ message: "Review not found" });

    // Check if current user is the owner or admin
    if (review.userId !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized action" });
    }

    await review.update(req.body);
    res.json(review);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ✅ Delete Review
exports.deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    const review = await Review.findByPk(id);

    if (!review) return res.status(404).json({ message: "Review not found" });

    // Check if current user is the owner or admin
    if (review.userId !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized action" });
    }

    await review.destroy();
    res.json({ message: "Review deleted successfully" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ✅ Get All Reviews
exports.getAllReviews = async (req, res) => {
  try {
    const reviews = await Review.findAll({
      include: [{ model: Property, as: "property" }],
    });
    res.json(reviews);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ✅ Get Reviews by Property
exports.getReviewsByProperty = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const reviews = await Review.findAll({
      where: { propertyId },
      include: [{ model: Property, as: "property" }],
    });
    res.json(reviews);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ✅ Get Average Rating of a Property
exports.getAverageRatingByPropertyId = async (req, res) => {
  try {
    const { propertyId } = req.params;

    const result = await Review.findAll({
      attributes: [
        "propertyId",
        [Sequelize.fn("AVG", Sequelize.col("rating")), "averageRating"],
      ],
      where: { propertyId },
      group: ["propertyId"],
      include: [{ model: Property, as: "property" }],
    });

    if (result.length === 0)
      return res.status(404).json({ message: "No reviews for this property" });

    res.json(result[0]);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ✅ Get Average Ratings for All Properties
exports.getAverageRatingOfAllProperties = async (req, res) => {
  try {
    const result = await Review.findAll({
      attributes: [
        "propertyId",
        [Sequelize.fn("AVG", Sequelize.col("rating")), "averageRating"],
      ],
      group: ["propertyId"],
      include: [{ model: Property, as: "property" }],
    });

    res.json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
