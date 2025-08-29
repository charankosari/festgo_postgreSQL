const cron = require("node-cron");
const expireStaleBookings = require("./expireStaleBookings");
const expireZeroBookings = require("./expireZeroBooking");
const {
  issuePendingCoins,
  issueBeachFestPendingCoins,
  issueTripsPendingCoins,
  issueCityFestPendingCoins,
} = require("./issuePendingCoins");

// 🕒 Run every 2 minutes: Expire stale room bookings
cron.schedule("*/2 * * * *", () => {
  console.log("🕒 Running cron to clean up stale room bookings...");
  expireStaleBookings();
});

// 🪙 Run every 10 minutes: Issue pending FestGo coins
cron.schedule("*/10 * * * *", () => {
  console.log("🪙 Running cron to issue pending  property FestGo coins...");
  issuePendingCoins();
});
// 🪙 Run every 10 minutes: Issue pending FestGo coins
cron.schedule("*/10 * * * *", () => {
  console.log("🪙 Running cron to issue pending beach fest FestGo coins...");
  issueBeachFestPendingCoins();
});
// cron.schedule("*/10 * * * *", () => {
//   console.log("🪙 Running cron to issue pending trips FestGo coins...");
//   issueTripsPendingCoins();
// });
// cron.schedule("*/10 * * * *", () => {
//   console.log("🪙 Running cron to issue pending cityfest FestGo coins...");
//   issueCityFestPendingCoins();
// });
cron.schedule("*/10 * * * *", () => {
  console.log("🕒 Running cron to clean up zero  bookings...");
  expireZeroBookings();
});
