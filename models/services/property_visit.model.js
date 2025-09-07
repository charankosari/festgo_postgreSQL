const { DataTypes } = require("sequelize");

const PropertyVisit = sequelize.define(
  "property_visit",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    property_id: { type: DataTypes.INTEGER, allowNull: false },
    vendor_id: { type: DataTypes.INTEGER, allowNull: false },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
  },
  {
    timestamps: true,
  }
);
module.exports = PropertyVisit;
