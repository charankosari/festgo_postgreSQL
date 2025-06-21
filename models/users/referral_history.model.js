const { DataTypes, Model } = require("sequelize");

module.exports = (sequelize) => {
  class ReferralHistory extends Model {}

  ReferralHistory.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      referrerId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      referredId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      coinsAwarded: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
      },
      referralNote: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "ReferralHistory",
      tableName: "referral_histories",
      timestamps: true,
    }
  );

  return ReferralHistory;
};
