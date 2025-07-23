const { DataTypes } = require("sequelize");

module.exports = (sequelize) =>
  sequelize.define(
    "Event",
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

      eventLocation: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      eventType: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      eventDate: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      eventBudget: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      numberOfGuests: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      venueOption: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: {},
      },

      soundSystem: {
        type: DataTypes.JSONB,
        defaultValue: {},
      },

      photography: {
        type: DataTypes.JSONB,
        defaultValue: {},
      },

      additionalThings: {
        type: DataTypes.JSONB,
        defaultValue: [],
      },

      themes: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        defaultValue: [],
      },
      accept: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      eventTypeId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
    },
    {
      timestamps: true,
    }
  );
