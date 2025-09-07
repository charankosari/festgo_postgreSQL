const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const propertyController = require("../controllers/property.controller");
const wishlistController = require("../controllers/wishlist.controller");
const { isAuthorized, authorizedRoles } = require("../middlewares/auth");
// USER REGISTRATION not required
router.post("/user/register", (req, res) =>
  userController.registerUser(req, res, "user")
);

// VENDOR REGISTRATION
router.post("/vendor/register", (req, res, next) => {
  userController.registerUser(req, res, "vendor");
});

// LOGIN vendor
router.post("/login", userController.loginUser);

// FORGOT PASSWORD vendor
router.post("/forgot-password", userController.forgotPassword);

// RESET PASSWORD vendor
router.post("/reset-password/:token", userController.resetPassword);

// UPDATE PASSWORD vendor
router.put("/update-password", isAuthorized, userController.updatePassword);

// UPDATE PROFILE anyone
router.put("/update-profile", isAuthorized, userController.updateProfile);

// SEND EMAIL OTP vendor
router.post("/send-email-otp", isAuthorized, userController.sendEmailOtp);

// VERIFY EMAIL OTP vendor
router.post("/verify-email-otp", isAuthorized, userController.verifyEmailOtp);

// SEND MOBILE OTP vendor
router.post("/send-mobile-otp", isAuthorized, userController.sendMobileOtp);

// VERIFY MOBILE OTP vendor
router.post("/verify-mobile-otp", isAuthorized, userController.verifyMobileOtp);

// LOGIN VIA MOBILE OTP - Send OTP vendor
router.post("/login-via-otp", userController.loginViaOtp);

// VERIFY MOBILE OTP FOR LOGIN vendor
router.post("/verify-login-otp", userController.verifyLoginViaOtp);
// user login
router.post("/userlogin", userController.loginWithEmailOrMobile);
router.post("/verify-email", userController.verifyEmailToken);
router.post("/verify-otp", userController.verifyOtp);
// router.post("/auth/google", userController.googleAuth);
// get user details
router.get("/me", isAuthorized, userController.getUserDetails);

// wishlist.routes.js
// ✅ Create a wishlist item
router.post("/wishlist", isAuthorized, wishlistController.createWishlist);

// ✅ Get all wishlist items for logged-in user
router.get("/wishlist", isAuthorized, wishlistController.getWishlist);

// ✅ Update wishlist item (usually type)
router.put(
  "/wishlist/:id",
  isAuthorized,
  wishlistController.updateWishlistItem
);

// ✅ Delete a wishlist item by ID
router.delete(
  "/wishlist/:id",
  isAuthorized,
  wishlistController.deleteWishlistItem
);
router.get(
  "/user/referals",
  isAuthorized,
  authorizedRoles("user"),
  userController.getSentReferrals
);
router.get(
  "/user/transactions",
  isAuthorized,
  authorizedRoles("user"),
  userController.getCoinsTransactionsHistory
);
router.delete(
  "/user/delete",
  isAuthorized,
  authorizedRoles("user", "admin"),
  userController.deleteUserById
);
router.get(
  "/merchant-dashboard/metrics",
  isAuthorized,
  authorizedRoles("vendor"),
  propertyController.getDashboardMetrics
);
module.exports = router;
