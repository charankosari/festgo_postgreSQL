const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Wishlist = sequelize.define(
    "wishlist_t",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      wishlisted_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      type: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      timestamps: true,
      tableName: "wishlist_t",
    }
  );

  return Wishlist;
};
