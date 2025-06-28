const {
  property_booking,
  RoomBookedDate,
  Property,
  Room,
  CronThing,
  sequelize, // your services sequelize instance
} = require("../models/services");

const { User } = require("../models/users");
const { createOrder } = require("../libs/payments/razorpay");
const { FESTGO_COIN_VALUE } = require("../config/festgo_coin");
const { Op, Transaction } = require("sequelize");

exports.bookProperty = async (req, res) => {
  const t = await sequelize.transaction({
    isolationLevel: Transaction.ISOLATION_LEVELS.SERIALIZABLE,
  });

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

    const user_id = req.user.id;

    // Validate property
    const property = await Property.findOne({
      where: { id: property_id },
      transaction: t,
    });
    if (!property) {
      await t.rollback();
      return res.status(404).json({ message: "Property not found" });
    }

    // Validate room
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

    // Validate user
    const user = await User.findOne({ where: { id: user_id } });
    if (!user) {
      await t.rollback();
      return res.status(404).json({ message: "User not found" });
    }

    // Check room availability with locking
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
      return res.status(400).json({
        message: `No rooms available for the selected dates.`,
      });
    }

    if (num_rooms > availableRooms) {
      await t.rollback();
      return res.status(400).json({
        message: `Only ${availableRooms} room(s) available for the selected dates.`,
      });
    }

    // Calculate total and apply coins
    const total_amount = room.discounted_price * num_rooms;
    let gst_rate = 0;
    if (room.discounted_price >= 7500) {
      gst_rate = 18;
    } else {
      gst_rate = 12;
    }

    // Calculate GST
    const gst_amount = (total_amount * gst_rate) / 100;

    // Determine Service Fee based on room price
    let service_fee = 0;
    if (room.discounted_price >= 1000 && room.discounted_price <= 1999) {
      service_fee = 50;
    } else if (room.discounted_price >= 2000 && room.discounted_price <= 4999) {
      service_fee = 100;
    } else if (room.discounted_price >= 5000 && room.discounted_price <= 7499) {
      service_fee = 150;
    } else if (room.discounted_price >= 7500 && room.discounted_price <= 9999) {
      service_fee = 200;
    } else if (room.discounted_price >= 10000) {
      service_fee = 250;
    }
    const gross_payable = total_amount + gst_amount + service_fee;

    // FestGo Coins discount — after all charges
    let usable_coins = 0;
    if (festgo_coins >= 10 && user.festgo_coins >= festgo_coins) {
      usable_coins = festgo_coins;
    } else if (festgo_coins >= 10 && user.festgo_coins < festgo_coins) {
      usable_coins = user.festgo_coins;
    }
    const coins_discount_value = usable_coins * FESTGO_COIN_VALUE;
    const amount_paid = gross_payable - coins_discount_value;

    // Create Booking
    const newBooking = await property_booking.create(
      {
        user_id,
        property_id,
        room_id,
        check_in_date,
        check_out_date,
        num_adults,
        num_children,
        num_rooms,
        total_amount,
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

    // Block booked dates for each room
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

    return res.status(201).json({
      message: "Booking created successfully",
      booking: newBooking,
      razorpayOrder,
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

    // Fetch all bookings for the user
    const bookings = await property_booking.findAll({
      where: { user_id: userId },
      order: [["createdAt", "DESC"]],
    });

    // For each booking, fetch the related property to get location
    // Use Promise.all for parallel async fetches
    const bookingsWithLocation = await Promise.all(
      bookings.map(async (booking) => {
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
            console.error("Error parsing photos JSON string:", err);
          }
        }
        return {
          ...booking.toJSON(), // convert Sequelize instance to plain object
          property_location: prop ? prop.location : null,
          property_name: prop ? prop.name : null,
          property_photos: photoUrls,
          room_name: room ? room.room_name : null,
        };
      })
    );

    res.status(200).json({
      status: 200,
      success: true,
      message: "Your bookings fetched successfully.",
      bookings: bookingsWithLocation,
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
