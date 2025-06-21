const { review, User } = require("../models/users");
const { Property } = require("../models/services");
const { Sequelize } = require("sequelize");

// ✅ Create Review
exports.createReview = async (req, res) => {
  try {
    const { propertyId, rating, comment } = req.body;
    const userId = req.user.id;

    // Fetch property
    const property = await Property.findByPk(propertyId);
    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }

    // Increment review count
    property.review_count += 1;
    await property.save();

    // Fetch user
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Determine reviewer name
    const reviewer_name =
      user.firstname && user.lastname
        ? `${user.firstname} ${user.lastname}`
        : user.username;

    // Create review
    const newReview = await review.create({
      propertyId,
      userId,
      rating,
      comment,
      name: reviewer_name,
      image: user.image_url,
    });

    res.status(201).json(newReview);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ✅ Update Review
exports.updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const r = await review.findByPk(id);

    if (!r) return res.status(404).json({ message: "Review not found" });

    // Check if current user is the owner or admin
    if (r.userId !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ message: "Unauthorized action" });
    }

    await r.update(req.body);
    res.json(r);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ✅ Delete Review
exports.deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    const review = await review.findByPk(id);

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
    const reviews = await review.findAll({});
    res.json(reviews);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ✅ Get Reviews by Property
exports.getReviewsByProperty = async (req, res) => {
  try {
    const { propertyId } = req.params;
    const reviews = await review.findAll({
      where: { propertyId },
    });
    res.status(200).json(reviews);
  } catch (error) {
    console.error("Error fetching reviews:", error);
    res.status(400).json({ message: error.message });
  }
};

// ✅ Get Average Rating of a Property
exports.getAverageRatingByPropertyId = async (req, res) => {
  try {
    const { propertyId } = req.params;

    const result = await review.findAll({
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
    const result = await review.findAll({
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
