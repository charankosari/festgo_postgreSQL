const mongoose = require('mongoose');

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
    amenities: [{
        category: { type: String, required: true },
        name: { type: String, required: true },
        type: { type: String, enum: ['BOOLEAN', 'MULTI'], required: true },
        options: [String],
        value: mongoose.Schema.Types.Mixed
      }],
    photos: [String],
    videos: [String]
});

module.exports = mongoose.model('Room', roomSchema);