const { DataTypes, Model } = require("sequelize");

module.exports = (sequelize) => {
  class PropertyVisit extends Model {}

  PropertyVisit.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      vendor_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      property_ids: {
        type: DataTypes.ARRAY(DataTypes.UUID), // array of UUIDs
        defaultValue: [],
      },
      visits: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
    },
    {
      sequelize,
      modelName: "property_visit",
      tableName: "property_visit",
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ["vendor_id"],
        },
      ],
    }
  );

  return PropertyVisit;
};
