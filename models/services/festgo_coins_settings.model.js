const { Model, DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  /**
   * @class FestgoCoinSetting
   * @classdesc This model stores the rules and limits for FestGo Coin usage
   * and earnings for different service types, configurable by an administrator.
   * Each row represents a rule for a specific service.
   */
  class FestgoCoinSetting extends Model {}

  FestgoCoinSetting.init(
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      type: {
        type: DataTypes.ENUM(
          "event",
          "property",
          "beach_fest",
          "city_fest",
          "festbite",
          "user_referral"
        ),
        allowNull: false,
      },

      monthly_limit_value: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      single_transaction_limit_value: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0,
      },
      monthly_referral_limit: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      coins_per_referral: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.0,
      },
      coins_earned_per_booking: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0.0,
      },
    },
    {
      sequelize,
      tableName: "festgo_coin_settings",
      timestamps: true,
    }
  );

  return FestgoCoinSetting;
};
