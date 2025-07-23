const { DataTypes, Model } = require("sequelize");

module.exports = (sequelize) => {
  class FestGoCoinHistory extends Model {}

  FestGoCoinHistory.init(
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
      status: {
        type: DataTypes.ENUM("pending", "issued", "expired", "not valid"),
        defaultValue: "pending",
      },
      type: {
        type: DataTypes.ENUM("earned", "used"),
        allowNull: false,
      },
      reason: {
        type: DataTypes.STRING, // eg: 'Purchased Hotel', 'Bought Pass', 'Referred Friend'
        allowNull: false,
      },
      referenceId: {
        type: DataTypes.UUID, // could be propertyId, eventId, bookingId etc
        allowNull: true,
      },
      coins: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      metaData: {
        type: DataTypes.JSONB,
        allowNull: true, // extra optional data like { passName, propertyName, date }
      },
    },
    {
      sequelize,
      modelName: "FestGoCoinHistory",
      tableName: "festgo_coin_histories",
      timestamps: true,
    }
  );

  return FestGoCoinHistory;
};
