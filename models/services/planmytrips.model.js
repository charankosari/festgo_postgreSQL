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
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      number: {
        type: DataTypes.STRING, // can store phone numbers like "+91..."
        allowNull: false,
      },
      travelType: {
        type: DataTypes.STRING, // solo, family, group etc.
        allowNull: false,
      },
      totalPersons: {
        type: DataTypes.INTEGER, // total number of persons traveling
        allowNull: false,
        defaultValue: 1,
      },
      date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      referralId: {
        type: DataTypes.STRING, // if you want foreign key, can change to UUID later
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
        type: DataTypes.ARRAY(DataTypes.STRING), // e.g. ["wifi", "pool", "gym"]
        allowNull: true,
      },
      hotelCategory: {
        type: DataTypes.STRING, // e.g. "3-star", "luxury", "budget"
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
