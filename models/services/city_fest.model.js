const { DataTypes, Model } = require("sequelize");

module.exports = (sequelize) => {
  class CityFest extends Model {}

  CityFest.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      categoryId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      location: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      available_passes: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      total_passes: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      price_per_pass: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      event_start: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      event_end: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      highlights: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      image_urls: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: true,
      },
      gmap_url: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      whats_included: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "CityFest",
      tableName: "city_fests",
      timestamps: true,
    }
  );

  return CityFest;
};
