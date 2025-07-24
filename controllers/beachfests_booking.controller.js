const {
  beach_fests,
  beachfests_booking,
  sequelize,
  FestgoCoinSetting,
} = require("../models/services");
const {
  User,
  FestGoCoinHistory,
  FestgoCoinToIssue,
  usersequel,
} = require("../models/users");
const { createOrder, refundPayment } = require("../libs/payments/razorpay"); // your Razorpay order util
const handleUserReferralForBeachFestBooking = async (
  referral_id,
  referredUserId,
  bookingId,
  beachfest_id,
  service_tx
) => {
  if (!referral_id || referral_id.trim() === "") {
    console.log("🚫 Referral ID empty. Skipping.");
    return;
  }

  const user_tx = await usersequel.transaction();
  console.log("🔄 Started user referral transaction");

  try {
    const referredUser = await User.findByPk(referredUserId, {
      transaction: user_tx,
    });
    if (!referredUser) {
      console.log(`🚫 Referred user not found: ${referredUserId}`);
      await user_tx.rollback();
      return;
    }

    const referrer = await User.findOne({
      where: { referralCode: referral_id },
      transaction: user_tx,
    });
    if (!referrer || referrer.id === referredUserId) {
      console.log("🚫 Invalid referral. Referrer not found or self-referral.");
      await user_tx.rollback();
      return;
    }
    const setting = await FestgoCoinSetting.findOne({
      where: { type: "beach_fest" },
      transaction: service_tx,
    });
    if (!setting || Number(setting.coins_per_referral) <= 0) {
      console.log("🚫 No coin setting found or zero coins.");
      await user_tx.rollback();
      return;
    }

    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);
    thisMonthStart.setHours(0, 0, 0, 0);

    const referralCount = await FestGoCoinHistory.count({
      where: {
        userId: referrer.id,
        reason: "beachfest referral",
        createdAt: { [Op.gte]: thisMonthStart },
        status: ["pending", "issued"],
      },
      transaction: user_tx,
    });

    if (referralCount >= (setting.monthly_referral_limit || 0)) {
      console.log("🚫 Monthly referral limit reached.");
      await user_tx.rollback();
      return;
    }

    await FestGoCoinHistory.create(
      {
        userId: referrer.id,
        type: "earned",
        reason: "beachfest referral",
        referenceId: bookingId,
        coins: Number(setting.coins_per_referral),
        status: "pending",
        metaData: {
          referral: referral_id,
          referredUser: referredUserId,
          beachfestId: beachfest_id,
        },
      },
      { transaction: user_tx }
    );

    await FestgoCoinToIssue.create(
      {
        booking_id: bookingId,
        userId: referrer.id,
        referral_id,
        sourceType: "beachfest",
        sourceId: beachfest_id,
        coinsToIssue: Number(setting.coins_per_referral),
        status: "pending",
        type: "beachfest_referral",
        issueAt: new Date(checkOutDate.getTime() + 86400000),
        issue: false,
        metaData: {
          referredUserId,
          bookingId: bookingId,
        },
      },
      { transaction: user_tx }
    );

    await CronThing.upsert(
      {
        entity: "beachfest_coins_issue",
        active: true,
        last_run: new Date(),
      },
      { transaction: service_tx }
    );

    await user_tx.commit();
    console.log(`✅ Referral reward set for user ${referrer.id}`);
  } catch (err) {
    await user_tx.rollback();
    console.error("❌ Error in referral handler:", err);
    throw err;
  }
};

exports.createBeachFestBooking = async (req, res) => {
  const t = await sequelize.transaction();
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
    } = req.body;

    const userId = req.user.id;

    // 1️⃣ Fetch Beachfest with lock FOR UPDATE
    const fest = await beach_fests.findByPk(id, {
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!fest) {
      await t.rollback();
      return res
        .status(404)
        .json({ success: false, message: "Beachfest not found." });
    }

    if (fest.available_passes < passes) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: `Only ${fest.available_passes} passes available.`,
      });
    }

    // 2️⃣ Calculate Service Fee & GST slab based on baseAmount
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
        gst_fee: parseFloat(gstAmount.toFixed(2)),
        gst_percentage: gstPercentage,
        amount_paid: parseFloat(totalPayable.toFixed(2)),
        payment_status: "pending",
        booking_status: "pending",
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
        t
      ).catch((err) => {
        console.error("❌ Error handling referral (non-blocking):", err);
      });
    }
    // 6️⃣ Commit Transaction
    await t.commit();

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
    return res.status(500).json({
      success: false,
      message: "Something went wrong while creating booking.",
      error: error.message,
    });
  }
};

exports.handleBeachfestPaymentSuccess = async (bookingId, transactionId) => {
  const t = await sequelize.transaction();
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

      await t.commit();

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

    await t.commit();
    console.log(`✅ Booking ${bookingId} confirmed, passes deducted.`);
    return { success: true, message: "Booking confirmed." };
  } catch (error) {
    await t.rollback();
    console.error("Error in handleBeachfestPaymentSuccess:", error);
    return { success: false, message: error.message };
  }
};
exports.handleBeachfestPaymentFailure = async (bookingId) => {
  try {
    await beachfests_booking.update(
      {
        payment_status: "failed",
        booking_status: "cancelled",
      },
      { where: { id: bookingId } }
    );
    console.log(`❌ Beachfest Booking ${bookingId} cancelled.`);
    return true;
  } catch (error) {
    console.error("Error in handleBeachfestPaymentFailure:", error);
    return false;
  }
};
