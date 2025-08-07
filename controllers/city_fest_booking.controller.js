const {
  city_fest,
  city_fest_booking,
  Offers,
  sequelize,
} = require("../models/services");
const { createOrder, refundPayment } = require("../libs/payments/razorpay");
const {
  FestgoCoinToIssue,
  FestGoCoinHistory,
  FestgoCoinTransaction,
  usersequel,
} = require("../models/users");
const { applyUsableFestgoCoins } = require("../utils/festgo_coins_apply");
const { handleUserReferralForCityFestBooking } = require("../utils/issueCoins"); // You'll need to implement this if not existing

exports.createCityFestBooking = async (req, res) => {
  // Make sure Op is imported from sequelize: const { Op } = require("sequelize");
  const t = await sequelize.transaction();
  const user_tx = await usersequel.transaction();

  try {
    const {
      id,
      name,
      phone,
      email,
      payment_method,
      passes,
      referral_id,
      requestedCoins,
      coupon_code,
    } = req.body;

    const userId = req.user.id;

    const fest = await city_fest.findByPk(id, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!fest) {
      await t.rollback();
      await user_tx.rollback();
      return res
        .status(404)
        .json({ success: false, message: "CityFest not found." });
    }

    if (fest.available_passes < passes) {
      await t.rollback();
      await user_tx.rollback();
      return res.status(400).json({
        success: false,
        message: `Only ${fest.available_passes} passes available.`,
      });
    }

    const baseAmount = fest.price_per_pass * passes;

    // --- Offer Logic Start ---
    let price_after_offer = baseAmount;
    let offer_discount = 0;
    let applied_offer_id = null;

    if (coupon_code && coupon_code.trim() !== "") {
      const today = new Date().toISOString().split("T")[0];

      const offer = await Offers.findOne({
        where: {
          promoCode: coupon_code.trim(),
          offerFor: "city_fests", // Use 'city_fests' for this controller
          status: "active",
          bookingWindowStart: { [Op.lte]: today },
          bookingWindowEnd: { [Op.gte]: today },
          stayDatesStart: { [Op.lte]: fest.event_start },
          stayDatesEnd: { [Op.gte]: fest.event_end },
        },
        transaction: t,
      });

      if (
        offer &&
        offer.entityIds &&
        offer.entityIds.includes(id) // match cityfest_id
      ) {
        const discountValue = parseFloat(offer.discount);
        if (!isNaN(discountValue)) {
          offer_discount = Math.round((baseAmount * discountValue) / 100);
          price_after_offer = baseAmount - offer_discount;
          applied_offer_id = coupon_code.trim();
          console.log(
            `✔️ Offer '${offer.name}' applied. Discount: ${offer_discount}`
          );
        }
      } else {
        console.log("❌ Invalid or inapplicable coupon code provided.");
      }
    }
    // --- Offer Logic End ---

    let gstPercentage = 0;
    let serviceFee = 50;

    // GST/Service fee slabs based on original base amount
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

    let coinResult = {
      usable_coins: 0,
      coins_discount_value: 0,
      amount_to_be_paid: price_after_offer, // Base for coins is price after offer
      coin_history_inputs: null,
    };

    if (requestedCoins && requestedCoins > 0) {
      coinResult = await applyUsableFestgoCoins({
        userId,
        requestedCoins,
        total_price: price_after_offer, // Apply coins on the discounted price
        transaction: t,
        user_tx: user_tx,
        type: "cityfest",
      });
    }
    const afterCoinAmount = coinResult.amount_to_be_paid;

    const gstAmount = ((afterCoinAmount + serviceFee) * gstPercentage) / 100;
    const totalPayable = afterCoinAmount + serviceFee + gstAmount;

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
        base_price: baseAmount, // Storing original base price
        offer_discount, // Storing offer discount
        coupon_code: applied_offer_id, // Storing the applied coupon code
        festgo_coins_used: coinResult.usable_coins,
        festgo_coin_discount: coinResult.coins_discount_value,
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

    if (referral_id && referral_id.trim() !== "") {
      handleUserReferralForCityFestBooking(
        referral_id.trim(),
        userId,
        newBooking.id,
        id,
        fest.event_end
      ).catch((err) => {
        console.error("❌ Error handling referral (non-blocking):", err);
      });
    }

    if (
      coinResult.coin_history_inputs &&
      coinResult.coin_history_inputs.length > 0
    ) {
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
      message: "CityFest booking created successfully.",
      data: {
        booking: newBooking,
        razorpayOrder,
      },
    });
  } catch (error) {
    console.error("Error creating cityfest booking:", error);
    await t.rollback();
    await user_tx.rollback();
    return res.status(500).json({
      success: false,
      message: "Something went wrong while creating booking.",
      error: error.message,
    });
  }
};

