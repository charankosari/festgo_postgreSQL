const { User } = require("../models/users");
const { Sequelize } = require("sequelize");
const sendToken = require("../utils/jwttokenSend");
const sendEmail = require("../libs/mailgun/mailGun");
const { sendSMS } = require("../libs/sms/sms");
const { loginOtpTemplate } = require("../libs/sms/messageTemplates");
const { Op } = require("sequelize");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const {
  otpTemplate,
  changePasswordTemplate,
  SignupEmail,
} = require("../libs/mailgun/mailTemplates");
const path = require("path");
const dotenv = require("dotenv");
const sendJwt = require("../utils/jwttokenSend");

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
    "tokenExpire",
    "token",
    "billing_address",
    "pincode",
    "state",
    "festgo_coins",
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
  const cleanUser = safeUser(user, [
    "firstname",
    "lastname",
    "gender",
    "billing_details",
    "location",
    "date_of_birth",
  ]);
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
  const message = "password reset successfully";
  sendToken(user, 200, message, res);
};

// Update Password
exports.updatePassword = async (req, res) => {
  const user = await User.findByPk(req.user.id);
  const isMatch = await user.comparePassword(req.body.oldPassword);
  if (!isMatch)
    return res.status(401).json({ message: "Incorrect old password" });
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(req.body.newPassword, salt);
  user.password = hashedPassword;
  await user.save();
  const message = "password updated successfully";
  sendToken(user, 200, message, res);
};

exports.updateProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found", status: 404 });
    }

    // Define allowed fields based on user role
    let fields = [];

    if (user.role === "user") {
      fields = [
        "firstname",
        "lastname",
        "gender",
        "date_of_birth",
        "location",
        "billing_address",
        "pincode",
        "state",
        "email",
        "number",
        "image_url",
      ];
    } else {
      fields = ["username", "email", "number", "image_url"];
    }

    // Build update data based on allowed fields
    const updateData = {};
    fields.forEach((field) => {
      if (req.body[field] !== undefined) updateData[field] = req.body[field];
    });

    // Debug: log what is being updated
    console.log("Updating fields:", updateData);

    if (Object.keys(updateData).length > 0) {
      await user.update(updateData);
    }

    res.status(200).json({
      message: "Profile updated successfully",
      status: 200,
    });
  } catch (err) {
    if (err instanceof Sequelize.UniqueConstraintError) {
      const field = err.errors[0].path;
      return res.status(400).json({
        message: `${field} already in use`,
        status: 400,
      });
    }
    console.error("Error in updateProfile:", err);
    res.status(500).json({
      message: "Something went wrong",
      status: 500,
    });
  }
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
  const cleanuser = safeUser(user, [
    "firstname",
    "lastname",
    "gender",
    "billing_details",
    "location",
    "date_of_birth",
  ]);
  sendToken(cleanuser, 200, message, res);
};
exports.getUserDetails = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        status: 404,
      });
    }

    if (user.role === "user") {
      cleanUser = safeUser(
        user,
        ["username"],
        ["billing_address", "pincode", "state", "festgo_coins"]
      );
    } else {
      cleanUser = safeUser(user, [
        "firstname",
        "lastname",
        "gender",
        "location",
        "date_of_birth",
      ]);
    }
    res.status(200).json({
      success: true,
      user: cleanUser,
      status: 200,
    });
  } catch (error) {
    console.error("Error fetching user details:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error",
      status: 500,
    });
  }
};

