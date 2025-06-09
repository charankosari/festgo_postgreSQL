const { DataTypes, Model } = require("sequelize");

module.exports = (sequelize) => {
  class RoomAmenityCategory extends Model {}

  RoomAmenityCategory.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      categoryName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "RoomAmenityCategory",
      tableName: "room_amenity_categories",
    }
  );

  return RoomAmenityCategory;
};
