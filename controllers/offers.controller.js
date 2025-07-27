const { Offers, Property } = require("../models/services"); // Adjust as needed

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
      description,
    } = req.body;

    const userRole = req.user.role;
    const userId = req.user.id;

    const validTypes = ["property", "event", "beach_fests", "city_fests"];

    // Default `offerFor` to "property" if empty or missing
    let finalOfferFor = offerFor?.trim() || "property";

    if (!validTypes.includes(finalOfferFor)) {
      return res.status(400).json({
        success: false,
        message: `'offerFor' must be one of: ${validTypes.join(", ")}`,
      });
    }

    let validEntityIds = selectedPropertyIds.map(String);
    let validEntityNames = propertyNames;

    if (userRole === "vendor") {
      finalOfferFor = "property";

      const userProperties = await Property.findAll({
        where: { vendorId: userId },
        attributes: ["id", "name"],
      });

      const ownedPropertyIds = userProperties.map((p) => p.id.toString());

      validEntityIds = selectedPropertyIds.filter((id) =>
        ownedPropertyIds.includes(id.toString())
      );

      validEntityNames = userProperties
        .filter((p) => validEntityIds.includes(p.id.toString()))
        .map((p) => p.name);

      if (validEntityIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: "You can only apply offers to your own properties.",
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
      entityIds: validEntityIds,
      entityNames: validEntityNames,
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

    // Handle unique constraint error for promoCode
    if (error.name === "SequelizeUniqueConstraintError") {
      const promoCodeError = error.errors.find(
        (err) => err.path === "promoCode"
      );
      if (promoCodeError) {
        return res.status(409).json({
          success: false,
          message: `Promo code "${promoCodeError.value}" already exists. Please use a different code.`,
        });
      }
    }

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
