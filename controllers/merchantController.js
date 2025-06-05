const asyncHandler = require("../middlewares/asynchandler");
const errorHandler = require("../utils/errorHandler");
const Merchant = require("../models/merchantModel"); // Import the Merchant model
const sendToken = require("../utils/jwttokenSend"); // Utility to send JWT token
const SendEmail = require("../libs/mailgun/mailGun");
const { otpTemplate } = require("../libs/mailgun/mailTemplates");
const crypto = require("crypto"); // Node.js built-in crypto module

// @desc    Register Merchant
// @route   POST /api/v1/merchant/register
// @access  Public
exports.register = asyncHandler(async (req, res, next) => {
  const { username, email, number, password, image_url } = req.body;

  const merchant = await Merchant.create({
    username,
    email,
    number,
    password,
    image_url,
  });
  const message = "Account created successfully";

  sendToken(merchant, 201, message, res);
});

// @desc    Login Merchant
// @route   POST /api/v1/merchant/login
// @access  Public
exports.login = asyncHandler(async (req, res, next) => {
  const { email, number, password } = req.body;

  // Check if email/number and password are entered
  if ((!email && !number) || !password) {
    return next(
      new errorHandler("Please enter Email/Mobile Number & Password", 400)
    );
  }

  let merchant;
  if (email) {
    merchant = await Merchant.findOne({ email }).select("+password");
  } else if (number) {
    merchant = await Merchant.findOne({ number }).select("+password");
  }

  // Check if password is correct
  const isMatch = await merchant.comparePassword(password);

  if (!isMatch) {
    return next(
      new errorHandler("Invalid email/mobile number or password", 401)
    );
  }
  const message = "Account fetched successfully";
  sendToken(merchant, 200, message, res);
});

// @desc    Forgot Password
// @route   POST /api/v1/merchant/forgotpassword
// @access  Public
// exports.forgotPassword = asyncHandler(async (req, res, next) => {
//     const merchant = await Merchant.findOne({ email: req.body.email });

//     if (!merchant) {
//         return next(new errorHandler("Merchant not found with this email", 404));
//     }

//     // Get reset token
//     const resetToken = merchant.getResetPasswordToken();

//     await merchant.save({ validateBeforeSave: false });

//     // Create reset URL
//     const resetUrl = `${req.protocol}://${req.get('host')}/api/v1/merchant/resetpassword/${resetToken}`;

//     const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please make a PUT request to: \n\n ${resetUrl}`;

//     try {
//         await sendEmail({
//             email: merchant.email,
//             subject: 'Password Reset Token',
//             message
//         });

//         res.status(200).json({
//             success: true,
//             data: 'Email Sent'
//         });
//     } catch (err) {
//         merchant.resetPasswordToken = undefined;
//         merchant.resetPasswordExpire = undefined;
//         await merchant.save({ validateBeforeSave: false });

//         return next(new errorHandler(err.message, 500));
//     }
// });

// @desc    Reset Password
// @route   PUT /api/v1/merchant/resetpassword/:token
// @access  Public
exports.resetPassword = asyncHandler(async (req, res, next) => {
  // Get hashed token
  const resetPasswordToken = crypto
    .createHash("sha256")
    .update(req.params.id)
    .digest("hex");

  const merchant = await Merchant.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!merchant) {
    return next(new errorHandler("Invalid or expired token", 400));
  }

  // Set new password
  merchant.password = req.body.password;
  merchant.resetPasswordToken = undefined;
  merchant.resetPasswordExpire = undefined;

  await merchant.save();
  const message = "password updated successfully";
  sendToken(merchant, 200, message, res);
});

// @desc    Get logged in merchant details
// @route   GET /api/v1/merchant/me
// @access  Private
exports.userDetails = asyncHandler(async (req, res, next) => {
  // req.merchant is set by the isAuthorized middleware
  const merchant = await Merchant.findById(req.merchant.id);

  res.status(200).json({
    success: true,
    data: merchant,
  });
});

// @desc    Update Merchant Password
// @route   PUT /api/v1/merchant/password/update
// @access  Private
exports.updatePassword = asyncHandler(async (req, res, next) => {
  const merchant = await Merchant.findById(req.merchant.id).select("+password");
  const { currentPassword, newPassword } = req.body;

  // Check current password
  const isMatch = await merchant.comparePassword(currentPassword);
  console.log(isMatch);
  if (!isMatch) {
    return next(new errorHandler("Current password is incorrect", 401));
  }

  // Set new password
  merchant.password = newPassword;
  await merchant.save();
  const message = "password updated successfully";
  sendToken(merchant, 200, message, res);
});

