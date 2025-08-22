const { DataTypes, Model } = require("sequelize");

module.exports = (sequelize) => {
  class PlanMyTrips extends Model {}

  PlanMyTrips.init(
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
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      number: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      travelType: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      totalPersons: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      referralId: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      from: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      destination: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      amenities: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: true,
      },
      hotelCategory: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM("pending", "hold", "cancelled", "accepted"),
        allowNull: false,
        defaultValue: "pending",
      },
      festgo_coins_used: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
      },
      coins_discount_value: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
      },
    },
    {
      sequelize,
      modelName: "PlanMyTrips",
      tableName: "PlanMyTrips",
    }
  );

  return PlanMyTrips;
};
