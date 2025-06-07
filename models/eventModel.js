const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  eventLocation: {
    type: String,
    required: true,
  },
  eventType: {
    type: String,
    required: true,
  },
  eventDate: {
    type: Date,
    required: true,
  },
  numberOfGuests: {
    type: Number,
    required: true,
  },
  venueOption: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  soundSystem: {
    type: mongoose.Schema.Types.Mixed,
    default: false,
  },
  photography: {
    type: mongoose.Schema.Types.Mixed,
    default: false,
  },
  additional_things: {
    type: Map,
    of: Boolean,
  },
  themes: {
    type: [String],
    default: [],
  }
}, { timestamps: true });

const Event = mongoose.model('Event', eventSchema);

module.exports = Event;