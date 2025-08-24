const { Trips, TripsBooking, sequelize } = require("../models/services");

const {
  FestgoCoinToIssue,
  FestGoCoinHistory,
  FestgoCoinTransaction,
  usersequel,
} = require("../models/users");
const { createOrder, refundPayment } = require("../libs/payments/razorpay");
const { applyUsableFestgoCoins } = require("../utils/festgo_coins_apply");
const { handleReferralForTrips } = require("../utils/issueCoins");
const { Op } = require("sequelize");
const { upsertCronThing } = require("../utils/cronUtils");
exports.createTripBooking = async (req, res) => {
  const t = await sequelize.transaction();
  const user_tx = await usersequel.transaction();

  try {
    const {
      id, // tripId
      name,
      number,
      email,
      payment_method,
      numberOfPersons,
      referral_id,
      requestedCoins,
    } = req.body;

    const userId = req.user.id;
    const trip = await Trips.findByPk(id, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!trip) {
      await t.rollback();
      await user_tx.rollback();
      return res
        .status(404)
        .json({ success: false, message: "Trip not found." });
    }
    const baseAmount = trip.pricing?.price_per_person
      ? trip.pricing.price_per_person * numberOfPersons
      : 0;
    let coinResult = {
      usable_coins: 0,
      coins_discount_value: 0,
      amount_to_be_paid: baseAmount,
      coin_history_inputs: null,
    };
    if (requestedCoins && requestedCoins > 0) {
      coinResult = await applyUsableFestgoCoins({
        userId,
        requestedCoins,
        total_price: baseAmount,
        transaction: t,
        user_tx,
        type: "trips",
        id: trip.id,
      });
    }
    let gstPercentage = 0;
    let serviceFee = 50;
    const afterCoinAmount = coinResult.amount_to_be_paid;

    if (afterCoinAmount <= 1000) {
      gstPercentage = 0;
      serviceFee = 50;
    } else if (afterCoinAmount > 1000 && afterCoinAmount <= 7000) {
      gstPercentage = 12;
      serviceFee = 50;
    } else if (afterCoinAmount > 7000 && afterCoinAmount <= 8000) {
      gstPercentage = 12;
      serviceFee = 150;
    } else if (afterCoinAmount > 8000) {
      gstPercentage = 18;
      serviceFee = 200;
    }

    const gstAmount = ((afterCoinAmount + serviceFee) * gstPercentage) / 100;
    const totalPayable = afterCoinAmount + serviceFee + gstAmount;
    const newBooking = await TripsBooking.create(
      {
        userId,
        tripId: id,
        name,
        number,
        email,
        payment_method,
        numberOfPersons,
        startDate: trip.startDate,
        endDate: trip.endDate,
        service_fee: serviceFee,
        total_amount: parseFloat(baseAmount.toFixed(2)),
        gst_amount: parseFloat(gstAmount.toFixed(2)),
        gst_rate: gstPercentage,
        amount_paid: parseFloat(totalPayable.toFixed(2)),
        payment_status: "pending",
        booking_status: "pending",
        festgo_coins_used: coinResult.usable_coins,
        coins_discount_value: coinResult.coins_discount_value,
      },
      { transaction: t }
    );

    // Razorpay Order
    const razorpayOrder = await createOrder({
      order_id: newBooking.id,
      amount: parseFloat(totalPayable.toFixed(2)),
      notes: {
        payment_for: "trip_booking",
        payment_type: payment_method,
        booking_id: newBooking.id,
      },
    });

    // Handle Referral (non-blocking)
    if (referral_id && referral_id.trim() !== "") {
      handleReferralForTrips({
        referralId: referral_id.trim(),
        trip,
        transactions: { service_tx: t, user_tx },
      }).catch((err) => console.error("Referral error:", err));
    }

    // Save Coin History
    if (coinResult.coin_history_inputs?.length > 0) {
      for (let i = 0; i < coinResult.coin_history_inputs.length; i++) {
        coinResult.coin_history_inputs[i].referenceId = newBooking.id;
      }
      await FestGoCoinHistory.bulkCreate(coinResult.coin_history_inputs, {
        transaction: user_tx,
      });
    }

    await t.commit();
    await user_tx.commit();

    return res.status(201).json({
      success: true,
      message: "Trip booking created successfully.",
      data: { booking: newBooking, razorpayOrder },
    });
  } catch (error) {
    console.error("Error in createTripBooking:", error);
    await t.rollback();
    await user_tx.rollback();
    return res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};
