const { DataTypes, Model } = require("sequelize");

module.exports = (sequelize) => {
  class CityFestCategory extends Model {}

  CityFestCategory.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      image: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "CityFestCategory",
      tableName: "city_fest_categories",
      timestamps: true,
    }
  );

  return CityFestCategory;
};
