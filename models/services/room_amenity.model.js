const { DataTypes, Model } = require("sequelize");

module.exports = (sequelize) => {
  class RoomAmenity extends Model {}

  RoomAmenity.init(
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
      image: {
        type: DataTypes.STRING,
        allowNull: true, // can be null if no image is assigned yet
      },
      type: {
        type: DataTypes.ENUM("BOOLEAN", "MULTI"),
        allowNull: false,
      },
      options: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "RoomAmenity",
      tableName: "room_amenities",
    }
  );

  return RoomAmenity;
};
