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
    cuisines: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
    },
    name: DataTypes.STRING,
    property_type: DataTypes.STRING,
    email: DataTypes.STRING,
    star_rating: DataTypes.INTEGER,
    property_built_date: DataTypes.DATE,
    accepting_bookings_since: DataTypes.DATE,
    mobile_number: DataTypes.STRING,
    landline_number: DataTypes.STRING,
    channelManagerName: DataTypes.STRING,
    sameAsWhatsapp: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    channelManager: DataTypes.BOOLEAN,
    current_step: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    description: DataTypes.TEXT,
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
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    photos: {
      type: DataTypes.JSONB, // Correct type for an array of objects
      defaultValue: [],
    },

    videos: {
      type: DataTypes.JSONB, // Correct type for an array of objects
      defaultValue: [],
    },

    ownership_details: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
    bank_details: {
      type: DataTypes.JSONB, // accountNumber, ifscCode, bankName, etc.
      defaultValue: {},
    },

    tax_details: {
      type: DataTypes.JSONB, // hasGSTIN, gstin, pan, hasTAN, tan
      defaultValue: {},
    },

    consent: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },

    review_count: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    strdata: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
  });
