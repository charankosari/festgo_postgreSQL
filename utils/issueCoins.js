const {
  FestgoCoinTransaction,
  FestGoCoinHistory,
  ReferralHistory,
  FestgoCoinToIssue,
  usersequel,
  User,
} = require("../models/users"); // ✅ Correct
const {
  FestgoCoinSetting,
  CronThing,
  sequelize,
} = require("../models/services");
const { Op } = require("sequelize");
const { upsertCronThing } = require("./cronUtils");
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
      status: "issued",
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
      status: "issued",
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
      status: "issued",
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
        reason: "property_recommend",
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
        reason: "property_recommend",
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

const handleReferralForEvent = async ({ referralId, event, transactions }) => {
  if (!referralId || !event || !event.eventBudget) return;
  const { service_tx, user_tx } = transactions;
  // 🔍 Step 1: Find referring user by referralCode
  const referrer = await User.findOne({
    where: { referralCode: referralId },
  });

  if (!referrer) {
    console.warn("⚠️ Invalid referral code");
    return;
  }

  // ⚙️ Step 2: Get event referral settings
  const setting = await FestgoCoinSetting.findOne({
    where: { type: "event" },
    transaction: service_tx,
  });
  console.log(setting);
  if (!setting) {
    console.warn("⚠️ FestgoCoinSetting not found for type 'event'");
    return;
  }

  const coinsPerReferral = parseFloat(setting.coins_per_referral || 0);
  const maxReferrals = setting.monthly_referral_limit;
  console.log(maxReferrals, coinsPerReferral);
  // 📆 Step 3: Get current month’s referral count for referrer
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const referralCount = await FestGoCoinHistory.count({
    where: {
      userId: referrer.id,
      reason: "event referral",
      createdAt: { [Op.gte]: startOfMonth },
    },
    transaction: user_tx,
  });
  console.log(referralCount);
  if (maxReferrals > 0 && referralCount >= maxReferrals) {
    console.warn("⚠️ Monthly referral limit reached");
    return;
  }

  // 💰 Step 4: Compute coin issuance cap (2% of event budget)
  const budget = parseFloat(event.eventBudget);
  const coinCap = budget * 0.02;
  const coinsToIssue = Math.min(coinsPerReferral, coinCap);

  if (coinsToIssue <= 0) {
    console.warn("⚠️ Computed coins to issue is 0");
    return;
  }

  // 🪙 Step 5: Create pending FestGoCoinHistory
  await FestGoCoinHistory.create(
    {
      userId: referrer.id,
      status: "pending",
      type: "earned",
      reason: "event referral",
      referenceId: event.id,
      coins: coinsToIssue,
      metaData: {
        eventId: event.id,
        type: "event_referral",
      },
    },
    { transaction: user_tx }
  );
  await FestgoCoinToIssue.create(
    {
      userId: referrer.id,
      referral_id: referralId,
      sourceType: "event",
      sourceId: event.id,
      coinsToIssue,
      status: "pending",
      type: "event_referral",
      issue: false,
      issueAt: null,
    },
    { transaction: user_tx }
  );
  console.log(
    `✅ Pending coins (${coinsToIssue}) created for referrer: ${referrer.id}`
  );
};
const handleUserReferralForBeachFestBooking = async (
  referral_id,
  referredUserId,
  bookingId,
  beachfest_id,
  issueAt
) => {
  if (!referral_id || referral_id.trim() === "") {
    console.log("🚫 Referral ID empty. Skipping.");
    return;
  }

  const user_tx = await usersequel.transaction();
  const service_tx = await sequelize.transaction();
  console.log("🔄 Started user referral transaction");

  try {
    const referredUser = await User.findByPk(referredUserId, {
      transaction: user_tx,
    });
    if (!referredUser) {
      console.log(`🚫 Referred user not found: ${referredUserId}`);
      await user_tx.rollback();
      return;
    }

    const referrer = await User.findOne({
      where: { referralCode: referral_id },
      transaction: user_tx,
    });
    if (!referrer || referrer.id === referredUserId) {
      console.log("🚫 Invalid referral. Referrer not found or self-referral.");
      await user_tx.rollback();
      return;
    }
    const setting = await FestgoCoinSetting.findOne({
      where: { type: "beach_fest" },
    });
    if (!setting || Number(setting.coins_per_referral) <= 0) {
      console.log("🚫 No coin setting found or zero coins.");
      await user_tx.rollback();
      return;
    }

    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);
    thisMonthStart.setHours(0, 0, 0, 0);

    const referralCount = await FestGoCoinHistory.count({
      where: {
        userId: referrer.id,
        reason: "beachfest referral",
        createdAt: { [Op.gte]: thisMonthStart },
        status: ["pending", "issued"],
      },
      transaction: user_tx,
    });

    if (referralCount >= (setting.monthly_referral_limit || 0)) {
      console.log("🚫 Monthly referral limit reached.");
      await user_tx.rollback();
      return;
    }

    await FestGoCoinHistory.create(
      {
        userId: referrer.id,
        type: "earned",
        reason: "beachfest referral",
        referenceId: bookingId,
        coins: Number(setting.coins_per_referral),
        status: "pending",
        metaData: {
          referral: referral_id,
          referredUser: referredUserId,
          beachfestId: beachfest_id,
        },
      },
      { transaction: user_tx }
    );

    await FestgoCoinToIssue.create(
      {
        booking_id: bookingId,
        userId: referrer.id,
        referral_id,
        sourceType: "beachfest",
        sourceId: beachfest_id,
        coinsToIssue: Number(setting.coins_per_referral),
        status: "pending",
        type: "beachfest_referral",
        issueAt: new Date(issueAt.getTime() + 86400000),
        issue: false,
        metaData: {
          referredUserId,
          bookingId: bookingId,
        },
      },
      { transaction: user_tx }
    );

    await upsertCronThing({
      entity: "beachfest_coins_issue",
      active: true,
      transaction: service_tx,
    });

    await user_tx.commit();
    await service_tx.commit();
    console.log(`✅ Referral reward set for user ${referrer.id}`);
  } catch (err) {
    await user_tx.rollback();
    await service_tx.rollback();
    console.error("❌ Error in referral handler:", err);
    throw err;
  }
};
const handleUserReferralForCityFestBooking = async (
  referral_id,
  referredUserId,
  bookingId,
  cityfest_id,
  issueAt
) => {
  if (!referral_id || referral_id.trim() === "") {
    console.log("🚫 Referral ID empty. Skipping.");
    return;
  }

  const user_tx = await usersequel.transaction();
  const service_tx = await sequelize.transaction();
  console.log("🔄 Started user referral transaction");

  try {
    const referredUser = await User.findByPk(referredUserId, {
      transaction: user_tx,
    });
    if (!referredUser) {
      console.log(`🚫 Referred user not found: ${referredUserId}`);
      await user_tx.rollback();
      return;
    }

    const referrer = await User.findOne({
      where: { referralCode: referral_id },
      transaction: user_tx,
    });
    if (!referrer || referrer.id === referredUserId) {
      console.log("🚫 Invalid referral. Referrer not found or self-referral.");
      await user_tx.rollback();
      return;
    }
    const setting = await FestgoCoinSetting.findOne({
      where: { type: "city_fest" },
    });
    if (!setting || Number(setting.coins_per_referral) <= 0) {
      console.log("🚫 No coin setting found or zero coins.");
      await user_tx.rollback();
      return;
    }

    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);
    thisMonthStart.setHours(0, 0, 0, 0);

    const referralCount = await FestGoCoinHistory.count({
      where: {
        userId: referrer.id,
        reason: "cityfest referral",
        createdAt: { [Op.gte]: thisMonthStart },
        status: ["pending", "issued"],
      },
      transaction: user_tx,
    });

    if (referralCount >= (setting.monthly_referral_limit || 0)) {
      console.log("🚫 Monthly referral limit reached.");
      await user_tx.rollback();
      return;
    }

    await FestGoCoinHistory.create(
      {
        userId: referrer.id,
        type: "earned",
        reason: "cityfest referral",
        referenceId: bookingId,
        coins: Number(setting.coins_per_referral),
        status: "pending",
        metaData: {
          referral: referral_id,
          referredUser: referredUserId,
          cityfestId: cityfest_id,
        },
      },
      { transaction: user_tx }
    );

    await FestgoCoinToIssue.create(
      {
        booking_id: bookingId,
        userId: referrer.id,
        referral_id,
        sourceType: "cityfest",
        sourceId: cityfest_id,
        coinsToIssue: Number(setting.coins_per_referral),
        status: "pending",
        type: "cityfest_referral",
        issueAt: new Date(issueAt.getTime() + 86400000),
        issue: false,
        metaData: {
          referredUserId,
          bookingId: bookingId,
        },
      },
      { transaction: user_tx }
    );

    await upsertCronThing({
      entity: "cityfest_coins_issue",
      active: true,
      transaction: service_tx,
    });

    await user_tx.commit();
    await service_tx.commit();
    console.log(`✅ Referral reward set for user ${referrer.id}`);
  } catch (err) {
    await user_tx.rollback();
    await service_tx.rollback();
    console.error("❌ Error in referral handler:", err);
    throw err;
  }
};

module.exports = {
  createInitialFestgoTransaction,
  issueUserReferralCoins,
  calculateFestgoCoins,
  // createPropertyReferralTempCoin,
  handleReferralForEvent,
  handleUserReferralForBeachFestBooking,
  handleUserReferralForCityFestBooking,
};
