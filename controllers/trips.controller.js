const { Trips } = require("../models/services"); // adjust path if needed
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
      imageUrl,
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
      imageUrl,
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
      imageUrl,
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
      imageUrl,
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

    // Helper function to format price with Indian currency
    const formatPrice = (price) => {
      return `₹ ${price.toLocaleString("en-IN")} per person`;
    };

    // Transform trips to convert pricing object to array format (excluding image)
    const transformedTrips = trips.map((trip) => {
      const tripData = trip.toJSON();

      // Transform pricing from object format { "4": 5000, "8": 3000, "16": 2000 } to array format
      if (tripData.pricing) {
        // If pricing is already an array, just remove image field
        if (Array.isArray(tripData.pricing)) {
          tripData.pricing = tripData.pricing.map((priceItem) => {
            if (priceItem && typeof priceItem === "object") {
              const { image, ...priceWithoutImage } = priceItem;
              return priceWithoutImage;
            }
            return priceItem;
          });
        }
        // If pricing is an object like { "4": 5000, "8": 3000, "16": 2000 }
        else if (
          tripData.pricing &&
          typeof tripData.pricing === "object" &&
          !Array.isArray(tripData.pricing)
        ) {
          const pricingArray = [];
          let id = 1;

          // Sort keys numerically to ensure consistent order
          const sortedKeys = Object.keys(tripData.pricing).sort(
            (a, b) => Number(a) - Number(b)
          );

          sortedKeys.forEach((memberCount) => {
            const priceValue = tripData.pricing[memberCount];
            const numMemberCount = Number(memberCount);

            // Only include numeric price values
            if (typeof priceValue === "number") {
              pricingArray.push({
                id: id++,
                title: `For ${numMemberCount} member`,
                price: formatPrice(priceValue),
                persons: numMemberCount,
              });
            }
          });

          tripData.pricing = pricingArray;
        }
      }

      return tripData;
    });

    res.json({ success: true, trips: transformedTrips });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
