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
      imageUrl: {
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
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: true,
      },
      pricing: {
        type: DataTypes.JSONB,
        allowNull: false,
      },
      pickupLocation: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      inclusions: {
        type: DataTypes.ARRAY(DataTypes.STRING),
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
