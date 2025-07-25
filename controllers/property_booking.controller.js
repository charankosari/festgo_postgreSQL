const {
  property_booking,
  RoomBookedDate,
  RoomRateInventory,
  Property,
  Room,
  beachfests_booking,
  beach_fests,
  Event,
  EventType,
  FestgoCoinSetting,
  Offers,
  zeroBookingInstance,
  sequelize, // your services sequelize instance
} = require("../models/services");

const {
  User,
  FestGoCoinHistory,
  FestgoCoinToIssue,
  FestgoCoinTransaction,
  usersequel,
  UserGstDetails,
} = require("../models/users");
const { createOrder } = require("../libs/payments/razorpay");
const { Op, Transaction } = require("sequelize");
const { customAlphabet } = require("nanoid");
const {
  cancelBeachFestBooking,
  cancelPropertyBooking,
  cancelEventBooking,
} = require("../utils/cancelBookings");
const { upsertCronThing } = require("../utils/cronUtils");
const { applyUsableFestgoCoins } = require("../utils/festgo_coins_apply");
const handleUserReferralForPropertyBooking = async (
  referral_id,
  referredUserId,
  bookingId,
  property_id,
  service_tx // services DB transaction
) => {
  if (!referral_id || referral_id.trim() === "") {
    console.log(
      "🚫 Referral ID is empty or not provided. Skipping referral handling."
    );
    return;
  }

  const user_tx = await usersequel.transaction();
  console.log("🔄 Started user transaction");

  try {
    // Fetch referred user
    const referredUser = await User.findByPk(referredUserId, {
      transaction: user_tx,
    });
    if (!referredUser) {
      console.log(`🚫 Referred user with ID ${referredUserId} not found.`);
      await user_tx.rollback();
      return;
    }
    console.log("✅ Referred user found:", referredUser.id);

    // Fetch referrer by referral code
    const referrer = await User.findOne({
      where: { referralCode: referral_id },
      transaction: user_tx,
    });
    if (!referrer || referrer.id === referredUserId) {
      console.log("🚫 Referrer not found or trying to refer self.");
      await user_tx.rollback();
      return;
    }
    console.log("✅ Referrer found:", referrer.id);

    // Get booking
    const booking = await property_booking.findOne({
      where: {
        user_id: referrer.id,
        property_id: property_id,
        booking_status: "confirmed",
        payment_status: "paid",
      },
      transaction: service_tx,
    });
    if (!booking) {
      console.log("🚫 Booking not found");
      await user_tx.rollback();
      return;
    }
    console.log("✅ Booking found:", booking.id);

    const today = new Date();
    const checkOutDate = new Date(booking.check_out_date);
    if (checkOutDate >= today) {
      console.log("🚫 Checkout date hasn't passed yet. Cannot issue coins.");
      await user_tx.rollback();
      return;
    }
    console.log("✅ Checkout date passed. Proceeding.");

    // Get coin settings
    const setting = await FestgoCoinSetting.findOne({
      where: { type: "property" },
      transaction: service_tx,
    });
    if (!setting || Number(setting.coins_per_referral) <= 0) {
      console.log("🚫 Invalid coin setting or 0 coins per referral.");
      await user_tx.rollback();
      return;
    }
    console.log(
      "✅ Coin setting found. Coins per referral:",
      setting.coins_per_referral
    );

    // Monthly limit check
    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);
    thisMonthStart.setHours(0, 0, 0, 0);

    const referralCount = await FestGoCoinHistory.count({
      where: {
        userId: referrer.id,
        createdAt: {
          [Op.gte]: thisMonthStart,
        },
        status: ["pending", "issued"],
      },
      transaction: user_tx,
    });

    if (referralCount >= (setting.monthly_referral_limit || 0)) {
      console.log("🚫 Monthly referral limit reached:", referralCount);
      await user_tx.rollback();
      return;
    }
    console.log("✅ Monthly referral count is within limit:", referralCount);

    // Create coin history
    await FestGoCoinHistory.create(
      {
        userId: referrer.id,
        type: "earned",
        reason: "property_recommend",
        referenceId: bookingId,
        coins: Number(setting.coins_per_referral),
        status: "pending",
        metaData: {
          referral: referral_id,
          referredUser: referredUser.id,
          propertyId: booking.property_id,
        },
      },
      { transaction: user_tx }
    );
    console.log("🪙 Coin history created.");

    // Create pending coin issue entry
    await FestgoCoinToIssue.create(
      {
        booking_id: booking.id,
        userId: referrer.id,
        referral_id,
        sourceType: "property",
        sourceId: booking.property_id,
        coinsToIssue: Number(setting.coins_per_referral),
        status: "pending",
        type: "property_recommend",
        issueAt: new Date(checkOutDate.getTime() + 86400000), // next day
        issue: false,
        metaData: {
          referredUserId,
          bookingId: booking.id,
        },
      },
      { transaction: user_tx }
    );
    console.log("📦 Coin issue record created for next day.");

    // Upsert cron job entry
    await upsertCronThing({
      entity: "property_coins_issue",
      transaction: service_tx,
    });

    console.log("🕓 CronThing upserted for property_coins_issue");

    // Commit user transaction
    await user_tx.commit();
    console.log(
      `✅ Referral coins scheduled for user ${referrer.id} on booking ${booking.id}`
    );
  } catch (err) {
    await user_tx.rollback();
    console.error("❌ Referral handling error:", err);
    throw err;
  }
};
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const generateReferNo = customAlphabet(alphabet, 8);
exports.bookProperty = async (req, res) => {
  const t = await sequelize.transaction({
    isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE,
  });
  const user_tx = await usersequel.transaction();
  const userId = req.user.id;

  try {
    const {
      property_id,
      room_id,
      check_in_date,
      check_out_date,
      num_adults,
      num_children,
      num_rooms,
      notes,
      gst_number,
      gst_company_name,
      gst_company_address,
      zero_booking,
    } = req.body;
    // ✅ Date validation block (add right after destructuring req.body)
    const now = new Date();
    const checkInDate = new Date(check_in_date);
    const checkOutDate = new Date(check_out_date);
    const coupon_code = req.body.coupon_code;
    if (checkInDate < now.setHours(0, 0, 0, 0)) {
      return res
        .status(400)
        .json({ message: "Check-in date cannot be in the past." });
    }
    if (checkOutDate <= checkInDate) {
      return res
        .status(400)
        .json({ message: "Check-out date must be after check-in date." });
    }

    // Fetch property
    const property = await Property.findOne({
      where: { id: property_id },
      transaction: t,
    });
    if (!property) {
      await t.rollback();
      return res.status(404).json({ message: "Property not found" });
    }

    // Fetch room
    const room = await Room.findOne({
      where: { id: room_id, propertyId: property_id },
      transaction: t,
    });
    if (!room) {
      await t.rollback();
      return res
        .status(404)
        .json({ message: "Room not found in this property" });
    }

    // Fetch user
    const user = await User.findOne({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check room availability
    const existingBookings = await RoomBookedDate.findAll({
      where: {
        roomId: room_id,
        [Op.and]: [
          { checkIn: { [Op.lt]: check_out_date } },
          { checkOut: { [Op.gt]: check_in_date } },
        ],
        status: { [Op.in]: ["pending", "confirmed"] },
      },
      lock: Transaction.LOCK.UPDATE,
      transaction: t,
    });
    const roomRateEntry = await RoomRateInventory.findOne({
      where: {
        propertyId: property_id,
        roomId: room_id,
        date: check_in_date,
      },
      transaction: t,
    });
    const totalBookedRooms = existingBookings.length;
    const totalAvailableRooms = roomRateEntry
      ? roomRateEntry.inventory
      : room.number_of_rooms;
    const availableRooms = totalAvailableRooms - totalBookedRooms;
    if (availableRooms <= 0) {
      await t.rollback();
      return res
        .status(400)
        .json({ message: "No rooms available for the selected dates." });
    }

    if (num_rooms > availableRooms) {
      await t.rollback();
      return res.status(400).json({
        message: `Only ${availableRooms} room(s) available for the selected dates.`,
      });
    }
    const base_price_per_room = roomRateEntry
      ? Number(roomRateEntry.price.offerBaseRate) || 0
      : Number(room.price?.base_price_for_2_adults) || 0;

    const extra_adult_charge_per = roomRateEntry
      ? Number(roomRateEntry.price.offerPlusOne) || 0
      : Number(room.price?.extra_adult_charge) || 0;

    const child_charge_per = Number(room.price?.child_charge) || 0;
    // Total price calculation
    const nights = Math.ceil(
      (new Date(check_out_date) - new Date(check_in_date)) /
        (1000 * 60 * 60 * 24)
    );

    let total_base_price = 0;

    for (let i = 0; i < nights; i++) {
      const currentDate = new Date(check_in_date);
      currentDate.setDate(currentDate.getDate() + i);
      const dateString = currentDate.toISOString().split("T")[0];

      const rate = await RoomRateInventory.findOne({
        where: {
          propertyId: property_id,
          roomId: room_id,
          date: dateString,
        },
        transaction: t,
      });

      const basePriceForThisNight = rate?.price?.offerBaseRate
        ? Number(rate.price.offerBaseRate)
        : Number(room.price?.base_price_for_2_adults) || 0;

      total_base_price += basePriceForThisNight;
    }

    total_base_price *= num_rooms;

    // Calculate included adults per room based on sleeping arrangement
    const base_adults_per_room = room.sleeping_arrangement?.base_adults || 2; // fallback 2 if not defined
    const max_adults_per_room = room.sleeping_arrangement?.max_adults || 2;

    const total_base_adults_included = base_adults_per_room * num_rooms;
    const total_max_adults_allowed = max_adults_per_room * num_rooms;

    if (num_adults > total_max_adults_allowed) {
      await t.rollback();
      return res.status(400).json({
        message: `Maximum ${total_max_adults_allowed} adults allowed for selected number of rooms.`,
      });
    }

    // Calculate extra adults beyond base included
    const extra_adults = Math.max(num_adults - total_base_adults_included, 0);
    const total_extra_adult_charge = extra_adults * extra_adult_charge_per;

    const total_child_charge = num_children * child_charge_per;

    const total_room_price =
      total_base_price + total_extra_adult_charge + total_child_charge;

    let offer_discount = 0;
    let applied_offer_id = null;
    let price_after_offer = total_room_price;
    if (coupon_code && coupon_code.trim() !== "") {
      const today = new Date().toISOString().split("T")[0]; // Format: YYYY-MM-DD

      const offer = await Offers.findOne({
        where: {
          promoCode: coupon_code.trim(),
          offerFor: "property",
          status: "active",
          bookingWindowStart: { [Op.lte]: today },
          bookingWindowEnd: { [Op.gte]: today },
          stayDatesStart: { [Op.lte]: check_in_date },
          stayDatesEnd: { [Op.gte]: check_out_date },
        },
        transaction: t,
      }); // ✅ 3. Apply discount if offer is valid for this property

      if (offer && offer.entityIds && offer.entityIds.includes(property_id)) {
        const discountValue = parseFloat(offer.discount); // "18%" -> 18
        if (!isNaN(discountValue)) {
          offer_discount = Math.round((total_room_price * discountValue) / 100);
          price_after_offer = total_room_price - offer_discount;
          applied_offer_id = coupon_code; // Save the UUID of the offer
          console.log(
            `✔️ Offer '${offer.name}' applied. Discount: ${offer_discount}`
          );
        }
      } else {
        console.log("❌ Invalid or inapplicable coupon code provided."); // Optionally, you could return an error here if the coupon is invalid // return res.status(400).json({ message: "Invalid coupon code." });
      }
    }

    const coinSetting = await FestgoCoinSetting.findOne({
      where: { type: "property" },
    });
    const requestedCoins = coinSetting.single_transaction_limit_value;
    const {
      usable_coins,
      coins_discount_value,
      amount_to_be_paid,
      coin_history_inputs,
    } = await applyUsableFestgoCoins({
      userId: user.id,
      requestedCoins,
      total_room_price: price_after_offer,
      transaction: t,
      user_tx,
    });
    console.log(amount_to_be_paid);
    let gst_rate = 0;
    if (amount_to_be_paid >= 8000) gst_rate = 18;
    else if (amount_to_be_paid >= 1000) gst_rate = 12;

    const gst_amount = (amount_to_be_paid * gst_rate) / 100;

    // ✅ Service Fee slab on total cumulative price
    let service_fee = 50;
    if (amount_to_be_paid >= 1000 && amount_to_be_paid <= 1999)
      service_fee = 50;
    else if (amount_to_be_paid >= 2000 && amount_to_be_paid <= 4999)
      service_fee = 100;
    else if (amount_to_be_paid >= 5000 && amount_to_be_paid <= 7499)
      service_fee = 150;
    else if (amount_to_be_paid >= 7500 && amount_to_be_paid <= 9999)
      service_fee = 200;
    else if (amount_to_be_paid >= 10000) service_fee = 250;

    // ✅ Gross amount to be paid before discounts or coins
    const gross_payable = amount_to_be_paid + gst_amount + service_fee;
    console.log("Gross Payable:", gross_payable);
    // Create booking
    const reciept_no = generateReferNo();
    const newBooking = await property_booking.create(
      {
        user_id: userId,
        property_id,
        room_id,
        check_in_date,
        check_out_date,
        num_adults,
        num_children,
        num_rooms,
        total_amount: total_room_price,
        extra_adult_charges: total_extra_adult_charge,
        child_charges: total_child_charge,
        festgo_coins_used: usable_coins,
        coins_discount_value,
        offer_discount: offer_discount,
        coupon_code: applied_offer_id,
        gst_amount,
        gst_rate,
        service_fee,
        amount_paid: gross_payable,
        payment_method: "online",
        payment_status: "pending",
        booking_status: "pending",
        transaction_id: null,
        gst_number,
        gst_company_name,
        gst_company_address,
        notes,
        reciept: reciept_no,
      },
      { transaction: t }
    );

    // Block room dates
    for (let i = 0; i < num_rooms; i++) {
      await RoomBookedDate.create(
        {
          roomId: room_id,
          propertyId: property_id,
          checkIn: check_in_date,
          checkOut: check_out_date,
          source: "online",
          status: "pending",
          bookingId: newBooking.id,
        },
        { transaction: t }
      );
    }

    // Create Razorpay order
    const razorpayOrder = await createOrder({
      order_id: newBooking.id,
      amount: gross_payable,
      notes: {
        payment_for: "property_booking",
        booking_id: newBooking.id,
      },
    });

    if (req.body.zero_booking === true) {
      // 🟡 Save razorpay order instance in zero_booking_instances
      await zeroBookingInstance.create(
        {
          property_booking_id: newBooking.id,
          instance: razorpayOrder,
        },
        { transaction: t }
      );

      await upsertCronThing({
        entity: "zero_booking",
        transaction: service_tx,
      });
    } else {
      // 🔵 Default cronthing update

      await upsertCronThing({
        entity: "property_booking",
        transaction: service_tx,
      });
    }

    if (req.body.referral_id && req.body.referral_id.trim() !== "") {
      console.log("entering referral handling");
      await handleUserReferralForPropertyBooking(
        req.body.referral_id.trim(),
        user.id,
        newBooking.id,
        property_id,
        t // this is the `sequelize.transaction` object
      );
    }
    if (coin_history_inputs && coin_history_inputs.length > 0) {
      for (let i = 0; i < coin_history_inputs.length; i++) {
        coin_history_inputs[i].referenceId = newBooking.id;
      }

      await FestGoCoinHistory.bulkCreate(coin_history_inputs, {
        transaction: user_tx,
      });
    } else {
      console.log("ℹ️ No coin history entries to create.");
    }

    await t.commit();
    await user_tx.commit();
    const u = await User.findByPk(userId, {
      attributes: {
        exclude: [
          "password",
          "email_otp",
          "mobile_otp",
          "email_otp_expire",
          "mobile_otp_expire",
          "resetPasswordToken",
          "resetPasswordExpire",
          "tokenExpire",
          "token",
          "username",
        ],
      },
    });
    if (gst_number || gst_company_name || gst_company_address) {
      await UserGstDetails.create({
        gst_number,
        gst_company_name,
        gst_company_address,
        property_id,
        booking_id: newBooking.id,
        userId: userId,
      });
    }
    return res.status(201).json({
      message: "Booking created successfully",
      booking: newBooking,
      razorpayOrder,
      user: u,
      status: 201,
    });
  } catch (error) {
    console.error("Booking creation error:", error);
    await t.rollback();
    await user_tx.rollback();
    res.status(500).json({
      message: "Something went wrong while creating booking",
      error: error.message,
      status: 500,
    });
  }
};

exports.handlePaymentSuccess = async (bookingId, transactionId) => {
  const t = await sequelize.transaction({
    isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE,
  });
  const user_tx = await usersequel.transaction();
  try {
    // Fetch booking details
    const booking = await property_booking.findOne({
      where: { id: bookingId },
      transaction: t,
    });

    if (!booking) {
      await t.rollback();
      console.error("Booking not found");
      return false;
    }

    // Fetch room and property info
    const room = await Room.findOne({
      where: { id: booking.room_id },
      transaction: t,
    });

    const roomRate = await RoomRateInventory.findOne({
      where: {
        propertyId: booking.property_id,
        roomId: booking.room_id,
        date: booking.check_in_date,
      },
      transaction: t,
    });

    // Calculate current available inventory
    const totalBookedRooms = await RoomBookedDate.count({
      where: {
        roomId: booking.room_id,
        [Op.and]: [
          { checkIn: { [Op.lt]: booking.check_out_date } },
          { checkOut: { [Op.gt]: booking.check_in_date } },
        ],
        status: { [Op.in]: ["pending", "confirmed"] },
      },
      transaction: t,
    });

    const totalAvailableRooms = roomRate
      ? roomRate.inventory
      : room.number_of_rooms;

    const availableRooms = totalAvailableRooms - totalBookedRooms;

    // If insufficient inventory, trigger refund
    if (availableRooms < booking.num_rooms) {
      // Cancel booking and mark payment as failed
      await property_booking.update(
        {
          payment_status: "failed",
          booking_status: "cancelled",
          transaction_id: transactionId,
        },
        { where: { id: bookingId }, transaction: t }
      );

      await RoomBookedDate.update(
        { status: "cancelled" },
        { where: { bookingId }, transaction: t }
      );

      // Trigger refund API
      await refundPayment({
        payment_id: transactionId,
        amount: booking.amount_paid,
      });
      await FestgoCoinToIssue.update(
        { status: "cancelled" },
        {
          where: {
            booking_id: bookingId,
            status: "pending",
          },
          transaction: t,
        }
      );

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
            user_id: booking.user_id,
          },
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
        `❌ Booking ${bookingId} cancelled due to overbooking, refund initiated.`
      );
      return false;
    }

    // Else, confirm the booking
    await property_booking.update(
      {
        payment_status: "paid",
        booking_status: "confirmed",
        transaction_id: transactionId,
      },
      { where: { id: bookingId }, transaction: t }
    );

    await RoomBookedDate.update(
      { status: "confirmed" },
      { where: { bookingId, status: "pending" }, transaction: t }
    );
    await FestgoCoinToIssue.update(
      { issue: true },
      {
        where: {
          booking_id: bookingId,
          issue: false,
        },
        transaction: user_tx,
      }
    );

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
    if (booking.zero_booking) {
      await zeroBookingInstance.destroy({
        where: { property_booking_id: bookingId },
        transaction: t,
      });
    }

    await t.commit();
    await user_tx.commit();
    console.log(`✅ Booking ${bookingId} confirmed, rooms blocked.`);
    return true;
  } catch (error) {
    console.error("Error in handlePaymentSuccess:", error);
    await t.rollback();
    await user_tx.rollback();
    return false;
  }
};