// @desc    Update Merchant Profile
// @route   PUT /api/v1/merchant/me/profileupdate
// @access  Private
exports.profileUpdate = asyncHandler(async (req, res, next) => {
  const newProfileData = {
    username: req.body.username,
    email: req.body.email,
    number: req.body.number,
    image_url: req.body.image_url,
    // Add other updatable fields here
  };

  const merchant = await Merchant.findByIdAndUpdate(
    req.merchant.id,
    newProfileData,
    {
      new: true,
      runValidators: true,
      useFindAndModify: false,
    }
  );

  res.status(200).json({
    success: true,
    data: merchant,
  });
});

// @desc    Verify Mobile - Generate OTP and send
// @route   POST /api/v1/merchant/verify/mobile
// @access  Private
exports.verifyMobile = asyncHandler(async (req, res, next) => {
  const merchant = await Merchant.findById(req.merchant.id);

  if (!merchant) {
    return next(new errorHandler("Merchant not found", 404));
  }

  // Generate a 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  merchant.mobile_otp = otp;
  await merchant.save({ validateBeforeSave: false });

  // TODO: Integrate actual SMS sending service here
  console.log(`Mobile OTP for ${merchant.number}: ${otp}`); // For testing purposes

  res.status(200).json({
    success: true,
    message: "OTP sent to mobile successfully",
  });
});

// @desc    Check Mobile OTP
// @route   POST /api/v1/merchant/check/mobile/otp
// @access  Private
exports.checkMobileOtp = asyncHandler(async (req, res, next) => {
  const { otp } = req.body;
  const merchant = await Merchant.findById(req.merchant.id).select(
    "+mobile_otp"
  );

  if (!merchant) {
    return next(new errorHandler("Merchant not found", 404));
  }
  if (merchant.mobile_otp === otp) {
    merchant.mobile_verified = true;
    merchant.mobile_otp = null; // Clear OTP after successful verification
    await merchant.save({ validateBeforeSave: false });
    res.status(200).json({
      success: true,
      message: "Mobile verified successfully",
    });
  } else {
    return next(new errorHandler("Invalid Mobile OTP", 400));
  }
});

// @desc    Verify Email - Generate OTP and send
// @route   POST /api/v1/merchant/verify/email
// @access  Private
exports.verifyEmail = asyncHandler(async (req, res, next) => {
  const merchant = await Merchant.findById(req.merchant.id);

  if (!merchant) {
    return next(new errorHandler("Merchant not found", 404));
  }

  // Generate a 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  merchant.email_otp = otp;
  merchant.email_otp_expire = Date.now() + 1 * 60 * 1000;
  await merchant.save({ validateBeforeSave: false });

  const htmlContent = otpTemplate(merchant.username, otp);

  try {
    // Send email via Mailgun
    await SendEmail(merchant.email, "Your Festgo Email OTP", htmlContent);
  } catch (error) {
    console.error("❌ Failed to send email:", error);
    return next(new errorHandler("Failed to send OTP email", 500));
  }

  res.status(200).json({
    success: true,
    message: "OTP sent to email successfully",
  });
});

// @desc    Check Email OTP
// @route   POST /api/v1/merchant/check/email/otp
// @access  Private
exports.checkEmailOtp = asyncHandler(async (req, res, next) => {
  const { otp } = req.body;

  const merchant = await Merchant.findById(req.merchant.id).select(
    "+email_otp +email_otp_expire"
  );

  if (!merchant) {
    return next(new errorHandler("Merchant not found", 404));
  }

  // Check if OTP matches and is not expired
  if (
    merchant.email_otp !== otp ||
    !merchant.email_otp_expire ||
    merchant.email_otp_expire < Date.now()
  ) {
    return next(new errorHandler("Invalid or expired Email OTP", 400));
  }

  // Mark as verified, clear OTP and expiry
  merchant.email_verified = true;
  merchant.email_otp = null;
  merchant.email_otp_expire = null;
  await merchant.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    message: "Email verified successfully",
  });
});

