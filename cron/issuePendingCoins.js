const { CronThing, sequelize } = require("../models/services");
const {
  FestGoCoinHistory,
  FestgoCoinTransaction,
  FestgoCoinToIssue,
  usersequel,
} = require("../models/users");
const { Op } = require("sequelize");

const issuePendingCoins = async () => {
  const service_tx = await sequelize.transaction();
  const user_tx = await usersequel.transaction();

  try {
    // 🔍 Step 1: Check if cron is active
    const cronThing = await CronThing.findOne({
      where: { entity: "property_coins_issue", active: true },
      transaction: service_tx,
      lock: service_tx.LOCK.UPDATE,
    });

    if (!cronThing) {
      await service_tx.commit();
      await user_tx.rollback();
      return;
    }

    const now = new Date();

    // 🔍 Step 2: Find all pending coin issues ready to be issued
    const rows = await FestgoCoinToIssue.findAll({
      where: {
        issue: true,
        status: "pending",
        issueAt: { [Op.lte]: now },
      },
      transaction: user_tx,
      lock: user_tx.LOCK.UPDATE,
    });

    for (const row of rows) {
      const {
        userId,
        coinsToIssue,
        type,
        sourceType,
        sourceId,
        booking_id,
        referral_id,
        metaData,
      } = row;

      // 🧾 Step 3: Create coin transaction
      await FestgoCoinTransaction.create(
        {
          userId,
          amount: coinsToIssue,
          remaining: coinsToIssue,
          type,
          source: sourceType,
          reference_id: sourceId,
          expiresAt: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000), // 1 year
          metaData,
        },
        { transaction: user_tx }
      );

      // 📘 Step 4: Create coin history
      await FestGoCoinHistory.create(
        {
          userId,
          status: "issued",
          type: "earned",
          reason: sourceType + "_referral",
          referenceId: booking_id || sourceId,
          coins: coinsToIssue,
          metaData,
        },
        { transaction: user_tx }
      );

      // ✅ Step 5: Update coin to issue entry
      await row.update(
        {
          status: "issued",
          issuedAt: now,
          issue: false,
        },
        { transaction: user_tx }
      );
    }

    // 🔄 Step 6: Check if anything is left to issue
    const remaining = await FestgoCoinToIssue.count({
      where: {
        issue: true,
        status: "pending",
      },
      transaction: user_tx,
    });

    if (remaining === 0) {
      await cronThing.update({ active: false }, { transaction: service_tx });
      console.log("✅ No more coins to issue. Deactivated cron.");
    }

    await user_tx.commit();
    await service_tx.commit();
  } catch (err) {
    await user_tx.rollback();
    await service_tx.rollback();
    console.error("❌ Coin issuing failed:", err);
  }
};

module.exports = issuePendingCoins;