// for user login or signup with email or number
exports.loginWithEmailOrMobile = async (req, res) => {
  const { email, image_url, firstname, lastname } = req.body;
  const loginType = req.body.loginType?.toLowerCase();

  if (!email || !loginType) {
    return res
      .status(400)
      .json({ message: "Email and loginType are required", status: 400 });
  }

  try {
    let user;

    if (["gmail", "facebook"].includes(loginType)) {
      user = await User.findOne({ where: { email } });

      if (user) {
        const cleanUser = safeUser(
          user,
          ["username"],
          ["billing_address", "pincode", "state", "festgo_coins"]
        );
        const message = "Login successfull";
        sendToken(cleanUser, 201, message, res);
      } else {
        user = await User.create({
          email,
          role: "user",
          status: "pending",
          image_url,
          firstname,
          lastname,
          logintype: loginType,
        });

        const cleanUser = safeUser(
          user,
          ["username"],
          ["billing_address", "pincode", "state", "festgo_coins"]
        );
        const message = "Login successfull";
        sendToken(cleanUser, 201, message, res);
      }
    }

    // Email link login
    if (loginType === "email") {
      user = await User.findOne({ where: { email } });

      const token = crypto.randomBytes(32).toString("hex");
      const tokenExpire = new Date(Date.now() + 10 * 60 * 1000);

      if (user) {
        user.token = token;
        user.tokenExpire = tokenExpire;
        await user.save();
      } else {
        user = await User.create({
          email,
          role: "user",
          status: "pending",
          image_url,
          firstname,
          lastname,
          token,
          tokenExpire,
          logintype: loginType,
        });
      }

      const verificationLink = `${process.env.APP_DEEP_LINK}?token=${token}`;
      await sendEmail(
        email,
        "Your FestGo Login Link",
        SignupEmail(verificationLink)
      );

      return res
        .status(200)
        .json({ message: "Email login link sent", status: 200 });
    }

    // Mobile login
    if (loginType === "mobile") {
      user = await User.findOne({ where: { number: email } });

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpire = Date.now() + 10 * 60 * 1000;

      if (user) {
        user.mobile_otp = otp;
        user.mobile_otp_expire = otpExpire;
        await user.save();
      } else {
        user = await User.create({
          number: email,
          role: "user",
          status: "pending",
          image_url,
          firstname,
          logintype: loginType,
          lastname,
          mobile_otp: otp,
          mobile_otp_expire: otpExpire,
        });
      }

      const message = loginOtpTemplate(otp);
      const smsResponse = await sendSMS(user.number, message);

      if (smsResponse.status === "failed") {
        console.error("SMS sending failed:", smsResponse.error);
        return res
          .status(500)
          .json({ message: "Failed to send OTP via SMS", status: 500 });
      }

      return res
        .status(200)
        .json({ message: "OTP sent to mobile number", status: 200 });
    }

    // Invalid loginType
    return res.status(400).json({ status: 400, message: "Invalid loginType" });
  } catch (err) {
    console.error("Error in loginWithEmailOrMobile:", err);
    res.status(500).json({ message: "Something went wrong", status: 500 });
  }
};

exports.verifyEmailToken = async (req, res) => {
  const { token } = req.body;
  if (!token)
    return res.status(400).json({ message: "Token is required", status: 400 });

  try {
    // Find user by token
    const user = await User.findOne({ where: { token } });

    if (!user)
      return res
        .status(400)
        .json({ message: "Invalid link or user not found", status: 400 });

    if (user.tokenExpire < new Date())
      return res.status(400).json({ message: "Link has expired", status: 400 });

    // Mark email as verified, clear token fields
    user.token = null;
    user.tokenExpire = null;
    user.email_verified = true;
    user.status = "active";
    await user.save();

    const message = "Registration successful";
    const cleanUser = safeUser(
      user,
      ["username"],
      ["billing_address", "pincode", "state", "festgo_coins"]
    );
    sendToken(cleanUser, 200, message, res);
  } catch (err) {
    console.error("Error in verifyEmailToken:", err);
    res.status(500).json({ message: "Something went wrong", status: 500 });
  }
};
exports.verifyOtp = async (req, res) => {
  const user = await User.findOne({ where: { number: req.body.number } });
  if (
    !user ||
    user.mobile_otp !== req.body.otp ||
    Date.now() > user.mobile_otp_expire
  )
    return res
      .status(400)
      .json({ message: "Invalid or expired OTP", status: 400 });

  user.mobile_otp = null;
  user.mobile_otp_expire = null;
  user.mobile_verified = true;
  user.status = "active";
  await user.save();
  const cleanUser = safeUser(
    user,
    ["username"],
    ["billing_address", "pincode", "state", "festgo_coins"]
  );
  const message = "Login successfull";
  sendToken(cleanUser, 200, message, res);
};
// login and signup with google

// exports.googleAuth = async (req, res, next) => {
//   const { token } = req.body;

//   if (!token) {
//     return next(new errorHandler("Google token is required", 400));
//   }

//   let ticket;
//   try {
//     // Verify the token using Google client
//     ticket = await client.verifyIdToken({
//       idToken: token,
//       audience: process.env.GOOGLE_CLIENT_ID,
//     });
//   } catch (error) {
//     return next(new errorHandler("Invalid Google token", 400));
//   }

//   const payload = ticket.getPayload();
//   const { email, given_name, family_name, picture } = payload;
//   // Check if user already exists in PostgreSQL DB
//   let user = await User.findOne({ where: { email } });
//   let message = "";

//   if (user) {
//     message = "Google authentication successful";
//     const cleanUser = safeUser(user, ["username"], ["billing_details"]);
//     return sendJwt(cleanUser, 200, message, res);
//   }

//   // Create new user in PostgreSQL
//   user = await User.create({
//     email,
//     firstname: given_name,
//     lastname: family_name,
//     image_url: picture,
//     role: "user",
//     email_verified: true,
//   });
//   const cleanUser = safeUser(user, ["username"], ["billing_details"]);
//   message = "Google authentication successful (new user)";
//   return sendJwt(cleanUser, 200, message, res);
// };
