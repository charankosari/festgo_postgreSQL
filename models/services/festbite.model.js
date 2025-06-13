const { DataTypes } = require("sequelize");

module.exports = (sequelize) =>
  sequelize.define(
    "Festbite",
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
      occasionName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      numberOfGuests: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      preferredDate: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      vegMenu: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        defaultValue: [],
      },
      nonVegMenu: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        defaultValue: [],
      },
      deserts: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        defaultValue: [],
      },
      numberOfVegEaters: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      numberOfNonVegEaters: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      eventLocation: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      cateringService: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      timestamps: true,
    }
  );
