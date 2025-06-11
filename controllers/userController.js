const { User } = require("../models/users");

const sendToken = require("../utils/jwttokenSend");
const sendEmail = require("../libs/mailgun/mailGun");
const { sendSMS } = require("../libs/sms/sms");
const { loginOtpTemplate } = require("../libs/sms/messageTemplates");
const { Op } = require("sequelize");

const crypto = require("crypto");
const {
  otpTemplate,
  changePasswordTemplate,
  SignupEmail,
} = require("../libs/mailgun/mailTemplates");
const path = require("path");
const dotenv = require("dotenv");
// Load environment variables
dotenv.config({ path: path.resolve("./config/config.env") });
function safeUser(user, extraFieldsToExclude = [], includeFields = []) {
  if (!user) return null;

  const data = user.toJSON ? user.toJSON() : { ...user };

  const defaultExcludedFields = [
    "password",
    "email_otp",
    "mobile_otp",
    "email_otp_expire",
    "mobile_otp_expire",
    "resetPasswordToken",
    "resetPasswordExpire",
    "signupTokenExpire",
    "signupToken",
  ];

  // remove any fields that are in defaultExcludedFields + extraFieldsToExclude,
  // unless they’re in includeFields
  const fieldsToExclude = [
    ...defaultExcludedFields,
    ...extraFieldsToExclude,
  ].filter((field) => !includeFields.includes(field));

  fieldsToExclude.forEach((field) => delete data[field]);

  return data;
}

exports.registerUser = async (req, res, roleType) => {
  try {
    const { username, email, number, password } = req.body;

    const existingUser = await User.findOne({
      where: {
        [Op.or]: [{ email }, { number }],
      },
    });

    if (existingUser)
      return res.status(400).json({ message: "User already exists" });

    const user = await User.create({
      username,
      email,
      number,
      password,
      role: roleType,
    });
    const message = "Registration successfull";
    const su = safeUser(user);
    sendToken(su, 201, message, res);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Login
exports.loginUser = async (req, res) => {
  const { email, number, password } = req.body;

  if ((!email && !number) || !password) {
    return res
      .status(400)
      .json({ message: "Please provide email/number and password" });
  }

  // Find user by email or number
  const user = await User.findOne({
    where: email ? { email } : { number },
  });

  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const message = "Login successful";
  const cleanUser = safeUser(user);
  sendToken(cleanUser, 200, message, res);
};

// Forgot Password
exports.forgotPassword = async (req, res) => {
  const user = await User.findOne({ where: { email: req.body.email } });
  if (!user) return res.status(404).json({ message: "User not found" });

  const resetToken = user.getResetPasswordToken();
  await user.save();

  const resetUrl = `${process.env.RESET_URL}/?token=${resetToken}`;

  // Create HTML email template
  const htmlContent = changePasswordTemplate(user.username, resetUrl);

  try {
    await sendEmail(user.email, "Festgo Password Reset", htmlContent);

    res.status(200).json({
      success: true,
      data: "Password reset email sent",
    });
  } catch (err) {
    merchant.resetPasswordToken = undefined;
    merchant.resetPasswordExpire = undefined;
    await merchant.save({ validateBeforeSave: false });

    return next(new errorHandler("Failed to send email. " + err.message, 500));
  }
};

// Reset Password
exports.resetPassword = async (req, res) => {
  const resetPasswordToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    where: {
      resetPasswordToken,
      resetPasswordExpire: { [Op.gt]: Date.now() },
    },
  });

  if (!user)
    return res.status(400).json({ message: "Invalid or expired token" });

  user.password = req.body.password;
  user.resetPasswordToken = null;
  user.resetPasswordExpire = null;
  await user.save();

  sendToken(user, 200, res);
};

// Update Password
exports.updatePassword = async (req, res) => {
  const user = await User.findByPk(req.user.id);
  const isMatch = await user.comparePassword(req.body.oldPassword);
  if (!isMatch)
    return res.status(401).json({ message: "Incorrect old password" });

  user.password = req.body.newPassword;
  await user.save();
  sendToken(user, 200, res);
};

// Update Profile
exports.updateProfile = async (req, res) => {
  const fields = ["username", "email", "number", "image_url"];
  const updateData = {};
  fields.forEach((field) => {
    if (req.body[field]) updateData[field] = req.body[field];
  });

  await User.update(updateData, { where: { id: req.user.id } });
  res.status(200).json({ message: "Profile updated" });
};

// Send Email OTP
exports.sendEmailOtp = async (req, res) => {
  const user = await User.findOne({ where: { email: req.body.email } });
  if (!user) return res.status(404).json({ message: "User not found" });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  user.email_otp = otp;
  user.email_otp_expire = Date.now() + 10 * 60 * 1000;
  await user.save();

  const htmlContent = otpTemplate(user.username, otp);

  try {
    // Send email via Mailgun
    await sendEmail(user.email, "Your Festgo Email OTP", htmlContent);
  } catch (error) {
    console.error("❌ Failed to send email:", error);
    return next(new errorHandler("Failed to send OTP email", 500));
  }
  res.status(200).json({ message: "OTP sent to email" });
};

