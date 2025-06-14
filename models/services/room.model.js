const { DataTypes } = require("sequelize");

module.exports = (sequelize) =>
  sequelize.define("Room", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    propertyId: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    room_type: DataTypes.STRING,
    view: DataTypes.STRING,
    area: DataTypes.STRING,
    room_name: DataTypes.STRING,
    number_of_rooms: DataTypes.INTEGER,
    available_rooms: DataTypes.INTEGER, // ✅ new field added
    description: DataTypes.TEXT,
    max_people: DataTypes.INTEGER,
    sleeping_arrangement: DataTypes.STRING,
    bathroom_details: DataTypes.STRING,

    meal_plans: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
    },

    rates: DataTypes.FLOAT,
    inventory_details: DataTypes.STRING,

    room_amenities: {
      type: DataTypes.JSONB,
      defaultValue: [],
      // [{ roomAmenityId, value }]
    },

    photos: {
      type: DataTypes.ARRAY(DataTypes.JSONB),
      defaultValue: [],
      // Example: [{ url: 'url1', tag: '' }]
    },

    videos: {
      type: DataTypes.ARRAY(DataTypes.JSONB),
      defaultValue: [],
      // Example: [{ url: 'url1', tag: '' }]
    },
  });
