const { Trips } = require("../models/services/trips.model"); // adjust path if needed
const { Op } = require("sequelize");
const moment = require("moment");
// ✅ Validation helper for pricing (must be number:number, not string:number)
function validatePricing(pricing) {
  if (typeof pricing !== "object" || Array.isArray(pricing)) return false;
  for (const [key, value] of Object.entries(pricing)) {
    if (isNaN(key) || typeof value !== "number") return false;
  }
  return true;
}

exports.createTrip = async (req, res) => {
  try {
    const {
      tripName,
      startDate,
      endDate,
      highlights,
      pricing,
      pickupLocation,
      inclusions,
    } = req.body;

    // ✅ Validation
    if (new Date(startDate) >= new Date(endDate)) {
      return res
        .status(400)
        .json({ error: "Start date must be before end date" });
    }

    if (!validatePricing(pricing)) {
      return res
        .status(400)
        .json({ error: "Invalid pricing format. Use {number:number}" });
    }

    const numberOfDays = Math.ceil(
      (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)
    );

    const trip = await Trips.create({
      tripName,
      startDate,
      endDate,
      numberOfDays,
      highlights,
      pricing,
      pickupLocation,
      inclusions,
    });

    res.status(201).json({ success: true, trip });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.updateTrip = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      tripName,
      startDate,
      endDate,
      highlights,
      pricing,
      pickupLocation,
      inclusions,
    } = req.body;

    const trip = await Trips.findByPk(id);
    if (!trip) return res.status(404).json({ error: "Trip not found" });

    if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
      return res
        .status(400)
        .json({ error: "Start date must be before end date" });
    }

    if (pricing && !validatePricing(pricing)) {
      return res
        .status(400)
        .json({ error: "Invalid pricing format. Use {number:number}" });
    }

    const numberOfDays =
      startDate && endDate
        ? Math.ceil(
            (new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)
          )
        : trip.numberOfDays;

    await trip.update({
      tripName,
      startDate,
      endDate,
      numberOfDays,
      highlights,
      pricing,
      pickupLocation,
      inclusions,
    });

    res.json({ success: true, trip });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.deleteTrip = async (req, res) => {
  try {
    const { id } = req.params;
    const trip = await Trips.findByPk(id);
    if (!trip) return res.status(404).json({ error: "Trip not found" });

    await trip.destroy();
    res.json({ success: true, message: "Trip deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getAllTrips = async (req, res) => {
  try {
    const trips = await Trips.findAll();
    res.json({ success: true, trips });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getTripById = async (req, res) => {
  try {
    const { id } = req.params;
    const trip = await Trips.findByPk(id);
    if (!trip) return res.status(404).json({ error: "Trip not found" });

    res.json({ success: true, trip });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
exports.getValidTrips = async (req, res) => {
  try {
    const tomorrow = moment()
      .add(1, "days")
      .startOf("day")
      .format("YYYY-MM-DD");

    const trips = await Trips.findAll({
      where: {
        startDate: {
          [Op.gte]: tomorrow,
        },
      },
    });

    res.json({ success: true, trips });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
