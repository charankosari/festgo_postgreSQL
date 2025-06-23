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
    // Lock cron thing row
    const cronThing = await CronThing.findOne({
      where: { entity: "property_booking" },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    // If no cron thing exists or it's inactive, skip cleanup
    if (!cronThing || !cronThing.active) {
      console.log("⏸️ No active booking clean-up scheduled.");
      await t.commit();
      return;
    }

    // Find all expired pending RoomBookedDates
    const expiredRoomDates = await RoomBookedDate.findAll({
      where: {
        status: "pending",
        createdAt: {
          [Op.lte]: new Date(Date.now() - 15 * 60 * 1000), // 15 mins ago
        },
      },
      transaction: t,
    });

    if (expiredRoomDates.length === 0) {
      console.log("✅ No expired bookings to clean up.");
      await cronThing.update(
        { active: false, last_run: new Date() },
        { transaction: t }
      );
      await t.commit();
      return;
    }

    const bookingIds = [...new Set(expiredRoomDates.map((r) => r.bookingId))];

    // Delete expired RoomBookedDates
    await RoomBookedDate.destroy({
      where: {
        id: expiredRoomDates.map((r) => r.id),
      },
      transaction: t,
    });

    // Update Bookings if still pending
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

    // Set cronThing inactive after processing
    await cronThing.update(
      { active: false, last_run: new Date() },
      { transaction: t }
    );

    await t.commit();
    console.log(
      `✅ Cleaned up ${expiredRoomDates.length} stale room bookings.`
    );
  } catch (error) {
    await t.rollback();
    console.error("❌ Error cleaning up stale bookings:", error);
  }
};

module.exports = expireStaleBookings;
