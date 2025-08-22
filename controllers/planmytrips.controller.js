const { PlanMyTrips, sequelize } = require("../models/services");
const { usersequel } = require("../models/users");
const { handleReferralForTrips } = require("../utils/issueCoins"); // adjust path

exports.createPlanMyTrip = async (req, res) => {
  const service_tx = await sequelize.transaction();
  const user_tx = await usersequel.transaction();
  try {
    const {
      name,
      number,
      travelType,
      totalPersons,
      date,
      from,
      destination,
      amenities,
      hotelCategory,
    } = req.body;
    const referralId = req.body.referral_id?.trim();
    const newTrip = await PlanMyTrips.create(
      {
        userId: req.user.id,
        name,
        number,
        travelType,
        totalPersons,
        date,
        from,
        destination,
        amenities,
        hotelCategory,
        status: "pending",
        festgo_coins_used: 0,
        coins_discount_value: 0,
        referralId: referralId || null,
      },
      { transaction: service_tx }
    );

    // 🔹 Handle referral (only if referralId exists)

    if (referralId && referralId.length > 0) {
      await handleReferralForTrips({
        referralId,
        festbite: newTrip, // reuse same handler
        transactions: { service_tx, user_tx },
      });
    }

    await service_tx.commit();
    await user_tx.commit();

    res.status(201).json({
      success: true,
      message: "PlanMyTrip created successfully",
      data: newTrip,
    });
  } catch (error) {
    await service_tx.rollback();
    await user_tx.rollback();
    console.error("Error creating PlanMyTrip:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create trip",
      error: error.message,
    });
  }
};
