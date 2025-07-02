const { DataTypes, Model } = require("sequelize");

module.exports = (sequelize) => {
  class ContactMessage extends Model {}

  ContactMessage.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      firstName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      lastName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      number: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      subject: {
        type: DataTypes.STRING,
        // allowNull: false,
      },
      message: {
        type: DataTypes.STRING,
        // allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "ContactMessage",
      tableName: "contact_messages",
      timestamps: true,
    }
  );

  return ContactMessage;
};
