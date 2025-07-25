const { Op } = require("sequelize");
const moment = require("moment");
const {
  FestGoCoinHistory,
  FestgoCoinTransaction,
  usersequel,
} = require("../models/users");
const {
  FestgoCoinSetting,
  FestgoCoinUsageLimit,
} = require("../models/services");

async function applyUsableFestgoCoins({
  userId,
  requestedCoins,
  total_room_price,
  transaction,
  user_tx,
}) {
  const now = new Date();
  //   const user_tx = await usersequel.transaction();
  // ✅ Step 1: Check total allowed monthly usage (FestgoCoinUsageLimit)

  const coinLimit = await FestgoCoinUsageLimit.findOne({ transaction });
  if (!coinLimit || !coinLimit?.allother) {
    throw new Error("Coin usage limit not configured");
  }
  const allOtherMonthlyLimit = Number(coinLimit.allother);

  const firstDayOfMonth = moment().startOf("month").toDate();
  const lastDayOfMonth = moment().endOf("month").toDate();

  const totalUsedAcrossAll =
    (await FestGoCoinHistory.sum("coins", {
      where: {
        userId,
        type: "used",
        reason: {
          [Op.in]: [
            "property_booking",
            "beachfest_booking",
            "cityfest_booking",
          ],
        },
        createdAt: { [Op.between]: [firstDayOfMonth, lastDayOfMonth] },
      },
      transaction: user_tx,
    })) || 0;

  if (totalUsedAcrossAll >= allOtherMonthlyLimit) {
    return {
      usable_coins: 0,
      coins_discount_value: 0,
      amount_paid: total_room_price,
    };
  }

  // ✅ Step 2: Get property-specific monthly + per-tx limit
  const setting = await FestgoCoinSetting.findOne({
    where: { type: "property" },
    transaction,
  });

  if (!setting) throw new Error("FestGoCoinSetting missing for property");

  const monthlyLimitProperty = Number(setting.monthly_limit_value);
  const singleTransactionLimit = Number(setting.single_transaction_limit_value);

  // Calculate coins used this month **from only property_recommend type**
  const propertyRecommendUsed =
    (await FestGoCoinHistory.sum("coins", {
      where: {
        userId,
        type: "used",
        reason: "property_recommend",
        createdAt: { [Op.between]: [firstDayOfMonth, lastDayOfMonth] },
      },
      transaction: user_tx,
    })) || 0;

  const remainingThisMonthForProperty =
    monthlyLimitProperty - propertyRecommendUsed;

  // ✅ Step 3: Fetch available FestGoCoinTransactions
  const txns = await FestgoCoinTransaction.findAll({
    where: {
      userId,
      [Op.or]: [{ remaining: { [Op.gt]: 0 } }, { amount: { [Op.gt]: 0 } }],
      expiresAt: { [Op.gt]: now },
    },
    order: [["expiresAt", "ASC"]],
    transaction: user_tx,
  });

  // Calculate available coins from both remaining and expired-but-unused ones
  let totalAvailable = 0;
  for (const txn of txns) {
    totalAvailable += txn.remaining;
  }

  // ✅ Step 4: Calculate usable amount
  let usable_coins = Math.min(
    requestedCoins || 0,
    totalAvailable,
    singleTransactionLimit,
    remainingThisMonthForProperty,
    allOtherMonthlyLimit - totalUsedAcrossAll
  );

  let remainingToUse = usable_coins;
  let totalCoinsUsed = 0;
  const coin_history_inputs = [];
  for (const txn of txns) {
    if (remainingToUse <= 0) break;
    const deduct = Math.min(txn.remaining, remainingToUse);
    txn.remaining -= deduct;
    await txn.save({ transaction: user_tx });
    totalCoinsUsed += deduct;
    remainingToUse -= deduct;
  }
  coin_history_inputs.push({
    userId,
    type: "used",
    reason: "property_booking",
    referenceId: null, // will set after booking
    coins: totalCoinsUsed,
    status: "pending",
    metaData: {
      booking_amount: total_room_price,
    },
  });

  const coins_discount_value = usable_coins * 1;
  const amount_to_be_paid = total_room_price - coins_discount_value;
  return {
    usable_coins,
    coins_discount_value,
    amount_to_be_paid,
    coin_history_inputs,
  };
}

module.exports = {
  applyUsableFestgoCoins,
};
