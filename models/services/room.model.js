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
    description: DataTypes.TEXT,
    sleeping_arrangement: {
      type: DataTypes.JSONB,
      defaultValue: {
        base_adults: 0,
        max_adults: 0,
        max_children: 0,
        max_occupancy: 0,
        max_extra_beds: 0,
      },
    },
    bathroom_available: DataTypes.INTEGER,
    // newly added things
    price: {
      type: DataTypes.JSONB,
      defaultValue: {
        base_price_for_2_adults: 0,
        extra_adult_charge: 0,
        child_charge: 0,
      },
    },
    max_adults: DataTypes.INTEGER,
    max_children: DataTypes.INTEGER,
    free_cancellation: DataTypes.STRING,
    additional_info: DataTypes.STRING,
    //end
    meal_plan: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    // rates: DataTypes.FLOAT,
    inventory_details: DataTypes.STRING,

    room_amenities: {
      type: DataTypes.JSONB,
      defaultValue: [],
      // [{ roomAmenityId, value }]
    },

    // ... inside your Room.js model definition

    photos: {
      type: DataTypes.JSONB, // CORRECT TYPE
      defaultValue: [],
    },

    videos: {
      type: DataTypes.JSONB, // CORRECT TYPE
      defaultValue: [],
    },

    // ...
  });
