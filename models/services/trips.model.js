const { DataTypes, Model } = require("sequelize");

module.exports = (sequelize) => {
  class Trips extends Model {}

  Trips.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      tripName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      startDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      endDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      numberOfDays: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      highlights: {
        type: DataTypes.ARRAY(DataTypes.STRING), // stores ["beach visit", "hiking", "campfire"]
        allowNull: true,
      },
      pricing: {
        type: DataTypes.JSONB, // { "4": 2000, "8": 3500, "16": 6000 }
        allowNull: false,
      },
      pickupLocation: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      inclusions: {
        type: DataTypes.ARRAY(DataTypes.STRING), // ["meals", "transport", "guide"]
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "Trips",
      tableName: "Trips",
    }
  );

  return Trips;
};
