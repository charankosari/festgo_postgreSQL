const { Model, DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  class FestgoCoinUsageLimit extends Model {}

  FestgoCoinUsageLimit.init(
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      festbite: {
        type: DataTypes.JSON,
        defaultValue: {
          transaction_limit: 0,
          monthly_limit: 0,
        },
      },
      event: {
        type: DataTypes.JSON,
        defaultValue: {
          transaction_limit: 0,
          monthly_limit: 0,
        },
      },
      allother: {
        type: DataTypes.JSON,
        defaultValue: {
          transaction_limit: 0,
          monthly_limit: 0,
        },
      },
    },
    {
      sequelize,
      tableName: "festgo_coin_usage_limits",
      timestamps: true,
    }
  );

  return FestgoCoinUsageLimit;
};
