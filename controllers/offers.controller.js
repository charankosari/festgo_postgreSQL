const {
  Offers,
  Property,
  EventType,
  beach_fests,
  city_fest,
} = require("../models/services"); // Adjust as needed
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
    const isActive = userRole === "vendor" ? false : true;
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
      active: isActive,
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
exports.getOffersForUsers = async (req, res) => {
  try {
    const now = new Date(); // Correct format

    const offers = await Offers.findAll({
      where: {
        bookingWindowStart: { [Op.lte]: now },
        bookingWindowEnd: { [Op.gte]: now },
        active: true,
      },
      raw: true,
    });
    const enrichedOffers = await Promise.all(
      offers.map(async (offer) => {
        let image = "";

        if (offer.offerFor === "property") {
          const property = await Property.findByPk(offer.entityIds[0]);
          if (property?.photos && Array.isArray(property.photos)) {
            image = property.photos.find((p) => p.imageURL)?.imageURL || "";
          }
        } else if (offer.offerFor === "event") {
          const eventTypes = await EventType.findAll();
          if (eventTypes.length > 0) {
            const randomIndex = Math.floor(Math.random() * eventTypes.length);
            image = eventTypes[randomIndex]?.imageUrl || "";
          }
        } else if (offer.offerFor === "beach_fests") {
          const beachFest = await beach_fests.findByPk(offer.entityIds[0]);
          if (beachFest?.image_urls && beachFest.image_urls.length > 0) {
            image = beachFest.image_urls[0];
          }
        } else if (offer.offerFor === "city_fests") {
          const cityFest = await city_fest.findByPk(offer.entityIds[0]);
          if (cityFest?.image_urls && cityFest.image_urls.length > 0) {
            image = cityFest.image_urls[0];
          }
        }

        return { ...offer, image };
      })
    );

    res.status(200).json({
      offers: enrichedOffers,
      message: "fetched offers",
      status: 200,
    });
  } catch (error) {
    console.error("Error fetching offers:", error);
    res.status(400).json({ error: "Failed to fetch offers." });
  }
};
exports.activateOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user.role;

    if (userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can activate offers.",
      });
    }

    // Find offer
    const offer = await Offers.findByPk(id);

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: "Offer not found.",
      });
    }

    offer.active = true;
    offer.status = "active";
    await offer.save();

    return res.status(200).json({
      success: true,
      message: "Offer activated successfully.",
      data: offer,
    });
  } catch (error) {
    console.error("Error activating offer:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to activate offer.",
      error: error.message,
    });
  }
};

exports.deactivateOffer = async (req, res) => {
  try {
    const { id } = req.params;

    // Find offer
    const offer = await Offers.findByPk(id);

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: "Offer not found.",
      });
    }

    // Update active status
    offer.active = false;
    offer.status = "inactive";
    await offer.save();

    return res.status(200).json({
      success: true,
      message: "Offer deactivated successfully.",
      data: offer,
    });
  } catch (error) {
    console.error("Error deactivating offer:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to deactivate offer.",
      error: error.message,
    });
  }
};
// Delete offer (admin can delete any; vendor can delete only their own)
exports.deleteOffer = async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user.role;
    const userId = req.user.id;

    const offer = await Offers.findByPk(id);
    if (!offer) {
      return res.status(404).json({
        success: false,
        message: "Offer not found.",
      });
    }

    // If vendor, ensure they own the offer; admins can delete any offer
    if (userRole === "vendor") {
      if (String(offer.vendorId) !== String(userId)) {
        return res.status(403).json({
          success: false,
          message: "Vendors can only delete their own offers.",
        });
      }
    } else if (userRole !== "admin") {
      // only admin or the owning vendor may delete
      return res.status(403).json({
        success: false,
        message: "Only admins or the vendor owning the offer can delete it.",
      });
    }

    await offer.destroy();

    return res.status(200).json({
      success: true,
      message: "Offer deleted successfully.",
      data: { id },
    });
  } catch (error) {
    console.error("Error deleting offer:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete offer.",
      error: error.message,
    });
  }
};
