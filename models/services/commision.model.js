const { DataTypes, Model } = require("sequelize");

module.exports = (sequelize) => {
  class Commission extends Model {}

  Commission.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      commission: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: 0,
          max: 100,
        },
      },
    },
    {
      sequelize,
      modelName: "Commission",
      tableName: "commission",
      timestamps: true,
    }
  );

  return Commission;
};
