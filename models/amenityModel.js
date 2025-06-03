const mongoose = require('mongoose');

const amenitySchema = new mongoose.Schema({
    category: { type: String, required: true }, // e.g., 'mandatory', 'popular_guests'
    name: { type: String, required: true },     // e.g., 'Air Conditioning'
    type: { type: String, enum: ['BOOLEAN', 'MULTI'], required: true },
    options: [String], // For MULTI type, e.g., ['Centralized', 'Room controlled']
});

module.exports = mongoose.model('Amenity', amenitySchema);