// On Payment Failure
exports.handlePaymentFailure = async (bookingId) => {
  const user_tx = await usersequel.transaction();
  try {
    // Update booking status
    await property_booking.update(
      {
        payment_status: "failed",
        booking_status: "cancelled",
      },
      { where: { id: bookingId } }
    );
    const booking = await property_booking.findByPk(bookingId);
    // Release room holds
    await RoomBookedDate.destroy({
      where: { bookingId, status: "pending" },
    });
    await FestgoCoinToIssue.update(
      { status: "cancelled" },
      {
        where: {
          booking_id: bookingId,
          status: "pending",
        },
        transaction: user_tx,
      }
    );

    await FestGoCoinHistory.update(
      { status: "not valid" },
      {
        where: {
          referenceId: bookingId,
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
        where: {
          user_id: booking.user_id,
        },
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

    await user_tx.commit();
    console.log(`❌ Booking ${bookingId} cancelled, rooms released.`);
    return true;
  } catch (error) {
    await user_tx.rollback();
    console.error("Error in handlePaymentFailure:", error);
    return false;
  }
};

exports.getMyBookings = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findByPk(userId, {
      attributes: {
        exclude: [
          "password",
          "email_otp",
          "mobile_otp",
          "email_otp_expire",
          "mobile_otp_expire",
          "resetPasswordToken",
          "resetPasswordExpire",
          "tokenExpire",
          "token",
          "username",
        ],
      },
    });
    // 📌 Fetch property bookings (paid/refunded)
    const propertyBookings = await property_booking.findAll({
      where: {
        user_id: userId,
        payment_status: {
          [Op.in]: ["paid", "refunded", "norefund"],
        },
      },
      order: [["createdAt", "DESC"]],
    });

    const propertyBookingsWithDetails = await Promise.all(
      propertyBookings.map(async (booking) => {
        const prop = await Property.findByPk(booking.property_id, {
          attributes: ["location", "name", "photos", "property_type"],
        });

        const room = await Room.findByPk(booking.room_id, {
          attributes: ["room_name"],
        });

        // let photoUrls = [];
        // if (prop && prop.photos && Array.isArray(prop.photos)) {
        //   try {
        //     photoUrls = prop.photos.map((photoStr) => {
        //       const photoObj = JSON.parse(photoStr);
        //       return photoObj.url;
        //     });
        //   } catch (err) {
        //     console.error("Error parsing property photos JSON string:", err);
        //   }
        // }
        const photos = (prop.photos || []).map((photo) => photo.imageURL);
        return {
          ...booking.toJSON(),
          property_location: prop ? prop.location : null,
          property_type: prop ? prop.property_type : null,
          property_name: prop ? prop.name : null,
          property_photos: photos,
          room_name: room ? room.room_name : null,
        };
      })
    );

    // 📌 Fetch beachfest bookings (paid/refunded)
    const beachfestBookings = await beachfests_booking.findAll({
      where: {
        user_id: userId,
        payment_status: {
          [Op.in]: ["paid", "refunded", "norefund"],
        },
      },
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: beach_fests,
          as: "beachfest",
          attributes: [
            "type",
            "image_urls",
            "gmap_url",
            "latitude",
            "longitude",
            "location",
          ],
        },
      ],
    });

    const beachfestBookingsWithDetails = beachfestBookings.map((booking) => {
      const imageUrlsStr = booking.beachfest?.image_urls;
      let imageUrls = [];

      if (typeof imageUrlsStr === "string" && imageUrlsStr.trim() !== "") {
        imageUrls = imageUrlsStr
          .replace(/{|}/g, "")
          .split(",")
          .map((url) => url.trim());
      }

      return {
        ...booking.toJSON(),
        beachfest_name: booking.beachfest ? booking.beachfest.type : null,
        beachfest_location: booking.beachfest
          ? booking.beachfest.location
          : null,
        beachfest_images: imageUrls,
        gmap_url: booking.beachfest ? booking.beachfest.gmap_url : null,
        latitude: booking.beachfest ? booking.beachfest.latitude : null,
        longitude: booking.beachfest ? booking.beachfest.longitude : null,
      };
    });

    // 📌 Fetch Events
    const events = await Event.findAll({
      where: { userId },
      attributes: {
        include: [[sequelize.col("EventType.imageUrl"), "eventTypeImage"]],
      },
      include: [
        {
          model: EventType,
          attributes: [], // Exclude nested object since we're pulling its value into eventTypeImage
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    // 📌 Final response
    res.status(200).json({
      status: 200,
      success: true,
      message: "Your bookings fetched successfully.",
      propertyBookings: propertyBookingsWithDetails,
      beachfestBookings: beachfestBookingsWithDetails,
      events,
      user,
    });
  } catch (error) {
    console.error("Error fetching user bookings:", error);
    res.status(500).json({
      status: 500,
      success: false,
      message: "Something went wrong while fetching your bookings.",
      error: error.message,
    });
  }
};

exports.cancelBooking = async (req, res) => {
  const { type } = req.body;

  if (!type) {
    return res
      .status(400)
      .json({ success: false, message: "Type is required in request body." });
  }

  switch (type) {
    case "property_booking":
      return cancelPropertyBooking(req, res);

    case "event":
      return cancelEventBooking(req, res);

    case "beach_fest":
      return cancelBeachFestBooking(req, res);

    default:
      return res
        .status(400)
        .json({ success: false, message: "Invalid booking type provided." });
  }
};
