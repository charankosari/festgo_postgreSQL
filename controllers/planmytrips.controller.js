const {
  PlanMyTrips,
  FestgoCoinUsageLimit,
  FestgoCoinSetting,
  sequelize,
} = require("../models/services");
const {
  FestgoCoinTransaction,
  usersequel,
  FestGoCoinHistory,
} = require("../models/users");
const { handleReferralForTrips } = require("../utils/issueCoins"); // adjust path
const { Op } = require("sequelize");
const moment = require("moment");

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
    const requestedCoins = Number(req.body.festgo_coins) || 0;

    const userId = req.user.id;
    let totalCoinsUsed = 0;
    let coin_history_inputs = [];

    if (requestedCoins > 0) {
      const now = new Date();
      const coinLimit = await FestgoCoinUsageLimit.findOne({
        transaction: service_tx,
      });

      if (!coinLimit || !coinLimit?.allother) {
        throw new Error("Coin usage limit not configured");
      }

      const allOtherMonthlyLimit = Number(coinLimit.allother);

      const firstDayOfMonth = moment().startOf("month").toDate();
      const lastDayOfMonth = moment().endOf("month").toDate();

      const totalUsedAcrossAll =
        (await FestGoCoinHistory.sum("coins", {
          where: {
            userId,
            type: "used",
            status: {
              [Op.in]: ["issued", "pending"],
            },
            reason: {
              [Op.in]: [
                "property_booking",
                "beachfest_booking",
                "cityfest_booking",
                "trips_booking",
              ],
            },
            createdAt: { [Op.between]: [firstDayOfMonth, lastDayOfMonth] },
          },
          transaction: user_tx,
        })) || 0;

      if (totalUsedAcrossAll >= allOtherMonthlyLimit) {
        console.log("🚫 User exceeded monthly limit. No coins can be used.");
        return {
          usable_coins: 0,
          coins_discount_value: 0,
          amount_to_be_paid: total_price,
        };
      }

      const setting = await FestgoCoinSetting.findOne({
        where: { type: "trips" },
        transaction: service_tx,
      });

      if (!setting) throw new Error("FestGoCoinSetting missing for trips");

      const monthlyLimitProperty = Number(setting.monthly_limit_value);
      const singleTransactionLimit = Number(
        setting.single_transaction_limit_value
      );

      const remainingThisMonthForProperty = monthlyLimitProperty;

      const txns = await FestgoCoinTransaction.findAll({
        where: {
          userId,
          [Op.or]: [{ remaining: { [Op.gt]: 0 } }, { amount: { [Op.gt]: 0 } }],
          expiresAt: { [Op.gt]: now },
        },
        order: [["expiresAt", "ASC"]],
        transaction: user_tx,
      });

      let totalAvailable = 0;
      for (const txn of txns) {
        totalAvailable += txn.remaining;
      }

      let usable_coins = Math.min(
        requestedCoins || 0,
        totalAvailable,
        singleTransactionLimit,
        remainingThisMonthForProperty,
        allOtherMonthlyLimit - totalUsedAcrossAll
      );

      let remainingToUse = usable_coins;

      for (const txn of txns) {
        if (remainingToUse <= 0) break;
        const deduct = Math.min(txn.remaining, remainingToUse);
        txn.remaining -= deduct;
        await txn.save({ transaction: user_tx });
        totalCoinsUsed += deduct;
        remainingToUse -= deduct;
      }

      // ⏺️ Add history entry
      if (totalCoinsUsed > 0) {
        coin_history_inputs.push({
          userId,
          type: "used",
          reason: "trips_booking",
          referenceId: null, // will update after booking
          coins: totalCoinsUsed,
          status: "pending",
          metaData: {
            booking_amount: null,
            id: null,
          },
        });
      }
    }

    // ✅ Create trip
    const newTrip = await PlanMyTrips.create(
      {
        userId,
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
        festgo_coins_used: totalCoinsUsed,
        coins_discount_value: totalCoinsUsed,
        referralId: referralId || null,
      },
      { transaction: service_tx }
    );

    // 🔹 Update history with trip reference
    if (coin_history_inputs.length > 0) {
      coin_history_inputs = coin_history_inputs.map((h) => ({
        ...h,
        referenceId: newTrip.id,
        metaData: {
          booking_amount: null,
          id: newTrip.id,
        },
      }));

      await FestGoCoinHistory.bulkCreate(coin_history_inputs, {
        transaction: user_tx,
      });
    }

    // 🔹 Handle referral
    if (referralId && referralId.length > 0) {
      await handleReferralForTrips({
        referralId,
        festbite: newTrip,
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
