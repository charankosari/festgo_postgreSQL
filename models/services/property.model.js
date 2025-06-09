const { DataTypes } = require("sequelize");

module.exports = (sequelize) =>
  sequelize.define("Property", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    vendorId: {
      type: DataTypes.UUID,
      allowNull: false,
    },

    name: DataTypes.STRING,
    property_type: DataTypes.STRING,
    email: DataTypes.STRING,
    star_rating: DataTypes.INTEGER,
    property_built_date: DataTypes.DATE,
    accepting_bookings_since: DataTypes.DATE,
    mobile_number: DataTypes.STRING,
    landline_number: DataTypes.STRING,

    current_step: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    in_progress: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    is_completed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },

    location: {
      type: DataTypes.JSONB, // latitude, longitude, address etc.
      defaultValue: {},
    },

    // Amenities selected by this property
    amenities: {
      type: DataTypes.JSONB, // [{ amenityId, value }]
      defaultValue: [],
    },

    // Policies selected by this property
    policies: {
      type: DataTypes.JSONB, // [{ policyId, value }]
      defaultValue: [],
    },

    // Rooms list
    rooms: {
      type: DataTypes.JSONB,
      defaultValue: [],
      // Example of each room structure:
      /*
      [
        {
          room_type: "Deluxe",
          view: "Sea View",
          area: "350 sqft",
          room_name: "Ocean Suite",
          number_of_rooms: 5,
          description: "Spacious suite with ocean view",
          max_people: 3,
          sleeping_arrangement: "1 King Bed",
          bathroom_details: "Private Bathroom",
          meal_plans: ["Breakfast Included"],
          rates: 3500,
          inventory_details: "Available on demand",
          room_amenities: [
            { roomAmenityId: "id", value: true },
            { roomAmenityId: "id", value: "Available" }
          ],
          photos: [{"url":"url1",tag:"","url":"url2",tag:""}],
          videos: [{"url":"url1",tag:"","url":"url2",tag:""}]
        }
      ]
      */
    },

    photos: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
    },

    videos: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
    },

    ownership_details: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
  });
