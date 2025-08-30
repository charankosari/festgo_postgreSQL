const {
  property_booking,
  Property,
  RoomBookedDate,
  beachfests_booking,
  beach_fests,
  Festbite,
  Event,
  sequelize, // your services sequelize instance
  zeroBookingInstance,
  PlanMyTrips,
  Trips,
  TripsBooking,
} = require("../models/services");
const {
  FestgoCoinToIssue,
  FestGoCoinHistory,
  FestgoCoinTransaction,
  usersequel,
} = require("../models/users");
const { refundPayment } = require("../libs/payments/razorpay");
const moment = require("moment");
const axios = require("axios");

const cancelPropertyBooking = async (req, res) => {
  const user_tx = await usersequel.transaction();
  try {
    const { id } = req.params;

    const booking = await property_booking.findOne({
      where: { id, payment_status: "paid" },
    });

    if (!booking) {
      await user_tx.rollback();
      return res
        .status(404)
        .json({ success: false, message: "Booking not found." });
    }

    const { data } = await axios.post(
      "https://server.festgo.in/api/properties/p/property-details",
      { propertyId: booking.property_id }
    );
    const { success, status, ...cleanData } = data;
    const property = cleanData;
    const policy = property?.policies?.cancellationProperty || "Flexible";

    const today = moment();
    const checkInDate = moment(booking.check_in_date);
    const daysBeforeCheckin = checkInDate.diff(today, "days");

    let refundPercentage = 0;

    switch (policy) {
      case "Flexible - Full refund 1 day prior":
        if (daysBeforeCheckin >= 1) refundPercentage = 100;
        break;

      case "Moderate - Full refund 5 days prior":
        if (daysBeforeCheckin >= 5) refundPercentage = 100;
        break;

      case "Firm - 50% refund up to 30 days prior":
        if (daysBeforeCheckin >= 30) refundPercentage = 50;
        break;

      case "Strict - 50% refund up to 7 days prior":
        if (daysBeforeCheckin >= 7) refundPercentage = 50;
        break;

      case "Super Strict 30 - 50% refund up to 30 days prior":
        if (daysBeforeCheckin >= 30) refundPercentage = 50;
        break;

      case "Super Strict 60 - 50% refund up to 60 days prior":
        if (daysBeforeCheckin >= 60) refundPercentage = 50;
        break;

      case "Non Refundable":
      default:
        refundPercentage = 0;
        break;
    }

    let refundAmount = 0;

    if (
      booking.payment_method === "online" &&
      refundPercentage > 0 &&
      booking.transaction_id
    ) {
      const refundableAmount = booking.amount_paid - booking.service_fee;
      refundAmount = Math.round(refundableAmount * (refundPercentage / 100));

      if (refundAmount > 0) {
        const refund = await refundPayment({
          payment_id: booking.transaction_id,
          amount: refundAmount,
        });
      }
    }

    await RoomBookedDate.destroy({ where: { bookingId: id } });

    await booking.update({
      booking_status: "cancelled",
      payment_status:
        booking.payment_method === "online"
          ? refundPercentage > 0
            ? "refunded"
            : "norefund"
          : "norefund",
    });
    await FestgoCoinToIssue.update(
      { status: "cancelled" },
      {
        where: {
          booking_id: booking.id,
          status: "pending",
        },
        transaction: user_tx,
      }
    );

    await FestGoCoinHistory.update(
      { status: "not valid" },
      {
        where: {
          referenceId: booking.id,
          type: "earned",
          status: "pending",
        },
        transaction: user_tx,
      }
    );
    const usedCoinHistory = await FestGoCoinHistory.findOne({
      where: {
        referenceId: booking.id,
        type: "used",
      },
      transaction: user_tx,
    });
    let refundedCoins = 0;
    if (usedCoinHistory) {
      const totalUsedCoins = usedCoinHistory.coins;
      refundedCoins = Math.floor(totalUsedCoins * (refundPercentage / 100));

      if (refundedCoins > 0) {
        const txnsToRestore = await FestgoCoinTransaction.findAll({
          where: {
            userId: booking.user_id,
            expiresAt: {
              [Op.gte]: new Date(),
            },
          },
          order: [["expiresAt", "ASC"]],

          transaction: user_tx,
        });

        let remainingToRefund = refundedCoins;

        for (const txn of txnsToRestore) {
          const originallyUsed = txn.amount - txn.remaining;
          const refundable = Math.min(originallyUsed, remainingToRefund);

          if (refundable <= 0) continue;

          txn.remaining += refundable;
          remainingToRefund -= refundable;

          await txn.save({ transaction: user_tx });

          if (remainingToRefund <= 0) break;
        }
        if (remainingToRefund > 0) {
          await FestgoCoinTransaction.create(
            {
              userId: booking.user_id,
              type: "refund_grace_period",
              amount: remainingToRefund,
              remaining: remainingToRefund,
              sourceType: "event_cancellation",
              sourceId: booking.id,
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
            { transaction: user_tx }
          );
        }
        // Mark original usage history as not valid
        await usedCoinHistory.update(
          { status: "not valid" },
          { transaction: user_tx }
        );

        // Create new refund coin history
        await FestGoCoinHistory.create(
          {
            userId: booking.user_id,
            type: "refund",
            reason: "booking_cancelled",
            referenceId: booking.id,
            coins: refundedCoins,
            status: "issued",
            metaData: {
              booking_amount: booking.amount_paid,
              refund_percentage: refundPercentage,
              cancellation_policy: policy,
            },
          },
          { transaction: user_tx }
        );
      }
    }
    await user_tx.commit();
    res.status(200).json({
      success: true,
      message:
        refundPercentage > 0
          ? `Booking cancelled. ₹${refundAmount} refunded (${refundPercentage}% of amount excluding service charges).`
          : "Booking cancelled. No refund applicable as per cancellation policy.",
      refundAmount,
      refundPercentage,
      cancellationPolicy: policy,
      booking: booking,
      property: property,
    });
  } catch (error) {
    await user_tx.rollback();
    console.error("Error cancelling property booking:", error);
    res.status(500).json({ success: false, message: "Something went wrong." });
  }
};

// Event booking cancel placeholder
const cancelEventBooking = async (req, res) => {
  const user_tx = await usersequel.transaction();
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const event = await Event.findByPk(id);

    if (!event) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found." });
    }

    if (event.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to cancel this event booking.",
      });
    }

    await FestgoCoinToIssue.update(
      { status: "cancelled" },
      {
        where: {
          sourceId: event.id,
          type: "event_referral",
          sourceType: "event",
          status: "pending",
        },
        transaction: user_tx,
      }
    );

    await FestGoCoinHistory.update(
      { status: "not valid" },
      {
        where: {
          referenceId: event.id,
          status: "pending",
        },
        transaction: user_tx,
      }
    );
    const usedCoinHistory = await FestGoCoinHistory.findOne({
      where: {
        reason: "event",
        referenceId: event.id,
        userId: event.userId,
        status: "pending",
        type: "used",
      },
      transaction: user_tx,
    });

    let refundedCoins = 0;
    if (usedCoinHistory) {
      const totalUsedCoins = usedCoinHistory.coins;
      refundedCoins = totalUsedCoins;

      if (refundedCoins > 0) {
        const txnsToRestore = await FestgoCoinTransaction.findAll({
          where: {
            userId: event.userId,
            expiresAt: {
              [Op.gte]: new Date(),
            },
          },
          order: [["expiresAt", "ASC"]],
          transaction: user_tx,
        });

        let remainingToRefund = refundedCoins;

        if (txnsToRestore.length === 0) {
          // No usable transactions — full refund as grace period fallback
          await FestgoCoinTransaction.create(
            {
              userId: event.userId,
              type: "refund_grace_period",
              amount: refundedCoins,
              remaining: refundedCoins,
              sourceId: event.id,
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
            { transaction: user_tx }
          );
        } else {
          // Refund into existing coin transactions
          for (const txn of txnsToRestore) {
            const originallyUsed = txn.amount - txn.remaining;
            const refundable = Math.min(originallyUsed, remainingToRefund);

            if (refundable <= 0) continue;

            txn.remaining += refundable;
            remainingToRefund -= refundable;

            await txn.save({ transaction: user_tx });

            if (remainingToRefund <= 0) break;
          }

          // ⛳ If not fully refunded, create fallback transaction
          if (remainingToRefund > 0) {
            await FestgoCoinTransaction.create(
              {
                userId: event.userId,
                type: "refund_grace_period",
                amount: remainingToRefund,
                remaining: remainingToRefund,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              },
              { transaction: user_tx }
            );
          }
        }

        await usedCoinHistory.update(
          { status: "not valid" },
          { transaction: user_tx }
        );
      }
    }
    await event.destroy();

    await user_tx.commit();
    res.status(200).json({
      success: true,
      message: "Event booking cancelled successfully.",
    });
  } catch (error) {
    console.error("Error cancelling event booking:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong while cancelling event booking.",
    });
  }
};

