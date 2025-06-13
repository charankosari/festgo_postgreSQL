const { DataTypes } = require("sequelize");

module.exports = (sequelize) =>
  sequelize.define(
    "MenuItem",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      itemName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      menuTypeId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      imageUrl: {
        type: DataTypes.STRING,
        allowNull: true, // optional, or false if you want to make image mandatory
      },
    },
    {
      timestamps: true,
    }
  );
