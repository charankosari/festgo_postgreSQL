const {
  city_fest,
  city_fest_booking,
  sequelize,
} = require("../models/services");
const { createOrder, refundPayment } = require("../libs/payments/razorpay");
exports.createCityFestBooking = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id, name, phone, email, payment_method, passes } = req.body;
    const userId = req.user.id;

    const fest = await city_fest.findByPk(id, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!fest) {
      await t.rollback();
      return res
        .status(404)
        .json({ success: false, message: "CityFest not found." });
    }

    if (fest.available_passes < passes) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: `Only ${fest.available_passes} passes available.`,
      });
    }

    const baseAmount = fest.price_per_pass * passes;
    let gstPercentage = 0;
    let serviceFee = 50;

    if (baseAmount <= 1000) {
      gstPercentage = 0;
      serviceFee = 50;
    } else if (baseAmount > 1000 && baseAmount <= 7000) {
      gstPercentage = 12;
      serviceFee = 50;
    } else if (baseAmount > 7000 && baseAmount <= 8000) {
      gstPercentage = 12;
      serviceFee = 150;
    } else if (baseAmount > 8000) {
      gstPercentage = 18;
      serviceFee = 200;
    }

    const gstAmount = ((baseAmount + serviceFee) * gstPercentage) / 100;
    const totalPayable = baseAmount + serviceFee + gstAmount;

    const newBooking = await city_fest_booking.create(
      {
        user_id: userId,
        cityfest_id: fest.id,
        city_fest_category_id: fest.categoryId,
        name,
        phone,
        email,
        payment_method,
        passes,
        event_start: fest.event_start,
        event_end: fest.event_end,
        service_fee: serviceFee,
        gst_fee: parseFloat(gstAmount.toFixed(2)),
        gst_percentage: gstPercentage,
        amount_paid: parseFloat(totalPayable.toFixed(2)),
        payment_status: "pending",
        booking_status: "pending",
      },
      { transaction: t }
    );

    const razorpayOrder = await createOrder({
      order_id: newBooking.id,
      amount: parseFloat(totalPayable.toFixed(2)),
      notes: {
        payment_for: "cityfest_booking",
        payment_type: payment_method,
        booking_id: newBooking.id,
      },
    });

    await t.commit();

    return res.status(201).json({
      success: true,
      message: "CityFest booking created successfully.",
      data: {
        booking: newBooking,
        razorpayOrder,
      },
    });
  } catch (error) {
    console.error("Error creating cityfest booking:", error);
    await t.rollback();
    return res.status(500).json({
      success: false,
      message: "Something went wrong while creating booking.",
      error: error.message,
    });
  }
};

exports.handleCityfestPaymentSuccess = async (bookingId, transactionId) => {
  const t = await sequelize.transaction();
  try {
    // 🔍 Get booking
    const booking = await city_fest_booking.findByPk(bookingId, {
      transaction: t,
    });
    if (!booking) throw new Error("Booking not found.");

    // 🔍 Get corresponding CityFest
    const fest = await city_fest.findByPk(booking.cityfest_id, {
      transaction: t,
    });
    if (!fest) throw new Error("CityFest not found.");

    // ❌ If not enough passes left, refund
    if (fest.available_passes < booking.passes) {
      await city_fest_booking.update(
        {
          payment_status: "failed",
          booking_status: "cancelled",
          transaction_id: transactionId,
        },
        { where: { id: bookingId }, transaction: t }
      );

      await refundPayment({
        payment_id: transactionId,
        amount: booking.amount_paid,
      });

      await t.commit();
      console.log(
        `❌ CityFest Booking ${bookingId} cancelled — no passes left. Refund done.`
      );
      return { success: false, message: "No passes left — amount refunded." };
    }

    // ✅ Otherwise — Confirm booking, deduct passes
    fest.available_passes -= booking.passes;
    await fest.save({ transaction: t });

    await city_fest_booking.update(
      {
        payment_status: "paid",
        booking_status: "confirmed",
        transaction_id: transactionId,
      },
      { where: { id: bookingId }, transaction: t }
    );

    await t.commit();
    console.log(`✅ CityFest Booking ${bookingId} confirmed, passes deducted.`);
    return { success: true, message: "Booking confirmed." };
  } catch (error) {
    await t.rollback();
    console.error("Error in handleCityfestPaymentSuccess:", error);
    return { success: false, message: error.message };
  }
};

// 📌 Payment Failure Handler
exports.handleCityfestPaymentFailure = async (bookingId) => {
  try {
    await city_fest_booking.update(
      {
        payment_status: "failed",
        booking_status: "cancelled",
      },
      { where: { id: bookingId } }
    );
    console.log(
      `❌ CityFest Booking ${bookingId} cancelled due to payment failure.`
    );
    return true;
  } catch (error) {
    console.error("Error in handleCityfestPaymentFailure:", error);
    return false;
  }
};
