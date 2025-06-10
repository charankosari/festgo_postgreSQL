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

      numberOfGuests: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },

      venueOption: {
        type: DataTypes.JSONB,
        allowNull: false,
        // Example: { needVenue: true, venueName: "" } OR { needVenue: false, venueName: "Existing Venue" }
        defaultValue: {},
      },

      soundSystem: {
        type: DataTypes.JSONB,
        // Example: { required: true, systemName: "" } OR { required: false, systemName: "XYZ Audio Setup" }
        defaultValue: {},
      },

      photography: {
        type: DataTypes.JSONB,
        // Example: { required: true, photographerName: "" } OR { required: false, photographerName: "Lens King" }
        defaultValue: {},
      },

      additionalThings: {
        type: DataTypes.JSONB,
        // Example: { ledScreens: true, fireworks: false, liveDJ: true }
        defaultValue: {},
      },

      themes: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        defaultValue: [],
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
