const {
  property_booking,
  Property,
  RoomBookedDate,
  beachfests_booking,
  beach_fests,
  Event,
  sequelize, // your services sequelize instance
} = require("../models/services");

const { refundPayment } = require("../libs/payments/razorpay");
const moment = require("moment");
const cancelPropertyBooking = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await property_booking.findOne({
      where: { id, payment_status: "paid" },
    });

    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "Booking not found." });
    }

    const property = await Property.findByPk(booking.propertyId);
    const policy = property?.policies?.cancellationProperty || "Flexible";

    const today = moment();
    const checkInDate = moment(booking.check_in_date);
    const daysBeforeCheckin = checkInDate.diff(today, "days");

    let refundPercentage = 0;

    switch (policy) {
      case "Flexible":
        if (daysBeforeCheckin >= 1) refundPercentage = 100;
        break;

      case "Moderate":
        if (daysBeforeCheckin >= 5) refundPercentage = 100;
        break;

      case "Firm":
        if (daysBeforeCheckin >= 30) refundPercentage = 50;
        break;

      case "Strict":
        if (daysBeforeCheckin >= 7) refundPercentage = 50;
        break;

      case "Super Strict 30":
        if (daysBeforeCheckin >= 30) refundPercentage = 50;
        break;

      case "Super Strict 60":
        if (daysBeforeCheckin >= 60) refundPercentage = 50;
        break;

      case "Non-Refundable":
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

        console.log("Refund processed:", refund);
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

    res.status(200).json({
      success: true,
      message:
        refundPercentage > 0
          ? `Booking cancelled. ₹${refundAmount} refunded (${refundPercentage}% of amount excluding service charges).`
          : "Booking cancelled. No refund applicable as per cancellation policy.",
      refundAmount,
      refundPercentage,
      cancellationPolicy: policy,
    });
  } catch (error) {
    console.error("Error cancelling property booking:", error);
    res.status(500).json({ success: false, message: "Something went wrong." });
  }
};

// Event booking cancel placeholder
const cancelEventBooking = async (req, res) => {
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

    await event.destroy();

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
  try {
    const { id } = req.params;

    const booking = await beachfests_booking.findByPk(id, { transaction: t });
    if (!booking) {
      await t.rollback();
      return res
        .status(404)
        .json({ success: false, message: "Booking not found." });
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

    await t.commit();

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

module.exports = {
  cancelPropertyBooking,
  cancelEventBooking,
  cancelBeachFestBooking,
};
