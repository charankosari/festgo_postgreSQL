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
  total_price,
  transaction,
  user_tx,
  type,
}) {
  const now = new Date();

  console.log("🧾 Params received:", {
    userId,
    requestedCoins,
    total_price,
  });

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
        status: {
          [Op.in]: ["issued", "pending"],
        },
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
    console.log("🚫 User exceeded monthly limit. No coins can be used.");
    return {
      usable_coins: 0,
      coins_discount_value: 0,
      amount_to_be_paid: total_price,
      coin_history_inputs: null,
    };
  }

  const setting = await FestgoCoinSetting.findOne({
    where: {
      type:
        type === "beachfest"
          ? "beach_fest"
          : type === "cityfest"
          ? "city_fest"
          : type,
    },
    transaction,
  });

  if (!setting) throw new Error("FestGoCoinSetting missing for property");

  const monthlyLimitProperty = Number(setting.monthly_limit_value);
  const singleTransactionLimit = Number(setting.single_transaction_limit_value);

  const remainingThisMonthForProperty = monthlyLimitProperty;

  console.log(
    "📈 Remaining Property Coin Limit This Month:",
    remainingThisMonthForProperty
  );

  const txns = await FestgoCoinTransaction.findAll({
    where: {
      userId,
      [Op.or]: [{ remaining: { [Op.gt]: 0 } }, { amount: { [Op.gt]: 0 } }],
      expiresAt: { [Op.gt]: now },
    },
    order: [["expiresAt", "ASC"]],
    transaction: user_tx,
  });

  let totalAvailable = 0;
  for (const txn of txns) {
    totalAvailable += txn.remaining;
  }

  console.log("💰 Total Available Coins:", totalAvailable);

  let usable_coins = Math.min(
    requestedCoins || 0,
    totalAvailable,
    singleTransactionLimit,
    remainingThisMonthForProperty,
    allOtherMonthlyLimit - totalUsedAcrossAll
  );

  console.log("✅ Calculated Usable Coins:", usable_coins);

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

  console.log("🧾 Final Coins Deducted From Transactions:", totalCoinsUsed);

  coin_history_inputs.push({
    userId,
    type: "used",
    reason: `${type}_booking`,
    referenceId: null, // will set after booking
    coins: totalCoinsUsed,
    status: "pending",
    metaData: {
      booking_amount: total_price,
    },
  });

  const coins_discount_value = usable_coins * 1;
  const amount_to_be_paid = total_price - coins_discount_value;

  console.log("🎯 Final Summary:");
  console.log("    ➤ Usable Coins:", usable_coins);
  console.log("    ➤ Discount Value:", coins_discount_value);
  console.log("    ➤ Total Price:", total_price);
  console.log("    ➤ Amount to be Paid:", amount_to_be_paid);

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
