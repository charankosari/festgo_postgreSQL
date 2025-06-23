const { Op } = require("sequelize");
const {
  RoomBookedDate,
  property_booking,
  CronThing,
  sequelize,
} = require("../models/services");

const expireStaleBookings = async () => {
  const t = await sequelize.transaction();
  try {
    const cronThing = await CronThing.findOne({
      where: { entity: "property_booking", active: true },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!cronThing) {
      await t.commit();
      return;
    }

    // Find expired pending bookings (15 mins)
    const expiredRoomDates = await RoomBookedDate.findAll({
      where: {
        status: "pending",
        createdAt: {
          [Op.lte]: new Date(Date.now() - 15 * 60 * 1000),
        },
      },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    const bookingIds = [...new Set(expiredRoomDates.map((r) => r.bookingId))];

    // Delete expired records
    if (expiredRoomDates.length > 0) {
      await RoomBookedDate.update(
        { status: "cancelled" },
        {
          where: {
            id: expiredRoomDates.map((r) => r.id),
          },
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

      console.log(
        `✅ Cleaned up ${expiredRoomDates.length} stale room bookings.`
      );
    }

    // Check if any pending RoomBookedDate left at all
    const pendingRoomBookings = await RoomBookedDate.count({
      where: { status: "pending" },
      transaction: t,
    });

    if (pendingRoomBookings === 0) {
      // No pending bookings left → deactivate cron
      await cronThing.update({ active: false }, { transaction: t });
      console.log("✅ No pending bookings remaining — cron deactivated.");
    }

    await t.commit();
  } catch (error) {
    await t.rollback();
    console.error("❌ Error cleaning up stale bookings:", error);
  }
};

module.exports = expireStaleBookings;
