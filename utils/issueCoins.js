const { FestgoCoinTransaction } = require("../models/users"); // ✅ Correct
const createInitialFestgoTransaction = async (userId) => {
  try {
    const now = new Date();
    const oneMonthLater = new Date();
    oneMonthLater.setMonth(now.getMonth() + 1);

    await FestgoCoinTransaction.create({
      userId,
      type: "login_bonus",
      amount: 2000,
      remaining: 2000,
      expiresAt: oneMonthLater,
      CurrentMonthCount: 0,
      monthlyRefillDate: oneMonthLater,
    });
  } catch (err) {
    console.error("Error creating initial FestgoCoinTransaction:", err);
  }
};

module.exports = {
  createInitialFestgoTransaction,
};
