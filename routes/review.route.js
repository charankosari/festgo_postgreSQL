const express = require("express");
const router = express.Router();
const reviewController = require("../controllers/review.controller");
const { isAuthorized } = require("../middlewares/auth");

// Create Review
router.post("/", isAuthorized, reviewController.createReview);

// Update Review
router.put("/:id", isAuthorized, reviewController.updateReview);

// Delete Review
router.delete("/:id", isAuthorized, reviewController.deleteReview);

// Get All Reviews
router.get("/", reviewController.getAllReviews);

// Get Reviews by Property
router.get("/property/:propertyId", reviewController.getReviewsByProperty);

// Get Average Rating of a Property
router.get(
  "/average/:propertyId",
  reviewController.getAverageRatingByPropertyId
);

// Get Average Ratings of All Properties
router.get("/averages", reviewController.getAverageRatingOfAllProperties);

module.exports = router;
