const mongoose = require('mongoose');

const eventTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  image_url: [
    {
      type: String,
      required: true,
    },
  ],
  themes: [
    {
      type: String,
    },
  ],
}, { timestamps: true });

const EventType = mongoose.model('EventType', eventTypeSchema);

module.exports = EventType;