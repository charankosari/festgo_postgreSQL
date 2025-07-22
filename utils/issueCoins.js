const {
  FestgoCoinTransaction,
  FestGoCoinHistory,
  ReferralHistory,
  usersequel,
} = require("../models/users"); // ✅ Correct
const { FestgoCoinSetting, sequelize } = require("../models/services");
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
const createPropertyReferralTempCoin = async (
  userId,
  referral_id,
  bookingId,
  metaData = {}
) => {
  const service_tx = await sequelize.transaction();
  const user_tx = await usersequel.transaction();

  try {
    // 1️⃣ Get user who referred this user
    const referringUser = await User.findByPk(referral_id, {
      transaction: user_tx,
    });
    if (!referringUser) throw new Error("Referrer not found");

    // 2️⃣ Get Coin Setting for "property"
    const setting = await FestgoCoinSetting.findOne({
      where: { type: "property" },
      transaction: service_tx,
    });
    if (!setting || !setting.coins_per_referral) {
      throw new Error("Property coin setting not found");
    }

    const coins = parseInt(setting.coins_per_referral);

    // 3️⃣ Get referral history for this referrer in current month
    const firstCreated = referringUser.createdAt;
    const currentMonthStart = startOfMonth(new Date());
    const currentMonthEnd = endOfMonth(new Date());

    const currentMonthReferrals = await FestGoCoinHistory.count({
      where: {
        userId: referringUser.id,
        reason: "property_referral",
        createdAt: {
          [Op.between]: [currentMonthStart, currentMonthEnd],
        },
      },
      transaction: user_tx,
    });

    if (currentMonthReferrals >= setting.monthly_referral_limit) {
      console.log("❌ Monthly referral limit reached.");
      await user_tx.rollback();
      await service_tx.rollback();
      return;
    }

    // 4️⃣ Create FestgoCoinToIssue (temp coin)
    await FestgoCoinToIssue.create(
      {
        userId: referringUser.id,
        referral_id,
        booking_id: bookingId,
        sourceType: "property",
        sourceId: bookingId,
        coinsToIssue: coins,
        issueAt: new Date(Date.now() + 2 * 60 * 1000), // after 2 min
        type: "property_recommend",
        issue: true,
        metaData,
      },
      { transaction: user_tx }
    );

    // 5️⃣ Create FestGoCoinHistory (status: pending)
    await FestGoCoinHistory.create(
      {
        userId: referringUser.id,
        status: "pending",
        type: "earned",
        reason: "property_referral",
        referenceId: bookingId,
        coins,
        metaData,
      },
      { transaction: user_tx }
    );

    // 6️⃣ Set CronThing active for 'property_coins_issue'
    await CronThing.upsert(
      {
        entity: "property_coins_issue",
        active: true,
      },
      { transaction: service_tx }
    );

    await user_tx.commit();
    await service_tx.commit();

    console.log("✅ Temp coins and history created for referral");
  } catch (err) {
    await user_tx.rollback();
    await service_tx.rollback();
    console.error("❌ Failed to create temp coins:", err.message);
  }
};

module.exports = {
  createInitialFestgoTransaction,
  issueUserReferralCoins,
  calculateFestgoCoins,
  createPropertyReferralTempCoin,
};
