const { FestgoCoinTransaction, FestGoCoinHistory } = require("../models/users"); // ✅ Correct

const createInitialFestgoTransaction = async (userId) => {
  try {
    const now = new Date();
    const oneYearLater = new Date(now);
    oneYearLater.setFullYear(now.getFullYear() + 1);

    await FestgoCoinTransaction.create({
      userId,
      type: "login_bonus",
      amount: 2000,
      remaining: 2000,
      expiresAt: oneYearLater,
      CurrentMonthCount: 0,
      monthlyRefillDate: null,
    });

    // ✅ Log coin issuance
    await logCoinIssuance({
      userId,
      coins: 2000,
      reason: "Initial login bonus",
      type: "earned",
      referenceId: null,
      metaData: {
        transactionType: "initial_bonus",
        expiresAt: oneYearLater,
      },
    });
  } catch (err) {
    console.error("Error creating initial FestgoCoinTransaction:", err);
  }
};

// 👇 Local helper function
const logCoinIssuance = async ({
  userId,
  coins,
  reason,
  type = "earned",
  referenceId,
  metaData,
}) => {
  try {
    await FestGoCoinHistory.create({
      userId,
      type,
      reason,
      coins,
      referenceId,
      metaData,
    });
  } catch (err) {
    console.error("Error logging FestGo coin issuance:", err);
  }
};

module.exports = {
  createInitialFestgoTransaction,
};
