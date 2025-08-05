const {
  User,
  LoginHistory,
  FestgoCoinTransaction,
  ReferralHistory,
  UserGstDetails,
} = require("../models/users");
const {
  property_booking,
  beachfests_booking,
  Event,
  FestgoCoinSetting,
  Offers,
} = require("../models/services");
const { Sequelize, where } = require("sequelize");
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
const {
  createInitialFestgoTransaction,
  issueUserReferralCoins,
  calculateFestgoCoins,
} = require("../utils/issueCoins"); // Adjust the path if needed

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
    "tokenExpire",
    "token",
    "billing_address",
    "pincode",
    "state",

    "referralCode",
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
const offerCount = async () => {
  const now = new Date(); // Correct format
  const oc = await Offers.count({
    where: {
      bookingWindowStart: { [Op.lte]: now },
      bookingWindowEnd: { [Op.gte]: now },
    },
  });
  return oc;
};

const handleUserReferral = async (referral_id, referredId) => {
  try {
    const referrer = await User.findOne({
      where: { referralCode: referral_id },
    });
    if (!referrer || referrer.id === referredId) return;

    const setting = await FestgoCoinSetting.findOne({
      where: { type: "user_referral" },
    });
    if (!setting || setting.monthly_referral_limit <= 0) return;

    // Month calculation based on referrer’s account creation
    const createdAt = new Date(referrer.createdAt);
    const current = new Date();

    const monthsSinceCreated =
      (current.getFullYear() - createdAt.getFullYear()) * 12 +
      (current.getMonth() - createdAt.getMonth());

    const monthStart = new Date(
      createdAt.getFullYear(),
      createdAt.getMonth() + monthsSinceCreated,
      1
    );
    const monthEnd = new Date(
      createdAt.getFullYear(),
      createdAt.getMonth() + monthsSinceCreated + 1,
      0,
      23,
      59,
      59
    );

    const referralsThisMonth = await ReferralHistory.count({
      where: {
        referrerId: referrer.id,
        createdAt: { [Op.between]: [monthStart, monthEnd] },
      },
    });

    if (referralsThisMonth >= setting.monthly_referral_limit) return;

    const coinsToGive = Number(setting.coins_per_referral) || 0;

    if (coinsToGive <= 0) return;

    await issueUserReferralCoins({
      referrerId: referrer.id,
      referredId,
      coins: coinsToGive,
    });
  } catch (err) {
    console.error("Error in handleUserReferral:", err);
  }
};
const checkAndIssueLoginBonus = async (userId) => {
  try {
    const existingBonus = await FestgoCoinTransaction.findOne({
      where: {
        userId,
        type: "login_bonus", // or `type: 'login_bonus'` depending on your schema
      },
    });

    if (!existingBonus) {
      await createInitialFestgoTransaction(userId);
      console.log(`Login bonus issued to user: ${userId}`);
    } else {
      console.log(`Login bonus already exists for user: ${userId}`);
    }
  } catch (error) {
    console.error("Error checking/issuing login bonus:", error);
  }
};

