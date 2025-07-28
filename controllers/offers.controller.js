const { Offers, Property } = require("../models/services"); // Adjust as needed
const { Op } = require("sequelize");

exports.createOffer = async (req, res) => {
  try {
    const {
      name,
      type,
      discount,
      bookingWindowStart,
      bookingWindowEnd,
      stayDatesStart,
      stayDatesEnd,
      promoCode,
      offerFor,
      status,
      propertyNames = [],
      selectedPropertyIds = [],
      entityIds = [],
      entityNames = [],
      description,
    } = req.body;

    const userRole = req.user.role;
    const userId = req.user.id;

    const validTypes = ["property", "event", "beach_fests", "city_fests"];

    let finalOfferFor = offerFor?.trim() || "property";

    if (!validTypes.includes(finalOfferFor)) {
      return res.status(400).json({
        success: false,
        message: `'offerFor' must be one of: ${validTypes.join(", ")}`,
      });
    }

    let finalEntityIds = [];
    let finalEntityNames = [];

    if (userRole === "vendor") {
      finalOfferFor = "property";

      const userProperties = await Property.findAll({
        where: { vendorId: userId },
        attributes: ["id", "name"],
      });

      const ownedPropertyIds = userProperties.map((p) => p.id.toString());

      finalEntityIds = selectedPropertyIds
        .map(String)
        .filter((id) => ownedPropertyIds.includes(id));

      finalEntityNames = userProperties
        .filter((p) => finalEntityIds.includes(p.id.toString()))
        .map((p) => p.name);

      if (finalEntityIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: "You can only apply offers to your own properties.",
        });
      }
    } else {
      finalEntityIds = (entityIds.length ? entityIds : selectedPropertyIds).map(
        String
      );
      finalEntityNames = entityNames.length ? entityNames : propertyNames;
    }

    // 🔍 Promo code conflict check
    if (promoCode) {
      const conflict = await Offers.findOne({
        where: {
          promoCode,
          status: "active",
          offerFor: finalOfferFor,
          [Op.and]: [
            {
              bookingWindowStart: { [Op.lte]: bookingWindowEnd },
            },
            {
              bookingWindowEnd: { [Op.gte]: bookingWindowStart },
            },
            {
              stayDatesStart: { [Op.lte]: stayDatesEnd },
            },
            {
              stayDatesEnd: { [Op.gte]: stayDatesStart },
            },
          ],
          [Op.or]: finalEntityIds.map((id) => ({
            entityIds: {
              [Op.contains]: [id], // works with Postgres ARRAY
            },
          })),
        },
      });

      if (conflict) {
        return res.status(409).json({
          success: false,
          message: `Promo code "${promoCode}" already exists for one of the selected entities with overlapping booking/stay dates.`,
        });
      }
    }

    const offer = await Offers.create({
      name,
      type,
      discount,
      bookingWindowStart,
      bookingWindowEnd,
      stayDatesStart,
      stayDatesEnd,
      promoCode,
      status,
      entityIds: finalEntityIds,
      entityNames: finalEntityNames,
      offerFor: finalOfferFor,
      description,
      from: userRole,
      vendorId: userId,
    });

    return res.status(201).json({
      success: true,
      message: "Offer created successfully.",
      data: offer,
    });
  } catch (error) {
    console.error("Create Offer Error:", error);

    return res.status(400).json({
      success: false,
      message: "Failed to create offer. Please check the input and try again.",
      error: error.message,
    });
  }
};
exports.getAllOffers = async (req, res) => {
  try {
    const userRole = req.user.role; // 'admin' or 'vendor'
    const userId = req.user.id;

    const whereClause = userRole === "vendor" ? { vendorId: userId } : {};

    const offers = await Offers.findAll({ where: whereClause, raw: true });

    const result = offers.map((offer) => {
      const isVendor = userRole === "vendor";

      return {
        id: offer.id,
        name: offer.name,
        type: offer.type,
        discount: offer.discount,
        bookingWindowStart: offer.bookingWindowStart,
        bookingWindowEnd: offer.bookingWindowEnd,
        stayDatesStart: offer.stayDatesStart,
        stayDatesEnd: offer.stayDatesEnd,
        promoCode: offer.promoCode,
        status: offer.status,
        ...(isVendor
          ? {
              propertyNames: offer.entityNames || [],
              selectedPropertyIds: offer.entityIds || [],
            }
          : {
              entityNames: offer.entityNames || [],
              entityIds: offer.entityIds || [],
            }),
      };
    });

    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching offers:", error);
    res.status(400).json({ error: "Failed to fetch offers." });
  }
};
