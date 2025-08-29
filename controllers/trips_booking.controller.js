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
const { Op, Transaction } = require("sequelize");
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
        newBooking,
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

exports.handleTripPaymentSuccess = async (bookingId, transactionId) => {
  // Start transactions for both services and users databases
  const t = await sequelize.transaction({
    isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE,
  });
  const user_tx = await usersequel.transaction();

  try {
    // 1. Fetch the booking details
    const booking = await TripsBooking.findOne({
      where: { id: bookingId },
      transaction: t,
    });

    if (!booking) {
      await t.rollback();
      await user_tx.rollback();
      console.error(`Booking with ID ${bookingId} not found.`);
      return false;
    }

    // 2. Fetch the trip details and lock the row to prevent race conditions
    const trip = await Trips.findByPk(booking.tripId, {
      transaction: t,
      lock: t.LOCK.UPDATE, // Lock the trip row until the transaction is complete
    });

    if (!trip) {
      await t.rollback();
      await user_tx.rollback();
      console.error(`Trip with ID ${booking.tripId} not found.`);
      return false;
    }

    // 5. Success Case: Confirm the booking and update inventory
    await TripsBooking.update(
      {
        payment_status: "paid",
        booking_status: "confirmed",
        transaction_id: transactionId,
      },
      { where: { id: bookingId }, transaction: t }
    );

    // Confirm the usage of Festgo Coins
    await FestGoCoinHistory.update(
      { status: "issued" },
      {
        where: {
          referenceId: bookingId,
          type: "used",
          status: "pending",
        },
        transaction: user_tx,
      }
    );
    const issueAt = new Date(trip.endDate);
    issueAt.setDate(issueAt.getDate() + 1);
    await FestgoCoinToIssue.update(
      {
        issue: true,
        issueAt,
      },
      {
        where: {
          sourceType: "trips",
          sourceId: bookingId, // use trip.id, not bookingId
        },
        transaction: user_tx,
      }
    );
    await upsertCronThing({ name: "trips_coins_issue", transaction: t });

    // Commit all changes
    await t.commit();
    await user_tx.commit();
    console.log(
      `✅ Booking ${bookingId} confirmed successfully. Seats updated.`
    );
    return true;
  } catch (error) {
    console.error("Error in handleTripPaymentSuccess:", error);
    await t.rollback();
    await user_tx.rollback();
    return false;
  }
};

exports.handleTripPaymentFailure = async (bookingId) => {
  const user_tx = await usersequel.transaction();
  try {
    // 1. Update booking status to cancelled
    const booking = await TripsBooking.findByPk(bookingId);
    if (!booking) {
      console.error(`Booking ${bookingId} not found for failure handling.`);
      await user_tx.rollback();
      return false;
    }

    await booking.update({
      payment_status: "failed",
      booking_status: "cancelled",
    });

    // 2. Reverse any used Festgo Coins
    const history = await FestGoCoinHistory.findOne({
      where: {
        referenceId: bookingId,
        type: "used",
        status: "pending",
      },
      transaction: user_tx,
    });

    if (history) {
      let remainingToRefund = history.coins;

      const txnsToRestore = await FestgoCoinTransaction.findAll({
        where: {
          user_id: booking.userId,
          expiredAt: { [Op.gte]: new Date() }, // only valid transactions
        },
        order: [["expiredAt", "ASC"]],
        transaction: user_tx,
      });

      for (const txn of txnsToRestore) {
        if (remainingToRefund <= 0) break;

        const originallyUsed = txn.amount - txn.remaining;
        const refundable = Math.min(originallyUsed, remainingToRefund);

        if (refundable > 0) {
          txn.remaining += refundable;
          remainingToRefund -= refundable;
          await txn.save({ transaction: user_tx });
        }
      }

      if (remainingToRefund > 0) {
        await FestgoCoinTransaction.create(
          {
            user_id: booking.userId,
            type: "refund_grace_period",
            amount: remainingToRefund,
            remaining: remainingToRefund,
            sourceType: "trip_cancellation",
            sourceId: booking.id,
            expiredAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          },
          { transaction: user_tx }
        );
        remainingToRefund = 0;
      }

      await history.update({ status: "not valid" }, { transaction: user_tx });
    }

    // Also invalidate any potential "earned" coin history from this booking
    await FestGoCoinHistory.update(
      { status: "not valid" },
      {
        where: {
          referenceId: bookingId,
          type: "earned",
          status: "pending",
        },
        transaction: user_tx,
      }
    );
    await FestgoCoinToIssue.update(
      {
        issue: false,
        issueAt: null,
        status: "cancelled",
      },
      {
        where: {
          sourceType: "trips",
          sourceId: bookingId,
        },
        transaction: user_tx,
      }
    );
    await user_tx.commit();
    console.log(
      `❌ Booking ${bookingId} marked as cancelled due to payment failure.`
    );
    return true;
  } catch (error) {
    await user_tx.rollback();
    console.error("Error in handleTripPaymentFailure:", error);
    return false;
  }
};
