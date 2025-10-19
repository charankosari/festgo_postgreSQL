const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const HomeScreenBanner = sequelize.define(
    "HomeScreenBanner",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      content: {
        type: DataTypes.ARRAY(DataTypes.TEXT),
        allowNull: false,
        defaultValue: [], // It's good practice to provide a default value
      },
    },
    {
      timestamps: true,
      tableName: "home_screen_banners",
    }
  );

  return HomeScreenBanner;
};
