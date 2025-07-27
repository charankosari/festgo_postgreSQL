const {
  beach_fests,
  beachfests_booking,
  sequelize,
  Offers,
} = require("../models/services");
const {
  FestgoCoinToIssue,
  FestGoCoinHistory,
  FestgoCoinTransaction,
  usersequel,
} = require("../models/users");
const { createOrder, refundPayment } = require("../libs/payments/razorpay"); // your Razorpay order util
const {
  handleUserReferralForBeachFestBooking,
} = require("../utils/issueCoins");
const { applyUsableFestgoCoins } = require("../utils/festgo_coins_apply");

exports.createBeachFestBooking = async (req, res) => {
  const t = await sequelize.transaction();
  const user_tx = await usersequel.transaction();

  try {
    const {
      id,
      fest_type,
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
    // 1️⃣ Fetch Beachfest with lock FOR UPDATE
    const fest = await beach_fests.findByPk(id, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!fest) {
      await t.rollback();
      await user_tx.rollback();
      return res
        .status(404)
        .json({ success: false, message: "Beachfest not found." });
    }

    if (fest.available_passes < passes) {
      await t.rollback();
      await user_tx.rollback();
      return res.status(400).json({
        success: false,
        message: `Only ${fest.available_passes} passes available.`,
      });
    }

    // 2️⃣ Calculate Service Fee & GST slab based on baseAmount
    const baseAmount = fest.price_per_pass * passes;
    let price_after_offer = baseAmount;
    let offer_discount = 0;
    let applied_offer_id = null;
    if (coupon_code && coupon_code.trim() !== "") {
      const today = new Date().toISOString().split("T")[0];

      const offer = await Offers.findOne({
        where: {
          promoCode: coupon_code.trim(),
          offerFor: "beach_fests",
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
        offer.entityIds.includes(id) // match beachfest_id
      ) {
        const discountValue = parseFloat(offer.discount); // Ex: "15"
        if (!isNaN(discountValue)) {
          offer_discount = Math.round((baseAmount * discountValue) / 100);
          price_after_offer = baseAmount - offer_discount;
          applied_offer_id = coupon_code.trim(); // you can store offer.id if needed
          console.log(
            `✔️ Offer '${offer.name}' applied. Discount: ${offer_discount}`
          );
        }
      } else {
        console.log("❌ Invalid or inapplicable coupon code provided.");
      }
    }
    let coinResult = {
      usable_coins: 0,
      coins_discount_value: 0,
      amount_to_be_paid: price_after_offer,
      coin_history_inputs: null,
    };
    if (requestedCoins && requestedCoins > 0) {
      coinResult = await applyUsableFestgoCoins({
        userId,
        requestedCoins,
        total_price: price_after_offer,
        transaction: t,
        user_tx: user_tx,
        type: "beachfest",
      });
    }
    const afterCoinAmount = coinResult.amount_to_be_paid;

    let gstPercentage = 0;
    let serviceFee = 50;

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

    // 3️⃣ Create Booking
    const newBooking = await beachfests_booking.create(
      {
        user_id: userId,
        beachfest_id: id,
        type: fest_type,
        name,
        phone,
        email,
        payment_method,
        passes,
        event_start: fest.event_start,
        event_end: fest.event_end,
        service_fee: serviceFee,
        base_price: baseAmount,
        gst_fee: parseFloat(gstAmount.toFixed(2)),
        gst_percentage: gstPercentage,
        amount_paid: parseFloat(totalPayable.toFixed(2)),
        payment_status: "pending",
        booking_status: "pending",
        festgo_coins_used: coinResult.usable_coins,
        festgo_coin_discount: coinResult.coins_discount_value,
        offer_discount,
        coupon_code: applied_offer_id,
      },
      { transaction: t }
    );

    // 5️⃣ Create Razorpay Order
    const razorpayOrder = await createOrder({
      order_id: newBooking.id,
      amount: parseFloat(totalPayable.toFixed(2)),
      notes: {
        payment_for: "beachfest_booking",
        payment_type: payment_method,
        booking_id: newBooking.id,
      },
    });
    //HANDLE REFERRAL
    if (referral_id && referral_id.trim() !== "") {
      handleUserReferralForBeachFestBooking(
        referral_id.trim(),
        userId,
        newBooking.id,
        id,
        fest.event_end,
        t
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

    // 6️⃣ Commit Transaction
    await t.commit();
    await user_tx.commit();
    // 7️⃣ Return response
    return res.status(201).json({
      success: true,
      message: "Booking created successfully.",
      data: {
        booking: newBooking,
        razorpayOrder,
      },
    });
  } catch (error) {
    console.error("Error creating beachfest booking:", error);
    await t.rollback();
    await user_tx.rollback();
    return res.status(500).json({
      success: false,
      message: "Something went wrong while creating booking.",
      error: error.message,
    });
  }
};

exports.handleBeachfestPaymentSuccess = async (bookingId, transactionId) => {
  const t = await sequelize.transaction();
  const user_tx = await usersequel.transaction();
  try {
    const booking = await beachfests_booking.findByPk(bookingId, {
      transaction: t,
    });
    if (!booking) throw new Error("Booking not found.");

    const fest = await beach_fests.findByPk(booking.beachfest_id, {
      transaction: t,
    });
    if (!fest) throw new Error("Beachfest not found.");

    if (fest.available_passes < booking.passes) {
      // No passes left — refund scenario
      await beachfests_booking.update(
        {
          payment_status: "failed",
          booking_status: "cancelled",
          transaction_id: transactionId,
        },
        { where: { id: bookingId }, transaction: t }
      );

      // 👉 Initiate refund via Razorpay API
      await refundPayment({
        payment_id: transactionId,
        amount: booking.amount_paid,
      });
      await FestGoCoinHistory.update(
        {
          status: "not_valid",
        },
        {
          where: {
            referenceId: bookingId,
            reason: "beachfest referral",
            status: "pending", // Only if it's still pending
          },
          transaction: user_tx,
        }
      );

      // 🪙 Cancel coin to issue if exists
      await FestgoCoinToIssue.update(
        {
          status: "cancelled",
          issue: false,
        },
        {
          where: {
            booking_id: bookingId,
            sourceType: "beachfest",
            type: "beachfest_referral",
            status: "pending",
          },
          transaction: user_tx,
        }
      );
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
      await t.commit();
      await user_tx.commit();

      console.log(
        `❌ Booking ${bookingId} cancelled — no passes left. Refund done.`
      );
      return { success: false, message: "No passes left — amount refunded." };
    }

    // Else — Confirm booking and deduct passes
    fest.available_passes -= booking.passes;
    await fest.save({ transaction: t });

    await beachfests_booking.update(
      {
        payment_status: "paid",
        booking_status: "confirmed",
        transaction_id: transactionId,
      },
      { where: { id: bookingId }, transaction: t }
    );
    const coinToIssue = await FestgoCoinToIssue.findOne({
      where: {
        booking_id: bookingId,
        sourceType: "beachfest",
        type: "beachfest_referral",
        status: "pending",
        issue: false,
      },
      transaction: user_tx,
    });
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
    if (coinToIssue) {
      coinToIssue.issue = true;
      await coinToIssue.save({ transaction: user_tx });
    }

    await CronThing.upsert(
      {
        entity: "beachfest_coins_issue",
        active: true,
        last_run: new Date(),
      },
      { transaction: t }
    );
    await user_tx.commit();
    await t.commit();
    console.log(`✅ Booking ${bookingId} confirmed, passes deducted.`);
    return { success: true, message: "Booking confirmed." };
  } catch (error) {
    await t.rollback();
    await user_tx.rollback();

    console.error("Error in handleBeachfestPaymentSuccess:", error);
    return { success: false, message: error.message };
  }
};

exports.handleBeachfestPaymentFailure = async (bookingId) => {
  const user_tx = await usersequel.transaction();
  const service_tx = await usersequel.transaction();
  try {
    await beachfests_booking.update(
      {
        payment_status: "failed",
        booking_status: "cancelled",
      },
      {
        where: { id: bookingId },
        transaction: service_tx,
      }
    );

    await FestGoCoinHistory.update(
      {
        status: "not_valid",
      },
      {
        where: {
          referenceId: bookingId,
          reason: "beachfest referral",
          status: "pending", // Only if it's still pending
        },
        transaction: user_tx,
      }
    );

    // 🪙 Cancel coin to issue if exists
    await FestgoCoinToIssue.update(
      {
        status: "cancelled",
        issue: false,
      },
      {
        where: {
          booking_id: bookingId,
          sourceType: "beachfest",
          type: "beachfest_referral",
          status: "pending",
        },
        transaction: user_tx,
      }
    );
    const history = await FestGoCoinHistory.findOne({
      where: {
        referenceId: bookingId,
        type: "used",
        status: "pending",
      },
      transaction: user_tx,
    });
    if (history) {
      const booking = await beachfests_booking.findOne({
        where: { id: bookingId },
        transaction: service_tx,
      });

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

      await history.update({ status: "not_valid" }, { transaction: user_tx });
    }
    await user_tx.commit();
    await service_tx.commit();
    console.log(`❌ Beachfest Booking ${bookingId} cancelled.`);
    return true;
  } catch (error) {
    await user_tx.rollback();
    await service_tx.rollback();
    console.error("Error in handleBeachfestPaymentFailure:", error);
    return false;
  }
};
