const { CronThing } = require("../models/services");
const {
  FestGoCoinHistory,
  FestgoCoinTransaction,
  sequelize,
} = require("../models/users");
const issuePendingCoins = async () => {
  const t = await sequelize.transaction();

  try {
    // 🔍 Fetch active cron job
    const cronThing = await CronThing.findOne({
      where: { entity: "property_coins_issue", active: true },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    if (!cronThing) {
      await t.commit();
      return;
    }

    // 🔍 Fetch all pending histories with issue: true
    const rows = await FestGoCoinHistory.findAll({
      where: {
        issue: true,
        status: "pending",
      },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });

    for (const row of rows) {
      const { user_id, coins, source_type, source_id, metaData } = row;

      // 🧾 Create FestgoCoinTransaction
      await FestgoCoinTransaction.create(
        {
          user_id,
          coins,
          type: "credit",
          source: source_type,
          reference_id: source_id,
          metaData: metaData || {},
        },
        { transaction: t }
      );

      // ✅ Update festgo_coin_history to status: "issued"
      await row.update(
        {
          status: "issued",
          issue: false,
          issuedAt: new Date(),
        },
        { transaction: t }
      );
    }

    // 🔄 Check if any more pending issues
    const remaining = await FestGoCoinHistory.count({
      where: { status: "pending", issue: true },
      transaction: t,
    });

    if (remaining === 0) {
      await cronThing.update({ active: false }, { transaction: t });
      console.log("✅ No more pending coin issues. Deactivated cron.");
    }

    await t.commit();
  } catch (err) {
    await t.rollback();
    console.error("❌ Error issuing coins:", err);
  }
};

module.exports = issuePendingCoins;
