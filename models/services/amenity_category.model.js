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
