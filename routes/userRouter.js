const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const wishlistController = require("../controllers/wishlist.controller");
const { isAuthorized, authorizedRoles } = require("../middlewares/auth");
// USER REGISTRATION
router.post("/user/register", (req, res) =>
  userController.registerUser(req, res, "user")
);

// VENDOR REGISTRATION
router.post("/vendor/register", (req, res, next) => {
  userController.registerUser(req, res, "vendor");
});

// LOGIN
router.post("/login", userController.loginUser);

// FORGOT PASSWORD
router.post("/forgot-password", isAuthorized, userController.forgotPassword);

// RESET PASSWORD
router.post("/reset-password/:token", userController.resetPassword);

// UPDATE PASSWORD (logged-in user)
router.put("/update-password", isAuthorized, userController.updatePassword);

// UPDATE PROFILE
router.put("/update-profile", isAuthorized, userController.updateProfile);

// SEND EMAIL OTP
router.post("/send-email-otp", userController.sendEmailOtp);

// VERIFY EMAIL OTP
router.post("/verify-email-otp", userController.verifyEmailOtp);

// SEND MOBILE OTP
router.post("/send-mobile-otp", userController.sendMobileOtp);

// VERIFY MOBILE OTP
router.post("/verify-mobile-otp", userController.verifyMobileOtp);

// LOGIN VIA MOBILE OTP - Send OTP
router.post("/login-via-otp", userController.loginViaOtp);

// VERIFY MOBILE OTP FOR LOGIN
router.post("/verify-login-otp", userController.verifyLoginViaOtp);
// email login
router.post("/register-email", userController.registerEmail);
router.post("/verify-email-token", userController.verifyEmailToken);
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
