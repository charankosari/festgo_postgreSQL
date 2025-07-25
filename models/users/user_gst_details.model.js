const { DataTypes, Model } = require("sequelize");

module.exports = (sequelize) => {
  class UserGstDetails extends Model {}

  UserGstDetails.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      gst_number: {
        type: DataTypes.STRING(15),
        allowNull: true,
        validate: {
          len: [15, 15],
        },
      },
      gst_company_name: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      gst_company_address: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      property_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "UserGstDetails",
      tableName: "user_gst_details",
      timestamps: true,
    }
  );

  return UserGstDetails;
};
