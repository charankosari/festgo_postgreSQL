const { DataTypes, Model } = require("sequelize");

module.exports = (sequelize) => {
  class LoginHistory extends Model {}

  LoginHistory.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      deviceModel: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      deviceBrand: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      osVersion: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      location: {
        type: DataTypes.STRING, // or DataTypes.JSON if storing lat-long etc.
        allowNull: true,
      },
      platform: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      loginTime: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: "LoginHistory",
      tableName: "login_histories",
      timestamps: false, // unless you need createdAt, updatedAt
    }
  );

  return LoginHistory;
};