exports.registerUser = async (req, res, roleType) => {
  try {
    const { userName, username, email, number, password } = req.body;

    const existingUser = await User.findOne({
      where: {
        [Op.or]: [{ email }, { number }],
      },
    });

    if (existingUser)
      return res.status(400).json({ message: "User already exists" });
    const finalUsername =
      userName?.trim() !== ""
        ? userName
        : username?.trim() !== ""
        ? username
        : "vendor";
    const user = await User.create({
      username: finalUsername,
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
  // Allowed roles for this login route
  const allowedRoles = ["vendor", "admin"];

  if (!allowedRoles.includes(user.role)) {
    return res.status(400).json({
      message: `This email is registered as a ${user.role}, not allowed to login here`,
      status: 400,
    });
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
  const displayName = user.username ? user.username : user;
  const htmlContent = changePasswordTemplate(displayName, resetUrl);

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
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(req.body.password, salt);
  user.password = hashedPassword;
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
    const loginType = user.logintype;
    if (user.role === "user") {
      if (
        (loginType === "gmail" ||
          loginType === "facebook" ||
          loginType === "email") &&
        "email" in req.body &&
        req.body.email.trim() === ""
      ) {
        return res.status(400).json({
          message: "Email cannot be empty ",
          status: 400,
        });
      }

      if (
        loginType === "mobile" &&
        "number" in req.body &&
        req.body.number.trim() === ""
      ) {
        return res.status(400).json({
          message: "Mobile number cannot be empty ",
          status: 400,
        });
      }
    }
    // Build update data based on allowed fields
    const updateData = {};
    fields.forEach((field) => {
      const value = req.body[field];

      if (value !== undefined) {
        updateData[field] = value;
      }
    });

    // Debug: log what is being updated

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
  const user = await User.findByPk(req.user.id);
  if (!user) return res.status(404).json({ message: "User not found" });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  user.email_otp = otp;
  user.email_otp_expire = Date.now() + 10 * 60 * 1000;
  await user.save();

  const htmlContent = otpTemplate(user.username || "User", otp);

  try {
    // Send email via Mailgun
    await sendEmail(req.body.email, "Your Festgo Email OTP", htmlContent);
  } catch (error) {
    console.error("❌ Failed to send email:", error);
    return next(new errorHandler("Failed to send OTP email", 500));
  }
  res.status(200).json({ message: "OTP sent to email" });
};

// Verify Email OTP
exports.verifyEmailOtp = async (req, res) => {
  const user = await User.findByPk(req.user.id);
  if (
    !user ||
    user.email_otp !== req.body.otp ||
    Date.now() > user.email_otp_expire
  )
    return res.status(400).json({ message: "Invalid or expired OTP" });

  user.email_otp = null;
  user.email_otp_expire = null;
  await user.save();

  res.status(200).json({ message: "Email verified successfully" });
};

// Send Mobile OTP
exports.sendMobileOtp = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.mobile_otp = otp;
    user.mobile_otp_expire = Date.now() + 10 * 60 * 1000;
    await user.save();

    const message = loginOtpTemplate(otp);

    const smsResponse = await sendSMS(req.body.number, message);

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
  const user = await User.findByPk(req.user.id);
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
  // Allowed roles for this login route
  const allowedRoles = ["vendor", "admin"];

  if (!allowedRoles.includes(user.role)) {
    return res.status(400).json({
      message: `This email is registered as a ${user.role}, not allowed to login here`,
      status: 400,
    });
  }

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

    let cleanUser;

    if (user.role === "user") {
      // 📌 Clean user data
      cleanUser = safeUser(
        user,
        ["username"],
        ["billing_address", "pincode", "state", "referralCode"]
      );

      // 📌 Fetch property bookings count (confirmed only)
      const propertyBookingsCount = await property_booking.count({
        where: { user_id: userId, booking_status: "confirmed" },
      });

      // 📌 Fetch beachfest bookings count (confirmed only)
      const beachfestBookingsCount = await beachfests_booking.count({
        where: { user_id: userId, booking_status: "confirmed" },
      });
      const eventsCount = await Event.count({
        where: { userId: userId },
      });
      // 📌 Sum total bookings count
      const bookingsCount =
        propertyBookingsCount + beachfestBookingsCount + eventsCount;
      const loginHistory = await LoginHistory.findAll({
        where: { userId: userId },
        order: [["loginTime", "DESC"]],
      });
      const gst_details = await UserGstDetails.findAll({
        where: { userId: user.id },
      });
      const festgoCoins = await calculateFestgoCoins(userId);
      cleanUser.festgo_coins = festgoCoins;
      cleanUser.loginHistories = loginHistory;
      cleanUser.bookingsCount = bookingsCount;
      cleanUser.gst_details = gst_details;
    } else {
      cleanUser = safeUser(user, [
        "firstname",
        "lastname",
        "gender",
        "location",
        "date_of_birth",
      ]);
    }
    // 📌 Profile completion percentage calculation
    const fieldsToCheck = [
      "firstname",
      "lastname",
      "location",
      "email",
      "number",
      "image_url",
      "date_of_birth",
      "gender",
      "pincode",
      "state",
      "billing_address",
    ];

    const totalFields = fieldsToCheck.length;

    let filledFields = 0;

    fieldsToCheck.forEach((field) => {
      if (user[field] !== null && user[field] !== "") {
        filledFields++;
      }
    });

    const profileCompletion = Math.round((filledFields / totalFields) * 100);

    // 📌 Attach profile completion to cleanUser object
    cleanUser.profileCompletion = profileCompletion;
    cleanUser.offers = await offerCount();

    // 📌 Final response
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
  const {
    email,
    image_url,
    firstname,
    lastname,
    deviceModel,
    deviceBrand,
    osVersion,
    location,
    platform,
  } = req.body;
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
        if (user.role !== "user") {
          return res.status(400).json({
            message: "Email already registered with a different role",
            status: 400,
          });
        }

        // Log login history
        await LoginHistory.create({
          userId: user.id,
          deviceModel,
          deviceBrand,
          osVersion,
          location,
          platform,
          loginTime: new Date(),
        });

        const loginHistories = await LoginHistory.findAll({
          where: { userId: user.id },
          order: [["loginTime", "DESC"]],
        });
        const gst_details = await UserGstDetails.findAll({
          where: { userId: user.id },
        });
        const cleanUser = safeUser(
          user,
          ["username"],
          ["billing_address", "pincode", "state", "referralCode"]
        );
        const festgoCoins = await calculateFestgoCoins(user.id);
        cleanUser.festgo_coins = festgoCoins;
        cleanUser.loginHistories = loginHistories;
        cleanUser.gst_details = gst_details;
        cleanUser.offers = await offerCount();
        const message = "Login successful";
        return sendToken(cleanUser, 201, message, res);
      }

      // If user doesn't exist, create
      user = await User.create({
        email,
        role: "user",
        status: "active",
        image_url,
        firstname,
        lastname,
        logintype: loginType,
      });
      await checkAndIssueLoginBonus(user.id);

      if (req.body.referral_id && req.body.referral_id.trim() !== "") {
        await handleUserReferral(req.body.referral_id, user.id);
      }

      // Log login history
      await LoginHistory.create({
        userId: user.id,
        deviceModel,
        deviceBrand,
        osVersion,
        location,
        platform,
        loginTime: new Date(),
      });

      const loginHistories = await LoginHistory.findAll({
        where: { userId: user.id },
        order: [["loginTime", "DESC"]],
      });
      const gst_details = await UserGstDetails.findAll({
        where: { userId: user.id },
      });
      const cleanUser = safeUser(
        user,
        ["username"],
        ["billing_address", "pincode", "state", "referralCode"]
      );
      const festgoCoins = await calculateFestgoCoins(user.id);
      cleanUser.festgo_coins = festgoCoins;
      cleanUser.loginHistories = loginHistories;
      cleanUser.gst_details = gst_details;
      cleanUser.offers = await offerCount();
      const message = "Login successful";
      return sendToken(cleanUser, 201, message, res);
    }

    // Email link login
    if (loginType === "email") {
      user = await User.findOne({ where: { email } });

      const token = crypto.randomBytes(32).toString("hex");
      const tokenExpire = new Date(Date.now() + 10 * 60 * 1000);

      if (user) {
        if (user.role !== "user") {
          return res.status(400).json({
            message: "Email already registered with a different role",
            status: 400,
          });
        }

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
      await checkAndIssueLoginBonus(user.id);
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

    if (loginType === "mobile") {
      user = await User.findOne({ where: { number: email } });

      const otp =
        email === "9666666666"
          ? "000000"
          : Math.floor(100000 + Math.random() * 900000).toString();

      const otpExpire = Date.now() + 10 * 60 * 1000;

      if (user) {
        if (user.role !== "user") {
          return res.status(400).json({
            message: "Email already registered with a different role",
            status: 400,
          });
        }

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
      await checkAndIssueLoginBonus(user.id);
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
  const { token, deviceModel, deviceBrand, osVersion, location, platform } =
    req.body;
  if (!token)
    return res.status(400).json({ message: "Token is required", status: 400 });

  try {
    // Find user by token
    const user = await User.findOne({ where: { token } });

    if (!user)
      return res
        .status(400)
        .json({ message: "Invalid link or user not found", status: 400 });
    if (user.role !== "user") {
      return res.status(400).json({
        message: "Email already registered with a different role",
        status: 400,
      });
    }
    if (user.tokenExpire < new Date())
      return res.status(400).json({ message: "Link has expired", status: 400 });
    if (
      req.body.referral_id &&
      req.body.referral_id.trim() !== "" &&
      user.status === "pending" &&
      ["email", "mobile"].includes(user.logintype)
    ) {
      await handleUserReferral(req.body.referral_id, user.id);
    }

    // Mark email as verified, clear token fields
    user.token = null;
    user.tokenExpire = null;
    user.email_verified = true;
    user.status = "active";
    await user.save();
    await LoginHistory.create({
      userId: user.id,
      deviceModel,
      deviceBrand,
      osVersion,
      location,
      platform,
      loginTime: new Date(),
    });
    const loginHistories = await LoginHistory.findAll({
      where: { userId: user.id },
      order: [["loginTime", "DESC"]],
    });
    const gst_details = await UserGstDetails.findAll({
      where: { userId: user.id },
    });

    const message = "Registration successful";
    const cleanUser = safeUser(
      user,
      ["username"],
      ["billing_address", "pincode", "state", "referralCode"]
    );
    const festgoCoins = await calculateFestgoCoins(user.id);
    cleanUser.festgo_coins = festgoCoins;
    cleanUser.loginHistories = loginHistories;
    cleanUser.gst_details = gst_details;
    cleanUser.offers = await offerCount();
    sendToken(cleanUser, 200, message, res);
  } catch (err) {
    console.error("Error in verifyEmailToken:", err);
    res.status(500).json({ message: "Something went wrong", status: 500 });
  }
};
exports.verifyOtp = async (req, res) => {
  const {
    number,
    otp,
    deviceModel,
    deviceBrand,
    osVersion,
    location,
    platform,
  } = req.body;

  const user = await User.findOne({ where: { number } });

  if (!user)
    return res.status(400).json({ message: "User not found", status: 400 });

  if (user.role !== "user") {
    return res.status(400).json({
      message: "Number already registered with a different role",
      status: 400,
    });
  }

  if (
    !user.mobile_otp ||
    user.mobile_otp !== otp ||
    Date.now() > user.mobile_otp_expire
  )
    return res
      .status(400)
      .json({ message: "Invalid or expired OTP", status: 400 });
  if (
    req.body.referral_id &&
    req.body.referral_id.trim() !== "" &&
    user.status === "pending" &&
    ["email", "mobile"].includes(user.logintype)
  ) {
    await handleUserReferral(req.body.referral_id, user.id);
  }

  // Update user mobile verification status
  user.mobile_otp = null;
  user.mobile_otp_expire = null;
  user.mobile_verified = true;
  user.status = "active";
  await user.save();

  // Save login history
  await LoginHistory.create({
    userId: user.id,
    deviceModel,
    deviceBrand,
    osVersion,
    location,
    platform,
    loginTime: new Date(),
  });

  // Fetch latest login histories
  const loginHistories = await LoginHistory.findAll({
    where: { userId: user.id },
    order: [["loginTime", "DESC"]],
  });
  const gst_details = await UserGstDetails.findAll({
    where: { userId: user.id },
  });
  // Clean user for response
  const cleanUser = safeUser(
    user,
    ["username"],
    ["billing_address", "pincode", "state", "referralCode"]
  );
  cleanUser.loginHistories = loginHistories;
  cleanUser.gst_details = gst_details;
  cleanUser.offers = await offerCount();
  const festgoCoins = await calculateFestgoCoins(user.id);
  cleanUser.festgo_coins = festgoCoins;
  const message = "Login successful";
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
