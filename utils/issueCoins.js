const { models } = require("../models/users"); // adjust path as per your project structure

const createInitialFestgoTransaction = async (userId) => {
  try {
    const FestgoCoinTransaction = models.FestgoCoinTransaction;
    const now = new Date();
    const oneMonthLater = new Date();
    oneMonthLater.setMonth(now.getMonth() + 1);

    await FestgoCoinTransaction.create({
      userId,
      type: "login_bonus", // or another appropriate type
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
