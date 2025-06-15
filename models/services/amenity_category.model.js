const { DataTypes, Model } = require("sequelize");

module.exports = (sequelize) => {
  class AmenityCategory extends Model {}

  AmenityCategory.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      image: {
        type: DataTypes.STRING,
        allowNull: true, // can be null if no image is assigned yet
      },
      categoryName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "AmenityCategory",
      tableName: "amenity_categories",
    }
  );

  return AmenityCategory;
};