exports.handleCityfestPaymentSuccess = async (bookingId, transactionId) => {
  // Two transactions: one for booking, one for user coins
  const t = await sequelize.transaction();
  const user_tx = await usersequel.transaction();

  try {
    const booking = await city_fest_booking.findByPk(bookingId, {
      transaction: t,
    });
    if (!booking) throw new Error("Booking not found.");

    const fest = await city_fest.findByPk(booking.cityfest_id, {
      transaction: t,
    });
    if (!fest) throw new Error("CityFest not found.");

    // Scenario 1: No passes left. Refund payment AND coins.
    if (fest.available_passes < booking.passes) {
      await city_fest_booking.update(
        {
          payment_status: "failed",
          booking_status: "cancelled",
          transaction_id: transactionId,
        },
        { where: { id: bookingId }, transaction: t }
      );

      // Refund monetary amount
      await refundPayment({
        payment_id: transactionId,
        amount: booking.amount_paid,
      });

      // --- Start of Added Coin Refund Logic ---

      // Cancel any pending referral coin issuance
      await FestgoCoinToIssue.update(
        { status: "cancelled", issue: false },
        {
          where: {
            booking_id: bookingId,
            sourceType: "cityfest", // Adapted for cityfest
            type: "cityfest_referral", // Adapted for cityfest
            status: "pending",
          },
          transaction: user_tx,
        }
      );

      // Refund coins used for the booking
      const history = await FestGoCoinHistory.findOne({
        where: { referenceId: bookingId, type: "used", status: "pending" },
        transaction: user_tx,
      });

      if (history) {
        let remainingToRefund = history.coins;
        const txnsToRestore = await FestgoCoinTransaction.findAll({
          where: { user_id: booking.user_id },
          order: [["expiredAt", "ASC"]],
          transaction: user_tx,
        });

        for (const txn of txnsToRestore) {
          const originallyUsed = txn.amount - txn.remaining;
          const refundable = Math.min(originallyUsed, remainingToRefund);
          if (refundable <= 0) continue;

          txn.remaining += refundable;
          remainingToRefund -= refundable;
          await txn.save({ transaction: user_tx });

          if (remainingToRefund <= 0) break;
        }
        await history.update({ status: "not valid" }, { transaction: user_tx });
      }
      // --- End of Added Coin Refund Logic ---

      await t.commit();
      await user_tx.commit();

      console.log(
        `❌ CityFest Booking ${bookingId} cancelled — no passes left. Refund done.`
      );
      return { success: false, message: "No passes left — amount refunded." };
    }

    // Scenario 2: Success. Confirm booking and coin statuses.
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

    // --- Start of Added Coin Confirmation Logic ---

    // Confirm the status of coins used
    await FestGoCoinHistory.update(
      { status: "issued" },
      {
        where: { referenceId: bookingId, type: "used", status: "pending" },
        transaction: user_tx,
      }
    );

    // Find and flag the referral coins to be issued
    const coinToIssue = await FestgoCoinToIssue.findOne({
      where: {
        booking_id: bookingId,
        sourceType: "cityfest", // Adapted for cityfest
        type: "cityfest_referral", // Adapted for cityfest
        status: "pending",
      },
      transaction: user_tx,
    });

    if (coinToIssue) {
      coinToIssue.issue = true;
      await coinToIssue.save({ transaction: user_tx });
    }

    // Schedule the cron job for coin issuance
    await upsertCronThing({
      entity: "cityfest_coins_issue", // Adapted for cityfest
      transaction: t,
    });
    // --- End of Added Coin Confirmation Logic ---

    await user_tx.commit();
    await t.commit();

    console.log(`✅ CityFest Booking ${bookingId} confirmed, passes deducted.`);
    return { success: true, message: "Booking confirmed." };
  } catch (error) {
    // Rollback both transactions on any error
    await t.rollback();
    await user_tx.rollback();
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
