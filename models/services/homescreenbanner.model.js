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
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
          notEmpty: {
            msg: "Content cannot be empty",
          },
        },
      },
    },
    {
      timestamps: true,
      tableName: "home_screen_banners",
    }
  );

  return HomeScreenBanner;
};
