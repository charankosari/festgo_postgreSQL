const asyncHandler = require("../middlewares/asynchandler");
const errorHandler = require("../utils/errorHandler");
const Merchant = require("../models/merchantModel"); // Import the Merchant model
const sendToken = require("../utils/jwttokenSend"); // Utility to send JWT token
// const sendEmail = require("../utils/sendEmail"); // Utility to send emails
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
        image_url
    });
    const message="Account created successfully"

    sendToken(merchant, 201,message, res);
});

// @desc    Login Merchant
// @route   POST /api/v1/merchant/login
// @access  Public
exports.login = asyncHandler(async (req, res, next) => {
    const { email, password } = req.body;

    // Check if email and password are entered
    if (!email || !password) {
        return next(new errorHandler("Please enter Email & Password", 400));
    }

    // Find merchant by email and select password
    const merchant = await Merchant.findOne({ email }).select('+password');

    if (!merchant) {
        return next(new errorHandler("Invalid email or password", 401));
    }

    // Check if password is correct
    const isMatch = await merchant.comparePassword(password);

    if (!isMatch) {
        return next(new errorHandler("Invalid email or password", 401));
    }

    sendToken(merchant, 200, res);
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
    const resetPasswordToken = crypto.createHash('sha256').update(req.params.id).digest('hex');

    const merchant = await Merchant.findOne({
        resetPasswordToken,
        resetPasswordExpire: { $gt: Date.now() }
    });

    if (!merchant) {
        return next(new errorHandler("Invalid or expired token", 400));
    }

    // Set new password
    merchant.password = req.body.password;
    merchant.resetPasswordToken = undefined;
    merchant.resetPasswordExpire = undefined;

    await merchant.save();

    sendToken(merchant, 200, res);
});


// @desc    Get logged in merchant details
// @route   GET /api/v1/merchant/me
// @access  Private
exports.userDetails = asyncHandler(async (req, res, next) => {
    // req.merchant is set by the isAuthorized middleware
    const merchant = await Merchant.findById(req.merchant.id);

    res.status(200).json({
        success: true,
        data: merchant
    });
});

// @desc    Update Merchant Password
// @route   PUT /api/v1/merchant/password/update
// @access  Private
exports.updatePassword = asyncHandler(async (req, res, next) => {
    const merchant = await Merchant.findById(req.merchant.id).select('+password');

    // Check current password
    const isMatch = await merchant.comparePassword(req.body.currentPassword);

    if (!isMatch) {
        return next(new errorHandler("Current password is incorrect", 401));
    }

    // Set new password
    merchant.password = req.body.newPassword;
    await merchant.save();

    sendToken(merchant, 200, res);
});

// @desc    Update Merchant Profile
// @route   PUT /api/v1/merchant/me/profileupdate
// @access  Private
exports.profileUpdate = asyncHandler(async (req, res, next) => {
    const newProfileData = {
        username: req.body.username,
        email: req.body.email,
        number: req.body.number,
        image_url: req.body.image_url
        // Add other updatable fields here
    };

    const merchant = await Merchant.findByIdAndUpdate(req.merchant.id, newProfileData, {
        new: true,
        runValidators: true,
        useFindAndModify: false
    });

    res.status(200).json({
        success: true,
        data: merchant
    });
});