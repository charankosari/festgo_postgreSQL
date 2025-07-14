const { DataTypes } = require("sequelize");

module.exports = (sequelize) =>
  sequelize.define("RoomRateInventory", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    propertyId: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    roomId: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    userId: {
      type: DataTypes.UUID,
      allowNull: true, // or false if required
    },

    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },

    inventory: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },

    price: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {
        base: 0, // current base rate
        extra: 0, // extra adult or person charge
        offerBaseRate: 0, // discounted base rate
        offerPlusOne: 0, // discounted extra charge
      },
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  });
