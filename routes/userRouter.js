const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
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

// get user details
router.get("/me", isAuthorized, userController.getUserDetails);
module.exports = router;
