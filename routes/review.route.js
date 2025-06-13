const express = require("express");
const router = express.Router();
const reviewController = require("../controllers/review.controller");
const { isAuthorized } = require("../middlewares/auth");

// Create Review
router.post("/reviews", isAuthorized, reviewController.createReview);

// Update Review
router.put("/reviews/:id", isAuthorized, reviewController.updateReview);

// Delete Review
router.delete("/reviews/:id", isAuthorized, reviewController.deleteReview);

// Get All Reviews
router.get("/reviews", reviewController.getAllReviews);

// Get Reviews by Property
router.get(
  "/reviews/property/:propertyId",
  reviewController.getReviewsByProperty
);

// Get Average Rating of a Property
router.get(
  "/reviews/average/:propertyId",
  reviewController.getAverageRatingByPropertyId
);

// Get Average Ratings of All Properties
router.get(
  "/reviews/averages",
  reviewController.getAverageRatingOfAllProperties
);

module.exports = router;
