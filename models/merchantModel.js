const mongoose = require("mongoose");
const bcrypt = require("bcryptjs"); // Import bcrypt for password hashing
const jwt = require("jsonwebtoken"); // Import jsonwebtoken for tokens

const merchantSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    number: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false, // Don't return password by default
    },
    image_url: {
      type: String,
      default: "",
    },
    is_authorized: {
      type: Boolean,
      default: false,
    },
    email_otp: {
      type: String,
      default: null,
      select: false,
    },
    mobile_otp: {
      type: String,
      default: null,
      select: false,
    },
    mobile_verified: {
      type: Boolean,
      default: false,
    },
    email_verified: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      default: "merchant",
    },
    email_otp_expire: {
      type: Date,
      default: null,
      select: false,
    },
    mobile_otp_expire: {
      type: Date,
      default: null,
      select: false,
    },
    // Add the properties field to store IDs of properties owned by this merchant
    properties: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Property", // Assuming your Property model is named 'Property'
      },
    ],
    resetPasswordToken: String,
    resetPasswordExpire: Date,
  },
  { timestamps: true }
);

// Encrypt password before saving
merchantSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare user password
merchantSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate JWT Token
merchantSchema.methods.getSignedJwtToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

// Generate and hash password token
merchantSchema.methods.getResetPasswordToken = function () {
  // Generate token
  const resetToken = crypto.randomBytes(20).toString("hex");

  // Hash token and set to resetPasswordToken field
  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // Set expire
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

  return resetToken;
};

const Merchant = mongoose.model("Merchant", merchantSchema);

module.exports = Merchant;
