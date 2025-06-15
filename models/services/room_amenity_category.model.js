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
      image: {
        type: DataTypes.STRING,
        allowNull: true, // can be null if no image is assigned yet
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
