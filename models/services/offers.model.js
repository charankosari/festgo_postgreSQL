const { Model, DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  class Offer extends Model {}

  Offer.init(
    {
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
      propertyNames: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: false,
        defaultValue: [],
      },
      selectedPropertyIds: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: false,
        defaultValue: [],
      },
      description: {
        type: DataTypes.TEXT,
      },
      from: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          isIn: [["admin", "merchant"]],
        },
      },
    },
    {
      sequelize,
      modelName: "Offer",
      tableName: "offers",
      timestamps: true,
      underscored: true,
    }
  );

  return Offer;
};
