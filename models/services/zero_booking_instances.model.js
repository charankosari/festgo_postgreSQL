const { DataTypes, Model } = require("sequelize");
module.exports = (sequelize) => {
  class zeroBookingInstances extends Model {}
  zeroBookingInstances.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      property_booking_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      instance: {
        type: DataTypes.JSONB,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "zeroBookingInstances",
      tableName: "zero_booking_instances",
    }
  );
  return zeroBookingInstances;
};
