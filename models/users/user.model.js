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
      username: { type: DataTypes.STRING, allowNull: true },
      email: { type: DataTypes.STRING, allowNull: true, unique: true },
      number: { type: DataTypes.STRING, allowNull: true, unique: true },
      password: { type: DataTypes.STRING, allowNull: true },
      image_url: { type: DataTypes.STRING, defaultValue: "" },
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
      signupToken: { type: DataTypes.STRING, defaultValue: null },
      signupTokenExpire: { type: DataTypes.DATE, defaultValue: null },
    },
    {
      timestamps: true,
      tableName: "users",
    }
  );

  User.beforeCreate(async (user) => {
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(user.password, salt);
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
