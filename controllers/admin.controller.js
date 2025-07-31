const {
  Property,
  FestgoCoinSetting,
  FestgoCoinUsageLimit,
  Event,
  sequelize,
} = require("../models/services");
const {
  User,
  usersequel,
  FestgoCoinToIssue,
  FestgoCoinTransaction,
  FestGoCoinHistory,
} = require("../models/users");

// ✅ Get all vendors
exports.getAllVendors = async (req, res) => {
  try {
    const vendors = await User.findAll({ where: { role: "vendor" } });
    res.status(200).json(vendors);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Get specific vendor by ID
exports.getVendorById = async (req, res) => {
  try {
    const vendor = await User.findByPk(req.params.id);
    if (!vendor || vendor.role !== "vendor") {
      return res.status(404).json({ message: "Vendor not found" });
    }
    res.status(200).json(vendor);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Authorize vendor
exports.authorizeProperty = async (req, res) => {
  try {
    const property = await Property.findByPk(req.params.id);
    if (!property) {
      return res.status(404).json({ message: "property not found" });
    }
    property.active = true;
    await property.save();
    res
      .status(200)
      .json({ message: "property authorized successfully", property });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ De-authorize vendor
exports.deauthorizeProperty = async (req, res) => {
  try {
    const property = await Property.findByPk(req.params.id);
    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }
    property.active = false;
    await property.save();
    res
      .status(200)
      .json({ message: "property de-authorized successfully", vendor });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Delete vendor
exports.deleteVendor = async (req, res) => {
  try {
    const vendor = await User.findByPk(req.params.id);
    if (!vendor || vendor.role !== "vendor") {
      return res.status(404).json({ message: "Vendor not found" });
    }
    await vendor.destroy();
    res.status(200).json({ message: "Vendor deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Get all Festgo Coin settings
exports.createFestgoCoinSettings = async (req, res) => {
  try {
    const {
      type,
      monthly_limit_value,
      single_transaction_limit_value,
      monthly_referral_limit,
    } = req.body;
    const allowedTypes = [
      "event",
      "property",
      "beach_fest",
      "city_fest",
      "festbite",
      "user_referral",
    ];
    if (!type) {
      return res
        .status(400)
        .json({ success: false, message: "Type is required." });
    }

    if (!allowedTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid type '${type}'. Allowed types are: ${allowedTypes.join(
          ", "
        )}`,
      });
    }

    // Check if a setting already exists for the given type
    const [setting, created] = await FestgoCoinSetting.upsert(
      {
        type,
        monthly_limit_value,
        single_transaction_limit_value,
        monthly_referral_limit,
      },
      {
        returning: true,
        conflictFields: ["type"], // ensure it updates based on 'type'
      }
    );

    res.status(created ? 201 : 200).json({
      success: true,
      message: created
        ? "Setting created successfully."
        : "Setting updated successfully.",
      data: setting,
    });
  } catch (error) {
    console.error("Error in createOrUpdateCoinSetting:", error);
    res.status(500).json({ success: false, message: "Internal Server Error." });
  }
};

// GET: Fetch all FestGo Coin Settings
exports.getAllCoinSettings = async (req, res) => {
  try {
    const settings = await FestgoCoinSetting.findAll({
      order: [["updatedAt", "DESC"]],
    });

    res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error("Error in getAllCoinSettings:", error);
    res.status(500).json({ success: false, message: "Internal Server Error." });
  }
};
exports.updateEventStatus = async (req, res) => {
  const service_tx = await sequelize.transaction();
  const user_tx = await usersequel.transaction();
  try {
    const { eventId } = req.params;
    const { status } = req.body;

    // ✅ Validate status
    const validStatuses = ["pending", "hold", "accepted", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    // 🔍 Find event
    const event = await Event.findByPk(eventId, { transaction: service_tx });
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }
    if (["accepted", "cancelled"].includes(event.status)) {
      await service_tx.rollback();
      await user_tx.rollback();
      return res.status(409).json({
        message: `Event is already finalized with status: ${event.status}`,
      });
    }
    // ✅ Update status
    event.status = status;
    await event.save({ transaction: service_tx });

    // 💰 Issue coins if accepted
    if (status === "accepted") {
      const coinToIssue = await FestgoCoinToIssue.findOne({
        where: { event_id: event.id, issue: false },
        transaction: user_tx,
      });

      if (coinToIssue) {
        const now = new Date();

        // 🔄 Create FestgoCoinTransaction
        await FestgoCoinTransaction.create(
          {
            userId: coinToIssue.userId,
            type: "event_referral",
            amount: coinToIssue.amount,
            remaining: coinToIssue.amount,
            sourceType: "event",
            sourceId: event.id,
            expiresAt: new Date(now.setMonth(now.getMonth() + 12)),
          },
          { transaction: user_tx }
        );

        // 🔄 Update FestgoCoinToIssue
        coinToIssue.issue = true;
        coinToIssue.issueAt = new Date();
        await coinToIssue.save({ transaction: t });

        // 🔄 Upsert FestgoCoinHistory
        await FestGoCoinHistory.update(
          {
            status: "issued",
          },

          {
            where: {
              reason: "event referral", // or whatever your reason is
              referenceId: event.id, // or booking.id etc.
              status: "pending",
              type: "earned",
            },
          }
        );
        await FestGoCoinHistory.update(
          {
            status: "issued",
          },

          {
            where: {
              reason: "event", // or whatever your reason is
              referenceId: event.id, // or booking.id etc.
              status: "pending",
              type: "used",
            },
          }
        );
      }
    } else if (status === "cancelled") {
      const coinToIssue = await FestgoCoinToIssue.findOne({
        where: { event_id: event.id, issue: false },
        transaction: user_tx,
      });

      if (coinToIssue) {
        coinToIssue.issue = false;
        await coinToIssue.save({ transaction: t });

        // 🔄 Upsert FestgoCoinHistory
        await FestGoCoinHistory.update(
          {
            status: "not valid",
          },

          {
            where: {
              reason: "event referral",
              referenceId: event.id,
              status: "pending",
              type: "earned",
            },
          }
        );

        const usedCoinHistory = await FestGoCoinHistory.findOne({
          where: {
            reason: "event",
            referenceId: event.id,
            status: "pending",
            type: "used",
          },
        });

        let refundedCoins = 0;
        if (usedCoinHistory) {
          const totalUsedCoins = usedCoinHistory.coins;
          refundedCoins = totalUsedCoins;

          if (refundedCoins > 0) {
            const txnsToRestore = await FestgoCoinTransaction.findAll({
              where: { userId: event.userId },
              order: [["expiresAt", "ASC"]],
              transaction: user_tx,
            });

            let remainingToRefund = refundedCoins;

            for (const txn of txnsToRestore) {
              const originallyUsed = txn.amount - txn.remaining;
              const refundable = Math.min(originallyUsed, remainingToRefund);

              if (refundable <= 0) continue;

              txn.remaining += refundable;
              remainingToRefund -= refundable;

              await txn.save({ transaction: user_tx });

              if (remainingToRefund <= 0) break;
            }

            // Mark original usage history as not valid
            await usedCoinHistory.update(
              { status: "not valid" },
              { transaction: user_tx }
            );
          }
        }
      }
    }

    await t.commit();
    await user_tx.commit();
    return res.status(200).json({
      success: true,
      message: `Event status updated to '${status}'`,
      event,
    });
  } catch (error) {
    await t.rollback();
    await user_tx.rollback();
    console.error("Error updating event status:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
exports.upsertCoinUsageLimit = async (req, res) => {
  try {
    const payload = req.body;

    // Get existing data if exists
    let existing = await FestgoCoinUsageLimit.findByPk(1);

    const finalData = {
      id: 1,
      festbite: payload.festbite ||
        existing?.festbite || { transaction_limit: 0, monthly_limit: 0 },
      event: payload.event ||
        existing?.event || { transaction_limit: 0, monthly_limit: 0 },
      allother: payload.allother ||
        existing?.allother || { transaction_limit: 0, monthly_limit: 0 },
    };

    const [record, created] = await FestgoCoinUsageLimit.upsert(finalData, {
      returning: true,
    });

    return res.status(200).json({
      success: true,
      message: created ? "Created new usage limits" : "Updated usage limits",
      data: record,
    });
  } catch (error) {
    console.error("🔴 Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.getCoinUsageLimit = async (req, res) => {
  try {
    const usageLimit = await FestgoCoinUsageLimit.findByPk(1);

    if (!usageLimit) {
      return res.status(404).json({
        success: false,
        message: "Coin usage limit not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: usageLimit,
    });
  } catch (error) {
    console.error("🔴 Error fetching coin usage limit:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
