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
    });

    return res.status(201).json({
      success: true,
      message: "Offer created successfully.",
      data: offer,
    });
  } catch (error) {
    console.error("Create Offer Error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while creating the offer.",
      error: error.message,
    });
  }
};
