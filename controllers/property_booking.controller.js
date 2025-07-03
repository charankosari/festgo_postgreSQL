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
// const cancelPropertyBooking = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const booking = await property_booking.findOne({ where: { id } });

//     if (!booking) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Booking not found." });
//     }

//     const today = moment();
//     const checkInDate = moment(booking.check_in_date);
//     const daysBeforeCheckin = checkInDate.diff(today, "days");

//     let refundPercentage = 0;
//     if (daysBeforeCheckin >= 4) refundPercentage = 100;
//     else if (daysBeforeCheckin >= 2) refundPercentage = 50;

//     let refundAmount = 0;

//     if (
//       booking.payment_method === "online" &&
//       refundPercentage > 0 &&
//       booking.transaction_id
//     ) {
//       const refundableAmount = booking.amount_paid - booking.service_charge;
//       refundAmount = Math.round((refundableAmount * refundPercentage) / 100);

//       if (refundAmount > 0) {
//         const refund = await refundPayment({
//           payment_id: booking.transaction_id,
//           amount: refundAmount,
//         });

//         console.log("Refund processed:", refund);
//       }
//     }

//     await RoomBookedDate.destroy({ where: { bookingId: id } });

//     await booking.update({
//       booking_status: "cancelled",
//       payment_status:
//         booking.payment_method === "online"
//           ? refundPercentage > 0
//             ? "refunded"
//             : "cancelled"
//           : "cancelled",
//     });

//     res.status(200).json({
//       success: true,
//       message:
//         refundPercentage > 0
//           ? `Booking cancelled successfully. ₹${
//               refundAmount / 100
//             } refunded (excluding service charges).`
//           : "Booking cancelled successfully. No refund applicable.",
//       refundAmount: refundAmount / 100,
//       refundPercentage,
//     });
//   } catch (error) {
//     console.error("Error cancelling property booking:", error);
//     res.status(500).json({ success: false, message: "Something went wrong." });
//   }
// };

// // Event booking cancel placeholder
// const cancelEventBooking = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const userId = req.user.id;

//     const event = await Event.findByPk(id);

//     if (!event) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Event not found." });
//     }

//     if (event.userId !== userId) {
//       return res.status(403).json({
//         success: false,
//         message: "You don't have permission to cancel this event booking.",
//       });
//     }

//     await event.destroy();

//     res.status(200).json({
//       success: true,
//       message: "Event booking cancelled successfully.",
//     });
//   } catch (error) {
//     console.error("Error cancelling event booking:", error);
//     res.status(500).json({
//       success: false,
//       message: "Something went wrong while cancelling event booking.",
//     });
//   }
// };

// // Beach fest booking cancel placeholder
// const cancelBeachFestBooking = async (req, res) => {
//   const t = await sequelize.transaction();
//   try {
//     const { id } = req.params;

//     const booking = await beachfests_booking.findByPk(id, { transaction: t });
//     if (!booking) {
//       await t.rollback();
//       return res
//         .status(404)
//         .json({ success: false, message: "Booking not found." });
//     }

//     const fest = await beach_fests.findByPk(booking.beachfest_id, {
//       transaction: t,
//     });
//     if (!fest) {
//       await t.rollback();
//       return res
//         .status(404)
//         .json({ success: false, message: "Beachfest not found." });
//     }

//     const today = moment();
//     const eventStartDate = moment(booking.event_start);
//     const daysBeforeEvent = eventStartDate.diff(today, "days");

//     let refundPercentage = 0;
//     if (daysBeforeEvent >= 4) {
//       refundPercentage = 100;
//     } else if (daysBeforeEvent >= 2) {
//       refundPercentage = 50;
//     }

//     let refundAmount = 0;

//     if (
//       booking.payment_method === "online" &&
//       refundPercentage > 0 &&
//       booking.transaction_id
//     ) {
//       const refundableAmount = booking.amount_paid - booking.service_fee;
//       refundAmount = Math.round((refundableAmount * refundPercentage) / 100);

//       if (refundAmount > 0) {
//         const refund = await refundPayment({
//           payment_id: booking.transaction_id,
//           amount: refundAmount,
//         });

//         console.log("Beachfest refund processed:", refund);
//       }
//     }

//     // 👉 Update fest's available_passes (release the reserved passes)
//     fest.available_passes += booking.passes;
//     await fest.save({ transaction: t });

//     // 👉 Update booking status and payment status
//     await booking.update(
//       {
//         booking_status: "cancelled",
//         payment_status:
//           booking.payment_method === "online"
//             ? refundPercentage > 0
//               ? "refunded"
//               : "cancelled"
//             : "cancelled",
//       },
//       { transaction: t }
//     );

//     await t.commit();

//     res.status(200).json({
//       success: true,
//       message:
//         refundPercentage > 0
//           ? `Beach Fest booking cancelled successfully. ₹${refundAmount} refunded (excluding service fee).`
//           : "Beach Fest booking cancelled successfully. No refund applicable.",
//       refundAmount,
//       refundPercentage,
//     });
//   } catch (error) {
//     console.error("Error cancelling beach fest booking:", error);
//     await t.rollback();
//     res.status(500).json({ success: false, message: "Something went wrong." });
//   }
// };
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

    if (room.discounted_price >= 8000) {
      gst_rate = 18;
    } else if (room.discounted_price >= 1000) {
      gst_rate = 12;
    } else {
      gst_rate = 0;
    }

    // Calculate GST
    const gst_amount = (total_amount * gst_rate) / 100;

    // Determine Service Fee based on room price
    let service_fee = 50;
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
          [Op.in]: ["paid", "refunded"],
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
          [Op.in]: ["paid", "refunded"],
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
