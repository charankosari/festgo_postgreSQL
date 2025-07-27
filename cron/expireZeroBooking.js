const { Op } = require("sequelize");
const moment = require("moment");
const {
  RoomBookedDate,
  property_booking,
  CronThing,
  sequelize,
  zeroBookingInstance,
} = require("../models/services");

const expireZeroBookings = async () => {
  const t = await sequelize.transaction();

  try {
    const cronThing = await CronThing.findOne({
      where: { entity: "zero_booking", active: true },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!cronThing) {
      await t.commit();
      console.log("ℹ️ No active cron entry found. Exiting.");
      return;
    }

    const now = moment();

    const expiredRoomDates = await RoomBookedDate.findAll({
      where: { status: "pending" },
      include: {
        model: property_booking,
        as: "booking",
        where: { zero_booking: true },
      },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    const toExpireIds = [];
    const bookingIdsSet = new Set();

    for (const room of expiredRoomDates) {
      const booking = room.booking;
      const checkinDate = moment(booking.check_in_date);
      const day = checkinDate.day(); // 0 = Sunday, 6 = Saturday
      const diffDays = checkinDate.diff(now, "days");

      const isWeekend = [0, 6].includes(day);

      if ((isWeekend && diffDays <= 4) || (!isWeekend && diffDays <= 2)) {
        toExpireIds.push(room.id);
        bookingIdsSet.add(booking.id);
      }
    }

    const bookingIds = [...bookingIdsSet];

    if (toExpireIds.length) {
      await RoomBookedDate.update(
        { status: "cancelled" },
        {
          where: { id: toExpireIds },
          transaction: t,
        }
      );

      await property_booking.update(
        { booking_status: "cancelled" },
        {
          where: {
            id: { [Op.in]: bookingIds },
            payment_status: "pending",
          },
          transaction: t,
        }
      );

      for (const bookingId of bookingIds) {
        const instance = await zeroBookingInstance.findOne({
          where: { property_booking_id: bookingId }, // ✅ correct column name
          transaction: t,
        });

        if (instance) {
          await instance.destroy({ transaction: t });
          console.log(
            `🗑️ Deleted zero_booking_instance for booking ${bookingId}`
          );
        } else {
          console.log(
            `⏳ No zero_booking_instance yet for booking ${bookingId}, skipping...`
          );
        }
      }

      console.log(
        `✅ Cancelled ${toExpireIds.length} RoomBookedDates and ${bookingIds.length} bookings`
      );
    } else {
      console.log("ℹ️ No bookings matched the expiry condition.");
    }

    const remaining = await RoomBookedDate.count({
      where: { status: "pending" },
      transaction: t,
    });

    if (remaining === 0) {
      await cronThing.update({ active: false }, { transaction: t });
      console.log("✅ No pending bookings left — cron deactivated.");
    }

    await t.commit();
  } catch (err) {
    await t.rollback();
    console.error("❌ Error in expiring bookings:", err);
  }
};

module.exports = expireZeroBookings;
