const { DataTypes } = require("sequelize");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

module.exports = (sequelize) => {
  const User = sequelize.define(
    "User",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      firstname: { type: DataTypes.STRING, allowNull: true },
      lastname: { type: DataTypes.STRING, allowNull: true },
      location: { type: DataTypes.STRING, allowNull: true },
      username: { type: DataTypes.STRING, allowNull: true },
      email: { type: DataTypes.STRING, allowNull: true, unique: true },
      number: { type: DataTypes.STRING, allowNull: true, unique: true },
      password: { type: DataTypes.STRING, allowNull: true },
      image_url: { type: DataTypes.STRING, defaultValue: "" },
      date_of_birth: { type: DataTypes.DATEONLY, allowNull: true },
      gender: { type: DataTypes.STRING, allowNull: true },
      email_otp: { type: DataTypes.STRING, defaultValue: null },
      mobile_otp: { type: DataTypes.STRING, defaultValue: null },
      mobile_verified: { type: DataTypes.BOOLEAN, defaultValue: false },
      email_verified: { type: DataTypes.BOOLEAN, defaultValue: false },
      role: { type: DataTypes.STRING, allowNull: false },
      status: { type: DataTypes.STRING, defaultValue: "active" },
      email_otp_expire: { type: DataTypes.DATE, defaultValue: null },
      mobile_otp_expire: { type: DataTypes.DATE, defaultValue: null },
      resetPasswordToken: { type: DataTypes.STRING, defaultValue: null },
      resetPasswordExpire: { type: DataTypes.DATE, defaultValue: null },
      logintype: { type: DataTypes.STRING, defaultValue: null },
      // festgo_coins: { type: DataTypes.INTEGER, defaultValue: 0 },
      pincode: { type: DataTypes.STRING, defaultValue: null },
      state: { type: DataTypes.STRING, defaultValue: null },
      referralCode: {
        type: DataTypes.STRING(10),
        unique: true,
      },
      billing_address: { type: DataTypes.STRING, defaultValue: null },
      token: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      tokenExpire: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      timestamps: true,
      tableName: "users",
    }
  );
  function generateReferralCode() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "FG-";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
  User.beforeCreate(async (user) => {
    if (user.password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(user.password, salt);
    }
  });
  User.beforeCreate(async (user, options) => {
    if (user.role === "user") {
      let code;
      let exists = true;
      while (exists) {
        code = generateReferralCode();
        const existingUser = await User.findOne({
          where: { referralCode: code },
        });
        if (!existingUser) exists = false;
      }
      user.referralCode = code;
      // user.festgo_coins = 2000;
    }
  });

  User.prototype.comparePassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
  };

  User.prototype.getSignedJwtToken = function () {
    return jwt.sign({ id: this.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE,
    });
  };

  User.prototype.getResetPasswordToken = function () {
    const resetToken = crypto.randomBytes(20).toString("hex");
    this.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;
    return resetToken;
  };

  return User;
};
