const express = require("express");
const router = express.Router();
const { isAuthorized, roleAuthorize } = require("../middlewares/auth");
const merchantController = require("../controllers/merchantController");
const propertyController = require("../controllers/propertyController");
const adminController = require("../controllers/adminController");
router.route("/register").post(merchantController.register);
router.route("/login").post(merchantController.login);
// router.route("/forgotpassword").post(merchantController.forgotPassword);
router.route("/resetpassword/:id").post(merchantController.resetPassword);
router.route("/me").get(isAuthorized, merchantController.userDetails);
router
  .route("/password/update")
  .put(isAuthorized, merchantController.updatePassword);
router
  .route("/me/profileupdate")
  .put(isAuthorized, merchantController.profileUpdate);
router
  .route("/verify/mobile")
  .post(
    isAuthorized,
    roleAuthorize("merchant"),
    merchantController.verifyMobile
  );
router
  .route("/check/mobile/otp")
  .post(
    isAuthorized,
    roleAuthorize("merchant"),
    merchantController.checkMobileOtp
  );
router
  .route("/verify/email")
  .post(
    isAuthorized,
    roleAuthorize("merchant"),
    merchantController.verifyEmail
  );
router
  .route("/check/email/otp")
  .post(
    isAuthorized,
    roleAuthorize("merchant"),
    merchantController.checkEmailOtp
  );
router.route("/login/otp").post(merchantController.loginViaOtp);
router.route("/login/otp/verify").post(merchantController.verifyLoginViaOtp);
// property routes
router.post(
  "/properties",
  isAuthorized,
  roleAuthorize("merchant"),
  propertyController.createProperty
);
router.get(
  "/properties",
  isAuthorized,
  roleAuthorize("merchant"),
  propertyController.getAllProperties
);
router.get(
  "/properties/:id",
  isAuthorized,
  roleAuthorize("merchant"),
  propertyController.getPropertyById
);
router.put(
  "/properties/:id",
  isAuthorized,
  roleAuthorize("merchant"),
  propertyController.updateProperty
);
router.delete(
  "/properties/:id",
  isAuthorized,
  roleAuthorize("merchant"),
  propertyController.deleteProperty
);
// amenity routes with merchant role
router.get(
  "/amenities",
  isAuthorized,
  roleAuthorize("merchant", "admin"),
  adminController.getAmenitiesByCategory
);
router.get(
  "/roomamenities",
  isAuthorized,
  roleAuthorize("merchant", "admin"),
  adminController.getRoomAmenitiesByCategory
);
module.exports = router;
