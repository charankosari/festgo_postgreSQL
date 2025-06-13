const { DataTypes } = require("sequelize");

module.exports = (sequelize) =>
  sequelize.define(
    "MenuType",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      typeName: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true, // like "Veg Menu", "Non Veg Menu", "Deserts"
      },
    },
    {
      timestamps: true,
    }
  );
