// config/festgoCoinRules.js

module.exports = {
  // 💰 Global wallet usage cap per user per month
  overallMonthlyCoinsUsageCap: 500, // Rs.500 max coins usable per user/month

  // 🎯 Referral Earnings Configuration
  referralRules: {
    user_referal: {
      coinsPerReferral: 100,
      monthlyReferralLimit: 50, // Max 50 referrals per month
    },
    property_recommend: {
      maxEarnings: 500, // Room/Resort booking
      coinsPerReferral: null, // Variable or admin-defined
    },
    trip_referal: {
      maxEarnings: 500,
      coinsPerReferral: null, // Could be fixed or per trip
    },
    festbite_referal: {
      percentOfOrder: 2, // Earn 2% of FestBite order
      maxEarnings: 5000,
    },
    event_referal: {
      percentOfBooking: 2, // Earn 2% of Event booking
      maxEarnings: 10000,
    },
  },

  // 🛒 Wallet Coin Spending Rules
  CoinUsageRules: {
    rooms_resorts: {
      perTransactionLimit: 100,
      monthlyCap: 500,
    },
    beach_city_fest: {
      perTransactionLimit: 200,
      maxTransactionsPerMonth: 2,
      monthlyCap: 400,
    },
    festbite_orders: {
      monthlyCap: 1000,
    },
    events: {
      monthlyCap: 2000,
    },
  },
};