// Login via OTP
exports.loginViaOtp = asyncHandler(async (req, res, next) => {
  const { email, number } = req.body;

  if (!email && !number) {
    return next(
      new errorHandler("Please provide either email or mobile number", 400)
    );
  }

  let merchant;

  if (email) {
    merchant = await Merchant.findOne({ email }).select(
      "+mobile_otp +mobile_otp_expire"
    );

    if (!merchant) {
      return next(new errorHandler("Merchant not found with that email", 404));
    }

    if (!merchant.email_verified) {
      return next(
        new errorHandler(
          "Email is not verified. Please verify your email first.",
          400
        )
      );
    }

    const emailOtp = Math.floor(100000 + Math.random() * 900000).toString();
    merchant.email_otp = emailOtp;
    merchant.email_otp_expire = Date.now() + 10 * 60 * 1000;
    await merchant.save({ validateBeforeSave: false });

    // Send email via Mailgun
    const htmlContent = otpTemplate(merchant.username, emailOtp);
    try {
      await SendEmail(merchant.email, "Your Festgo OTP for Login", htmlContent);
    } catch (error) {
      console.error("❌ Failed to send Email OTP:", error);
      return next(new errorHandler("Failed to send Email OTP", 500));
    }

    res.status(200).json({
      success: true,
      message: "Email OTP sent successfully",
    });
  } else if (number) {
    merchant = await Merchant.findOne({ number }).select(
      "+mobile_otp +mobile_otp_expire"
    );

    if (!merchant) {
      return next(
        new errorHandler("Merchant not found with that mobile number", 404)
      );
    }

    if (!merchant.mobile_verified) {
      return next(
        new errorHandler(
          "Mobile number is not verified. Please verify your mobile first.",
          400
        )
      );
    }

    const mobileOtp = Math.floor(100000 + Math.random() * 900000).toString();
    merchant.mobile_otp = mobileOtp;
    merchant.mobile_otp_expire = Date.now() + 10 * 60 * 1000;
    await merchant.save({ validateBeforeSave: false });

    console.log(`Mobile OTP for ${number}: ${mobileOtp}`);

    res.status(200).json({
      success: true,
      message: "Mobile OTP sent successfully",
    });
  }
});
// Verify Login via OTP
exports.verifyLoginViaOtp = asyncHandler(async (req, res, next) => {
  const { email, number, otp } = req.body;

  if ((!email && !number) || !otp) {
    return next(
      new errorHandler("Please provide email/mobile number and OTP", 400)
    );
  }

  let merchant;
  if (email) {
    merchant = await Merchant.findOne({ email }).select(
      "+email_otp +email_otp_expire"
    );

    console.log(merchant);
    if (!merchant) {
      return next(new errorHandler("Merchant not found with that email", 404));
    }

    // Check if OTP expired
    if (!merchant.email_otp || merchant.email_otp !== otp) {
      return next(new errorHandler("Invalid Email OTP", 400));
    }

    if (merchant.email_otp_expire && merchant.email_otp_expire < Date.now()) {
      merchant.email_otp = null;
      merchant.email_otp_expire = null;
      await merchant.save({ validateBeforeSave: false });
      return next(
        new errorHandler(
          "Email OTP has expired. Please request a new one.",
          400
        )
      );
    }

    merchant.email_otp = null;
    merchant.email_otp_expire = null;
    await merchant.save({ validateBeforeSave: false });
  } else if (number) {
    merchant = await Merchant.findOne({ number }).select(
      "+mobile_otp +mobile_otp_expire"
    );

    if (!merchant) {
      return next(
        new errorHandler("Merchant not found with that mobile number", 404)
      );
    }

    // Check if OTP expired
    if (!merchant.mobile_otp || merchant.mobile_otp !== otp) {
      return next(new errorHandler("Invalid Mobile OTP", 400));
    }

    if (merchant.mobile_otp_expire && merchant.mobile_otp_expire < Date.now()) {
      merchant.mobile_otp = null;
      merchant.mobile_otp_expire = null;
      await merchant.save({ validateBeforeSave: false });
      return next(
        new errorHandler(
          "Mobile OTP has expired. Please request a new one.",
          400
        )
      );
    }

    merchant.mobile_otp = null;
    merchant.mobile_otp_expire = null;
    await merchant.save({ validateBeforeSave: false });
  }

  if (!merchant) {
    return next(new errorHandler("Invalid request", 400));
  }

  const message = "Login successful via OTP";
  sendToken(merchant, 200, message, res);
});
