const mongoose = require('mongoose');

const roomAmenitySchema = new mongoose.Schema({
    category: { type: String, required: true },
    name: { type: String, required: true },
    type: { type: String, enum: ['BOOLEAN', 'MULTI'], required: true },
    options: [String],
});

module.exports = mongoose.model('RoomAmenity', roomAmenitySchema);