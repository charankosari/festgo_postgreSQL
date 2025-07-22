const { DataTypes, Model } = require("sequelize");

module.exports = (sequelize) => {
  class FestgoCoinToIssue extends Model {}

  FestgoCoinToIssue.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      booking_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
      },

      userId: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      referral_id: {
        type: DataTypes.STRING,
        allowNull: true, // Optional: useful for referral-based logic
      },

      sourceType: {
        type: DataTypes.ENUM(
          "beachfest",
          "event",
          "trip",
          "festbite",
          "cityfest",
          "property",
          "user"
        ),
        allowNull: false,
      },

      sourceId: {
        type: DataTypes.UUID,
        allowNull: true, // Optional: booking ID, fest ID, etc.
      },

      coinsToIssue: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      status: {
        type: DataTypes.ENUM("pending", "issued", "expired", "cancelled"),
        defaultValue: "pending",
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
      issueAt: {
        type: DataTypes.DATE, // 🕒 When to issue the coins
        allowNull: true,
      },
      issuedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      issue: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      metaData: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "FestgoCoinToIssue",
      tableName: "festgo_coin_to_issue",
      timestamps: true,
    }
  );

  return FestgoCoinToIssue;
};
