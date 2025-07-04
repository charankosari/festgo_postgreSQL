const {
  property_booking,
  RoomBookedDate,
  Property,
  Room,
  beachfests_booking,
  beach_fests,
  Event,
  EventType,
  CronThing,
  sequelize, // your services sequelize instance
} = require("../models/services");

const { User } = require("../models/users");
const { createOrder } = require("../libs/payments/razorpay");
const { FESTGO_COIN_VALUE } = require("../config/festgo_coin");
const { Op, Transaction } = require("sequelize");
const {
  cancelBeachFestBooking,
  cancelPropertyBooking,
  cancelEventBooking,
} = require("../utils/cancelBookings");

exports.bookProperty = async (req, res) => {
  const t = await sequelize.transaction({
    isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE,
  });
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
      festgo_coins = 0,
      notes,
    } = req.body;

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

    const totalBookedRooms = existingBookings.length;
    const availableRooms = room.number_of_rooms - totalBookedRooms;

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
    // Prices from room.price JSON
    const price = room.price || {};
    const base_price_per_room = Number(price.base_price_for_2_adults) || 0;
    const extra_adult_charge_per = Number(price.extra_adult_charge) || 0;
    const child_charge_per = Number(price.child_charge) || 0;

    // Total price calculation
    const total_base_price = base_price_per_room * num_rooms;

    const max_included_adults = 2 * num_rooms;
    const extra_adults = Math.max(num_adults - max_included_adults, 0);
    const total_extra_adult_charge = extra_adults * extra_adult_charge_per;

    const total_child_charge = num_children * child_charge_per;

    const total_room_price =
      total_base_price + total_extra_adult_charge + total_child_charge;

    // ✅ GST slab on total cumulative price
    let gst_rate = 0;
    if (total_room_price >= 8000) gst_rate = 18;
    else if (total_room_price >= 1000) gst_rate = 12;

    const gst_amount = (total_room_price * gst_rate) / 100;

    // ✅ Service Fee slab on total cumulative price
    let service_fee = 50;
    if (total_room_price >= 1000 && total_room_price <= 1999) service_fee = 50;
    else if (total_room_price >= 2000 && total_room_price <= 4999)
      service_fee = 100;
    else if (total_room_price >= 5000 && total_room_price <= 7499)
      service_fee = 150;
    else if (total_room_price >= 7500 && total_room_price <= 9999)
      service_fee = 200;
    else if (total_room_price >= 10000) service_fee = 250;

    // ✅ Gross amount to be paid before discounts or coins
    const gross_payable = total_room_price + gst_amount + service_fee;

    // Apply FestGo coins
    let usable_coins = 0;
    if (festgo_coins >= 10 && user.festgo_coins >= festgo_coins) {
      usable_coins = festgo_coins;
    } else if (festgo_coins >= 10 && user.festgo_coins < festgo_coins) {
      usable_coins = user.festgo_coins;
    }
    const coins_discount_value = usable_coins * FESTGO_COIN_VALUE;
    const amount_paid = gross_payable - coins_discount_value;

    // Create booking
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
        gst_amount,
        gst_rate,
        service_fee,
        amount_paid,
        payment_method: "online",
        payment_status: "pending",
        booking_status: "pending",
        transaction_id: null,
        notes,
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
      amount: amount_paid,
      notes: {
        payment_for: "property_booking",
        booking_id: newBooking.id,
      },
    });

    await CronThing.upsert(
      { entity: "property_booking", active: true, last_run: new Date() },
      { transaction: t }
    );

    await t.commit();

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
    res.status(500).json({
      message: "Something went wrong while creating booking",
      error: error.message,
      status: 500,
    });
  }
};

exports.handlePaymentSuccess = async (bookingId, transactionId) => {
  try {
    // Update booking status
    await property_booking.update(
      {
        payment_status: "paid",
        booking_status: "confirmed",
        transaction_id: transactionId,
      },
      { where: { id: bookingId } }
    );

    // Confirm room holds
    await RoomBookedDate.update(
      { status: "confirmed" },
      { where: { bookingId, status: "pending" } }
    );

    console.log(`✅ Booking ${bookingId} confirmed, rooms blocked.`);
    return true;
  } catch (error) {
    console.error("Error in handlePaymentSuccess:", error);
    return false;
  }
};

// On Payment Failure
exports.handlePaymentFailure = async (bookingId) => {
  try {
    // Update booking status
    await property_booking.update(
      {
        payment_status: "failed",
        booking_status: "cancelled",
      },
      { where: { id: bookingId } }
    );

    // Release room holds
    await RoomBookedDate.destroy({
      where: { bookingId, status: "pending" },
    });

    console.log(`❌ Booking ${bookingId} cancelled, rooms released.`);
    return true;
  } catch (error) {
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
          attributes: ["location", "name", "photos"],
        });

        const room = await Room.findByPk(booking.room_id, {
          attributes: ["room_name"],
        });

        let photoUrls = [];
        if (prop && prop.photos && Array.isArray(prop.photos)) {
          try {
            photoUrls = prop.photos.map((photoStr) => {
              const photoObj = JSON.parse(photoStr);
              return photoObj.url;
            });
          } catch (err) {
            console.error("Error parsing property photos JSON string:", err);
          }
        }

        return {
          ...booking.toJSON(),
          property_location: prop ? prop.location : null,
          property_name: prop ? prop.name : null,
          property_photos: photoUrls,
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
