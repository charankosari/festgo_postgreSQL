const {
  property_booking,
  RoomBookedDate,
  Property,
  Room,
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
        [Op.or]: [
          { checkIn: { [Op.between]: [check_in_date, check_out_date] } },
          { checkOut: { [Op.between]: [check_in_date, check_out_date] } },
          {
            checkIn: { [Op.lte]: check_in_date },
            checkOut: { [Op.gte]: check_out_date },
          },
        ],
      },
      lock: Transaction.LOCK.UPDATE,
      transaction: t,
    });

    const totalBookedRooms = existingBookings.length;

    if (totalBookedRooms + num_rooms > room.totalRooms) {
      await t.rollback();
      return res.status(400).json({
        message: `Only ${
          room.totalRooms - totalBookedRooms
        } rooms available for selected dates`,
      });
    }

    // Calculate total and apply coins
    const total_amount = room.discounted_price * num_rooms;

    let usable_coins = 0;
    if (festgo_coins >= 10 && user.festgo_coins >= festgo_coins) {
      usable_coins = festgo_coins;
    } else if (festgo_coins >= 10 && user.festgo_coins < festgo_coins) {
      usable_coins = user.festgo_coins;
    }

    const coins_discount_value = usable_coins * FESTGO_COIN_VALUE;
    const amount_paid = total_amount - coins_discount_value;

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
        },
        { transaction: t }
      );
    }

    // Create Razorpay order
    const razorpayOrder = await createOrder({
      order_id: newBooking.id,
      amount: amount_paid,
    });

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
