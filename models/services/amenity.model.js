const { DataTypes, Model } = require("sequelize");

module.exports = (sequelize) => {
  class Amenity extends Model {}

  Amenity.init(
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
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      type: {
        type: DataTypes.ENUM("BOOLEAN", "MULTI"),
        allowNull: false,
      },
      image: {
        type: DataTypes.STRING,
        allowNull: true, // can be null if no image is assigned yet
      },
      options: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "Amenity",
      tableName: "amenities",
    }
  );

  return Amenity;
};
