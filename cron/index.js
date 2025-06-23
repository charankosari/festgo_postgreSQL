const cron = require("node-cron");
const expireStaleBookings = require("./expireStaleBookings");

// Run every 2 minutes
cron.schedule("*/2 * * * *", () => {
  console.log("🕒 Running cron to clean up stale room bookings...");
  expireStaleBookings();
});
