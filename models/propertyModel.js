const mongoose = require('mongoose');
const roomAmenitySchema = new mongoose.Schema({
    category: { type: String, required: true },
    name: { type: String, required: true },
    type: { type: String, enum: ['BOOLEAN', 'MULTI'], required: true },
    options: [String],
    value: mongoose.Schema.Types.Mixed
  }, { _id: false });
  const roomSchema = new mongoose.Schema({
    room_type: String,
    view: String,
    area: String,
    room_name: String,
    number_of_rooms: Number,
    description: String,
    max_people: Number,
    sleeping_arrangement: String,
    bathroom_details: String,
    meal_plans: [String],
    rates: Number,
    inventory_details: String,
    amenities: [roomAmenitySchema],
    photos: [String],
    videos: [String]
  }, { _id: false });
  const amenitySchema = new mongoose.Schema({
    category: { type: String, required: true },
    name: { type: String, required: true },
    type: { type: String, enum: ['BOOLEAN', 'MULTI'], required: true },
    options: [String],
    value: mongoose.Schema.Types.Mixed
  }, { _id: false });
  const policySchema = new mongoose.Schema({
    name: { type: String, required: true },
    type: { type: String, enum: ['BOOLEAN', 'MULTI'], required: true },
    options: [String],
    value: mongoose.Schema.Types.Mixed
  }, { _id: false });
const propertySchema = new mongoose.Schema({
    merchant: { type: mongoose.Schema.Types.ObjectId, ref: 'Merchant', required: true },
    property_type: String,
    email: String,
    name: String,
    star_rating: Number,
    property_built_date: Date,
    accepting_bookings_since: Date,
    mobile_number: String,
    landline_number: String,
    current_step: { type: Number, default: 0 },
    status: { type: Number, default: 0, min: 0, max: 100 },
    in_progress: { type: Boolean, default: false },
    is_completed: { type: Boolean, default: false },
    location: {
        latitude: Number,
        longitude: Number,
        gmaps_url: String,
        address_line1: String,
        address_line2: String,
        pincode: String,
        country: String,
        state: String,
        city: String,
        landmark: String
    },
    amenities: [amenitySchema],
    policies: [policySchema],
    rooms: [roomSchema],
    photos: [String],
    videos: [String],
    ownership_details: {
        ownership_type: String,
        documents: [String]
    }
}, {
    timestamps: true // Add this line
});

module.exports = mongoose.model('Property', propertySchema);