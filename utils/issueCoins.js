const {
  FestgoCoinTransaction,
  FestGoCoinHistory,
  ReferralHistory,
} = require("../models/users"); // ✅ Correct
const { Op } = require("sequelize");
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

const issueUserReferralCoins = async ({
  referrerId,
  referredId,
  coins,
  type = "user_referral",
  note = "Referral bonus for inviting a friend",
}) => {
  try {
    // Step 1: Create referral history
    await ReferralHistory.create({
      referrerId,
      referredId,
      coinsAwarded: coins,
      referralNote: note,
    });
    const now = new Date();
    const oneYearLater = new Date(now);
    oneYearLater.setFullYear(now.getFullYear() + 1);

    // Step 2: Create coins
    await FestgoCoinTransaction.create({
      userId: referrerId,
      type,
      amount: coins,
      remaining: coins,
      expiresAt: oneYearLater,
      CurrentMonthCount: 0,
      monthlyRefillDate: null,
    });
    // Step 2: Create coin transaction log
    await FestGoCoinHistory.create({
      userId: referrerId,
      type: "earned",
      reason: note,
      coins,
      referenceId: referredId,
      metaData: {
        type,
        referredUser: referredId,
      },
    });
  } catch (err) {
    console.error("Error issuing FestGo coins:", err);
  }
};
const calculateFestgoCoins = async (userId) => {
  if (!userId) return 0;

  const now = new Date();

  try {
    const transactions = await FestgoCoinTransaction.findAll({
      where: {
        userId,
        expiresAt: {
          [Op.or]: {
            [Op.gt]: now,
            [Op.is]: null,
          },
        },
      },
    });

    const totalCoins = transactions.reduce(
      (sum, tx) => sum + (tx.remaining || 0),
      0
    );
    return totalCoins;
  } catch (err) {
    console.error("Error calculating FestGo coins:", err);
    return 0;
  }
};
module.exports = {
  createInitialFestgoTransaction,
  issueUserReferralCoins,
  calculateFestgoCoins,
};
