const mongoose = require('mongoose');

const policySchema = new mongoose.Schema({
    name: { type: String, required: true },
    type: { type: String, enum: ['BOOLEAN', 'MULTI'], required: true },
    options: [String], // For MULTI type
});

module.exports = mongoose.model('Policy', policySchema);