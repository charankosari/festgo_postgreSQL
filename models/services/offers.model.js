const { Model, DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  class Offer extends Model {}

  Offer.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      vendorId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      type: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      discount: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      bookingWindowStart: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      bookingWindowEnd: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      stayDatesStart: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      stayDatesEnd: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      promoCode: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      entityIds: {
        type: DataTypes.ARRAY(DataTypes.STRING), // Could be property IDs, event IDs, etc.
        allowNull: false,
        defaultValue: [],
      },
      entityNames: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: false,
        defaultValue: [],
      },

      offerFor: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          isIn: [["property", "event", "beach_fests", "city_fests"]],
        },
      },

      description: {
        type: DataTypes.TEXT,
      },

      from: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          isIn: [["admin", "vendor"]],
        },
      },
    },
    {
      sequelize,
      modelName: "Offer",
      tableName: "offers",
      timestamps: true,
    }
  );

  return Offer;
};
