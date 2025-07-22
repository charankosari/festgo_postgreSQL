const { DataTypes, Model } = require("sequelize");

module.exports = (sequelize) => {
  class FestgoCoinTransaction extends Model {}

  FestgoCoinTransaction.init(
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
      type: {
        type: DataTypes.ENUM(
          "event_referral",
          "festbite_referral",
          "beachfest_referral",
          "property_recommend",
          "cityfest_referral",
          "trip_referral",
          "user_referral",
          "login_bonus"
        ),
        allowNull: false,
      },
      amount: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      remaining: {
        type: DataTypes.INTEGER, // track remaining coins from this transaction
        allowNull: false,
      },
      monthlyRefillDate: {
        type: DataTypes.DATE,
        allowNull: true,
      },

      CurrentMonthCount: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "FestgoCoinTransaction",
      tableName: "festgo_coin_transactions",
      timestamps: true,
    }
  );

  return FestgoCoinTransaction;
};
