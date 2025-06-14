const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
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
router.post("/forgot-password", isAuthorized, userController.forgotPassword);

// RESET PASSWORD vendor
router.post("/reset-password/:token", userController.resetPassword);

// UPDATE PASSWORD vendor
router.put("/update-password", isAuthorized, userController.updatePassword);

// UPDATE PROFILE anyone
router.put("/update-profile", isAuthorized, userController.updateProfile);

// SEND EMAIL OTP vendor
router.post("/send-email-otp", userController.sendEmailOtp);

// VERIFY EMAIL OTP vendor
router.post("/verify-email-otp", userController.verifyEmailOtp);

// SEND MOBILE OTP vendor
router.post("/send-mobile-otp", userController.sendMobileOtp);

// VERIFY MOBILE OTP vendor
router.post("/verify-mobile-otp", userController.verifyMobileOtp);

// LOGIN VIA MOBILE OTP - Send OTP vendor
router.post("/login-via-otp", userController.loginViaOtp);

// VERIFY MOBILE OTP FOR LOGIN vendor
router.post("/verify-login-otp", userController.verifyLoginViaOtp);
// user login
router.post("/userlogin", userController.loginWithEmailOrMobile);
router.post("/verify-email", userController.verifyEmailToken);
router.post("/verify-otp", userController.verifyOtp);
// get user details
router.get("/me", isAuthorized, userController.getUserDetails);

// wishlist.routes.js
// ✅ Create a wishlist item
router.post("/", isAuthorized, wishlistController.createWishlist);

// ✅ Get all wishlist items for logged-in user
router.get("/", isAuthorized, wishlistController.getWishlist);

// ✅ Update wishlist item (usually type)
router.put("/:id", isAuthorized, wishlistController.updateWishlistItem);

// ✅ Delete a wishlist item by ID
router.delete("/:id", isAuthorized, wishlistController.deleteWishlistItem);
module.exports = router;
