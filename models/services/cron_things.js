const { DataTypes, Model } = require("sequelize");

module.exports = (sequelize) => {
  class CronThing extends Model {}

  CronThing.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      entity: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      active: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      last_run: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "CronThing",
      tableName: "cron_things",
      timestamps: true, // you can remove this if you don’t need createdAt, updatedAt
    }
  );

  return CronThing;
};