// Verify Email OTP
exports.verifyEmailOtp = async (req, res) => {
  const user = await User.findOne({ where: { email: req.body.email } });
  if (
    !user ||
    user.email_otp !== req.body.otp ||
    Date.now() > user.email_otp_expire
  )
    return res.status(400).json({ message: "Invalid or expired OTP" });

  user.email_verified = true;
  user.email_otp = null;
  user.email_otp_expire = null;
  await user.save();

  res.status(200).json({ message: "Email verified successfully" });
};

// Send Mobile OTP
exports.sendMobileOtp = async (req, res) => {
  try {
    const user = await User.findOne({ where: { number: req.body.number } });
    if (!user) return res.status(404).json({ message: "User not found" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.mobile_otp = otp;
    user.mobile_otp_expire = Date.now() + 10 * 60 * 1000;
    await user.save();

    const message = loginOtpTemplate(otp);

    const smsResponse = await sendSMS(user.number, message);

    if (smsResponse.status === "failed") {
      console.error("SMS sending failed:", smsResponse.error);
      return res.status(500).json({ message: "Failed to send OTP via SMS" });
    }

    console.log("OTP sent:", otp);
    res.status(200).json({ message: "OTP sent to mobile number" });
  } catch (error) {
    console.error("Error sending mobile OTP:", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Verify Mobile OTP
exports.verifyMobileOtp = async (req, res) => {
  const user = await User.findOne({ where: { number: req.body.number } });
  if (
    !user ||
    user.mobile_otp !== req.body.otp ||
    Date.now() > user.mobile_otp_expire
  )
    return res.status(400).json({ message: "Invalid or expired OTP" });

  user.mobile_verified = true;
  user.mobile_otp = null;
  user.mobile_otp_expire = null;
  await user.save();

  res.status(200).json({ message: "Mobile verified successfully" });
};

// Login via OTP (send OTP)
exports.loginViaOtp = async (req, res) => {
  const user = await User.findOne({ where: { number: req.body.number } });
  if (!user) return res.status(404).json({ message: "User not found" });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  user.mobile_otp = otp;
  user.mobile_otp_expire = Date.now() + 10 * 60 * 1000;
  await user.save();

  const message = loginOtpTemplate(otp);

  const smsResponse = await sendSMS(user.number, message);
  if (smsResponse.status === "failed") {
    console.error("SMS sending failed:", smsResponse.error);
    return res.status(500).json({ message: "Failed to send OTP via SMS" });
  }

  console.log("OTP sent:", otp);
  res.status(200).json({ message: "OTP sent to mobile number" });
};

// Verify Login via OTP
exports.verifyLoginViaOtp = async (req, res) => {
  const user = await User.findOne({ where: { number: req.body.number } });
  if (
    !user ||
    user.mobile_otp !== req.body.otp ||
    Date.now() > user.mobile_otp_expire
  )
    return res.status(400).json({ message: "Invalid or expired OTP" });

  user.mobile_otp = null;
  user.mobile_otp_expire = null;
  await user.save();
  const message = "Login successfull";
  sendToken(user, 200, message, res);
};
exports.getUserDetails = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Use the safeUser utility to clean sensitive fields
    const cleanUser = safeUser(user);

    res.status(200).json({
      success: true,
      user: cleanUser,
    });
  } catch (error) {
    console.error("Error fetching user details:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
exports.registerEmail = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required" });

  try {
    let user = await User.findOne({ where: { email } });
    if (!user) {
      user = await User.create({
        email,
        role: "user",
      });
    }
    // Generate signup token
    const signupToken = crypto.randomBytes(32).toString("hex");
    const tokenExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Update user record
    user.signupToken = signupToken;
    user.signupTokenExpire = tokenExpire;
    await user.save();

    // Send Email
    const verificationLink = `${process.env.APP_DEEP_LINK}?token=${signupToken}`;
    await sendEmail(
      email,
      "Activate your account",
      SignupEmail(verificationLink)
    );

    res.status(200).json({ message: "Verification email sent successfully" });
  } catch (err) {
    console.error("Error in registerEmail:", err);
    res.status(500).json({ message: "Something went wrong" });
  }
};

exports.verifyEmailToken = async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ message: "Token is required" });

  try {
    // Find user by token
    const user = await User.findOne({ where: { signupToken: token } });

    if (!user || user.signupTokenExpire < new Date()) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    // Mark email as verified, clear signupToken fields
    user.email_verified = true;
    user.signupToken = null;
    user.signupTokenExpire = null;
    await user.save();

    const message = "Registration successful";
    const cleanUser = safeUser(user);
    sendToken(cleanUser, 200, message, res);
  } catch (err) {
    console.error("Error in verifyEmailToken:", err);
    res.status(500).json({ message: "Something went wrong" });
  }
};