// Beach fest booking cancel placeholder
const cancelBeachFestBooking = async (req, res) => {
  const t = await sequelize.transaction();
  const user_tx = await usersequel.transaction();
  try {
    const { id } = req.params;

    const booking = await beachfests_booking.findByPk(id, { transaction: t });
    if (!booking || booking.payment_status !== "paid") {
      await t.rollback();
      return res.status(404).json({
        success: false,
        message: !booking
          ? "Booking not found."
          : "Booking is not eligible for cancellation (payment not completed).",
      });
    }

    const fest = await beach_fests.findByPk(booking.beachfest_id, {
      transaction: t,
    });
    if (!fest) {
      await t.rollback();
      return res
        .status(404)
        .json({ success: false, message: "Beachfest not found." });
    }

    const today = moment();
    const eventStartDate = moment(booking.event_start);
    const daysBeforeEvent = eventStartDate.diff(today, "days");

    let refundPercentage = 0;
    if (daysBeforeEvent >= 4) {
      refundPercentage = 100;
    } else if (daysBeforeEvent >= 2) {
      refundPercentage = 50;
    }

    let refundAmount = 0;

    if (refundPercentage > 0 && booking.transaction_id) {
      const refundableAmount = booking.amount_paid - booking.service_fee;

      refundAmount = Math.round(refundableAmount * (refundPercentage / 100));
      if (refundAmount > 0) {
        const refund = await refundPayment({
          payment_id: booking.transaction_id,
          amount: refundAmount,
        });
      }
    }

    // 👉 Update fest's available_passes (release the reserved passes)
    fest.available_passes += booking.passes;
    await fest.save({ transaction: t });

    // 👉 Update booking status and payment status
    await booking.update(
      {
        booking_status: "cancelled",
        payment_status:
          booking.payment_method === "online"
            ? refundPercentage > 0
              ? "refunded"
              : "norefund"
            : "norefund",
      },
      { transaction: t }
    );

    await FestgoCoinToIssue.update(
      { status: "cancelled" },
      {
        where: {
          booking_id: booking.id,
          type: "beachfest_referral",
          status: "pending",
        },
        transaction: user_tx,
      }
    );

    await FestGoCoinHistory.update(
      { status: "not valid" },
      {
        where: {
          referenceId: booking.id,
          status: "pending",
          type: "earned",
        },
        transaction: user_tx,
      }
    );
    const usedCoinHistory = await FestGoCoinHistory.findOne({
      where: {
        referenceId: booking.id,
        type: "used",
      },
      transaction: user_tx,
    });
    let refundedCoins = 0;
    if (usedCoinHistory) {
      const totalUsedCoins = usedCoinHistory.coins;
      refundedCoins = Math.floor(totalUsedCoins * (refundPercentage / 100));

      if (refundedCoins > 0) {
        const txnsToRestore = await FestgoCoinTransaction.findAll({
          where: {
            userId: booking.user_id,
            expiresAt: {
              [Op.gte]: new Date(),
            },
          },
          order: [["expiresAt", "ASC"]],

          transaction: user_tx,
        });

        let remainingToRefund = refundedCoins;

        for (const txn of txnsToRestore) {
          const originallyUsed = txn.amount - txn.remaining;
          const refundable = Math.min(originallyUsed, remainingToRefund);

          if (refundable <= 0) continue;

          txn.remaining += refundable;
          remainingToRefund -= refundable;

          await txn.save({ transaction: user_tx });

          if (remainingToRefund <= 0) break;
        }
        if (remainingToRefund > 0) {
          await FestgoCoinTransaction.create(
            {
              userId: booking.user_id,
              type: "refund_grace_period",
              amount: remainingToRefund,
              remaining: remainingToRefund,
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
            { transaction: user_tx }
          );
        }
        // Mark original usage history as not valid
        await usedCoinHistory.update(
          { status: "not valid" },
          { transaction: user_tx }
        );

        // Create new refund coin history
        await FestGoCoinHistory.create(
          {
            userId: booking.user_id,
            type: "refund",
            reason: "booking_cancelled",
            referenceId: booking.id,
            coins: refundedCoins,
            status: "issued",
            metaData: {
              booking_amount: booking.amount_paid,
              refund_percentage: refundPercentage,
            },
          },
          { transaction: user_tx }
        );
      }
    }
    await t.commit();
    await user_tx.commit();

    res.status(200).json({
      success: true,
      message:
        refundPercentage > 0
          ? `Beach Fest booking cancelled successfully. ₹${refundAmount} refunded (excluding service fee).`
          : "Beach Fest booking cancelled successfully. No refund applicable.",
      refundAmount,
      refundPercentage,
    });
  } catch (error) {
    console.error("Error cancelling beach fest booking:", error);
    await t.rollback();
    res.status(500).json({ success: false, message: "Something went wrong." });
  }
};
// Festbite cancel
const cancelFestbite = async (req, res) => {
  const user_tx = await usersequel.transaction();
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const festbite = await Festbite.findByPk(id);

    if (!festbite) {
      return res
        .status(404)
        .json({ success: false, message: "Festbite not found." });
    }

    if (festbite.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to cancel this festbite.",
      });
    }

    // ❌ Cancel pending referral rewards
    await FestgoCoinToIssue.update(
      { status: "cancelled" },
      {
        where: {
          sourceId: festbite.id,
          type: "festbite_referral",
          sourceType: "festbite",
          status: "pending",
        },
        transaction: user_tx,
      }
    );

    await FestGoCoinHistory.update(
      { status: "not valid" },
      {
        where: {
          referenceId: festbite.id,
          status: "pending",
        },
        transaction: user_tx,
      }
    );

    // 🪙 Refund used coins (if any)
    const usedCoinHistory = await FestGoCoinHistory.findOne({
      where: {
        reason: "festbite",
        referenceId: festbite.id,
        userId: festbite.userId,
        status: "pending",
        type: "used",
      },
      transaction: user_tx,
    });

    let refundedCoins = 0;
    if (usedCoinHistory) {
      const totalUsedCoins = usedCoinHistory.coins;
      refundedCoins = totalUsedCoins;

      if (refundedCoins > 0) {
        const txnsToRestore = await FestgoCoinTransaction.findAll({
          where: {
            userId: festbite.userId,
            expiresAt: {
              [Op.gte]: new Date(),
            },
          },
          order: [["expiresAt", "ASC"]],
          transaction: user_tx,
        });

        let remainingToRefund = refundedCoins;

        if (txnsToRestore.length === 0) {
          // No active transactions -> fallback refund (7 day validity)
          await FestgoCoinTransaction.create(
            {
              userId: festbite.userId,
              type: "refund_grace_period",
              amount: refundedCoins,
              remaining: refundedCoins,
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
            { transaction: user_tx }
          );
        } else {
          // Refund back into existing transactions
          for (const txn of txnsToRestore) {
            const originallyUsed = txn.amount - txn.remaining;
            const refundable = Math.min(originallyUsed, remainingToRefund);

            if (refundable <= 0) continue;

            txn.remaining += refundable;
            remainingToRefund -= refundable;

            await txn.save({ transaction: user_tx });

            if (remainingToRefund <= 0) break;
          }

          // Still some left? create fallback refund txn
          if (remainingToRefund > 0) {
            await FestgoCoinTransaction.create(
              {
                userId: festbite.userId,
                type: "refund_grace_period",
                amount: remainingToRefund,
                remaining: remainingToRefund,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              },
              { transaction: user_tx }
            );
          }
        }

        await usedCoinHistory.update(
          { status: "not valid" },
          { transaction: user_tx }
        );
      }
    }

    // ❌ Delete festbite itself
    await festbite.destroy();

    await user_tx.commit();
    res.status(200).json({
      success: true,
      message: "Festbite cancelled successfully.",
    });
  } catch (error) {
    await user_tx.rollback();
    console.error("Error cancelling festbite:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong while cancelling festbite.",
    });
  }
};
const cancelPlanmytrip = async (req, res) => {
  const user_tx = await usersequel.transaction();
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const planmytrip = await PlanMyTrips.findByPk(id);

    if (!planmytrip) {
      return res
        .status(404)
        .json({ success: false, message: "Festbite not found." });
    }

    if (planmytrip.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to cancel this festbite.",
      });
    }

    // ❌ Cancel pending referral rewards
    await FestgoCoinToIssue.update(
      { status: "cancelled" },
      {
        where: {
          sourceId: planmytrip.id,
          type: "trips_referral",
          sourceType: "trips",
          status: "pending",
        },
        transaction: user_tx,
      }
    );

    await FestGoCoinHistory.update(
      { status: "not valid" },
      {
        where: {
          referenceId: planmytrip.id,
          status: "pending",
        },
        transaction: user_tx,
      }
    );

    // 🪙 Refund used coins (if any)
    const usedCoinHistory = await FestGoCoinHistory.findOne({
      where: {
        reason: "trips_booking",
        referenceId: planmytrip.id,
        userId: planmytrip.userId,
        status: "pending",
        type: "used",
      },
      transaction: user_tx,
    });

    let refundedCoins = 0;
    if (usedCoinHistory) {
      const totalUsedCoins = usedCoinHistory.coins;
      refundedCoins = totalUsedCoins;

      if (refundedCoins > 0) {
        const txnsToRestore = await FestgoCoinTransaction.findAll({
          where: {
            userId: planmytrip.userId,
            expiresAt: {
              [Op.gte]: new Date(),
            },
          },
          order: [["expiresAt", "ASC"]],
          transaction: user_tx,
        });

        let remainingToRefund = refundedCoins;

        if (txnsToRestore.length === 0) {
          // No active transactions -> fallback refund (7 day validity)
          await FestgoCoinTransaction.create(
            {
              userId: planmytrip.userId,
              type: "refund_grace_period",
              amount: refundedCoins,
              remaining: refundedCoins,
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
            { transaction: user_tx }
          );
        } else {
          // Refund back into existing transactions
          for (const txn of txnsToRestore) {
            const originallyUsed = txn.amount - txn.remaining;
            const refundable = Math.min(originallyUsed, remainingToRefund);

            if (refundable <= 0) continue;

            txn.remaining += refundable;
            remainingToRefund -= refundable;

            await txn.save({ transaction: user_tx });

            if (remainingToRefund <= 0) break;
          }

          // Still some left? create fallback refund txn
          if (remainingToRefund > 0) {
            await FestgoCoinTransaction.create(
              {
                userId: planmytrip.userId,
                type: "refund_grace_period",
                amount: remainingToRefund,
                remaining: remainingToRefund,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              },
              { transaction: user_tx }
            );
          }
        }

        await usedCoinHistory.update(
          { status: "not valid" },
          { transaction: user_tx }
        );
      }
    }

    // ❌ Delete festbite itself
    await planmytrip.destroy();

    await user_tx.commit();
    res.status(200).json({
      success: true,
      message: "Festbite cancelled successfully.",
    });
  } catch (error) {
    await user_tx.rollback();
    console.error("Error cancelling festbite:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong while cancelling festbite.",
    });
  }
};
const cancelTripBooking = async (req, res) => {
  const user_tx = await usersequel.transaction();
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const trip_booking = await TripsBooking.findByPk(id);

    if (!trip_booking) {
      return res
        .status(404)
        .json({ success: false, message: "Trip booking not found." });
    }

    if (trip_booking.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to cancel this festbite.",
      });
    }
    await FestgoCoinToIssue.update(
      { status: "cancelled" },
      {
        where: {
          sourceId: trip_booking.id,
          type: "trips_referral",
          sourceType: "trips",
          status: "pending",
        },

        transaction: user_tx,
      }
    );
    await FestGoCoinHistory.update(
      { status: "not valid" },
      {
        where: {
          referenceId: trip_booking.id,
          type: "earned",
          status: "pending",
        },
        transaction: user_tx,
      }
    );
    const today = moment();
    const eventStartDate = moment(trip_booking.startDate);
    const daysBeforeEvent = eventStartDate.diff(today, "days");

    let refundPercentage = 0;
    if (daysBeforeEvent >= 4) {
      refundPercentage = 100;
    } else if (daysBeforeEvent >= 2) {
      refundPercentage = 50;
    }
    let refundAmount = 0;

    // 3.a Refund actual payment
    if (refundPercentage > 0 && trip_booking.transaction_id) {
      const refundableAmount =
        trip_booking.amount_paid - (trip_booking.service_fee || 0);

      refundAmount = Math.round(refundableAmount * (refundPercentage / 100));
      if (refundAmount > 0) {
        await refundPayment({
          payment_id: trip_booking.transaction_id,
          amount: refundAmount,
        });
      }
    }
    const usedCoinHistory = await FestGoCoinHistory.findOne({
      where: {
        referenceId: trip_booking.id,
        type: "used",
      },
      transaction: user_tx,
    });
    if (usedCoinHistory && refundPercentage > 0) {
      const refundCoins = Math.round(
        usedCoinHistory.amount * (refundPercentage / 100)
      );

      if (refundCoins > 0) {
        // Step 1: Create refund record in coin history
        await FestGoCoinHistory.create(
          {
            userId: trip_booking.userId,
            referenceId: trip_booking.id,
            type: "refund",
            amount: refundCoins,
            status: "issued",
            reason: "trip_cancellation",
          },
          { transaction: user_tx }
        );

        // Step 2: Try to restore coins back to original transactions
        const txnsToRestore = await FestgoCoinTransaction.findAll({
          where: {
            userId: trip_booking.userId,
            expiresAt: {
              [Op.gte]: new Date(), // Only restore to non-expired txns
            },
          },
          order: [["expiresAt", "ASC"]],
          transaction: user_tx,
        });

        let remainingToRefund = refundCoins;

        for (const txn of txnsToRestore) {
          // originallyUsed = total coins spent from this txn
          const originallyUsed = txn.amount - txn.remaining;

          // refundable = min(coins used from this txn, remaining refund)
          const refundable = Math.min(originallyUsed, remainingToRefund);

          if (refundable <= 0) continue;

          txn.remaining += refundable; // give back coins to txn
          remainingToRefund -= refundable;

          await txn.save({ transaction: user_tx });

          if (remainingToRefund <= 0) break;
        }

        // Step 3: If some refund couldn't be restored, issue grace period txn
        if (remainingToRefund > 0) {
          await FestgoCoinTransaction.create(
            {
              userId: trip_booking.userId,
              type: "refund_grace_period",
              amount: remainingToRefund,
              remaining: remainingToRefund,
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days validity
            },
            { transaction: user_tx }
          );
        }

        // Step 4: Mark original usage history as not valid
        await usedCoinHistory.update(
          { status: "not valid" },
          { transaction: user_tx }
        );
      }
    }
    await trip_booking.update({
      booking_status: "cancelled",
      payment_status: refundPercentage > 0 ? "refunded" : "norefund",
    });
    await user_tx.commit();
    res.status(200).json({
      success: true,
      message: "Trip cancelled successfully.",
    });
  } catch (error) {
    await user_tx.rollback();
    console.error("Error cancelling festbite:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong while cancelling festbite.",
    });
  }
};

module.exports = {
  cancelPropertyBooking,
  cancelEventBooking,
  cancelBeachFestBooking,
  cancelFestbite,
  cancelPlanmytrip,
  cancelTripBooking,
};
