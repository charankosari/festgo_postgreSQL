const {
  Property,
  FestgoCoinSetting,
  FestgoCoinUsageLimit,
  Event,
  PlanMyTrips,
  sequelize,
  Festbite,
  Commission,
  HotelPayment,
  property_booking,
} = require("../models/services");
const {
  User,
  usersequel,
  FestgoCoinToIssue,
  FestgoCoinTransaction,
  FestGoCoinHistory,
} = require("../models/users");
const { Op } = require("sequelize");
const XLSX = require("xlsx");
const path = require("path");
const fs = require("fs");
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
    if (!property.is_completed) {
      return res
        .status(404)
        .json({ message: "property process is not completed" });
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
      .json({ message: "property de-authorized successfully", property });
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
        where: {
          status: "pending",
          type: "event_referral",
          issue: false,
          sourceType: "event",
          sourceId: event.id,
          issue: false,
        },
        transaction: user_tx,
      });

      if (coinToIssue) {
        const now = new Date();

        // 🔄 Create FestgoCoinTransaction
        await FestgoCoinTransaction.create(
          {
            userId: coinToIssue.userId,
            type: "event_referral",
            amount: coinToIssue.coinsToIssue,
            remaining: coinToIssue.coinsToIssue,
            expiresAt: new Date(now.setMonth(now.getMonth() + 12)),
          },
          { transaction: user_tx }
        );

        // 🔄 Update FestgoCoinToIssue
        coinToIssue.issue = true;
        coinToIssue.issueAt = new Date();
        await coinToIssue.save({ transaction: user_tx });

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
      }
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
    } else if (status === "cancelled") {
      const coinToIssue = await FestgoCoinToIssue.findOne({
        where: {
          status: "pending",
          type: "event_referral",
          issue: false,
          sourceType: "event",
          sourceId: event.id,
          issue: false,
        },
        transaction: user_tx,
      });

      if (coinToIssue) {
        coinToIssue.issue = false;
        coinToIssue.status = "cancelled";

        await coinToIssue.save({ transaction: user_tx });

        // 🔄 Mark "earned" history as not valid
        await FestGoCoinHistory.update(
          { status: "not valid" },
          {
            where: {
              reason: "event referral",
              referenceId: event.id,
              status: "pending",
              type: "earned",
            },
            transaction: user_tx,
          }
        );
      }
      const usedCoinHistory = await FestGoCoinHistory.findOne({
        where: {
          reason: "event",
          referenceId: event.id,
          userId: event.userId,
          status: "pending",
          type: "used",
        },
        transaction: user_tx,
      });

      let refundedCoins = 0;
      if (usedCoinHistory) {
        const totalUsedCoins = usedCoinHistory.coins;
        refundedCoins = totalUsedCoins;

        if (refundedCoins > 0) {
          const txnsToRestore = await FestgoCoinTransaction.findAll({
            where: {
              userId: event.userId,
              expiresAt: {
                [Op.gte]: new Date(),
              },
            },
            order: [["expiresAt", "ASC"]],
            transaction: user_tx,
          });

          let remainingToRefund = refundedCoins;

          if (txnsToRestore.length === 0) {
            // No usable transactions — full refund as grace period fallback
            await FestgoCoinTransaction.create(
              {
                userId: event.userId,
                type: "refund_grace_period",
                amount: refundedCoins,
                remaining: refundedCoins,
                sourceType: "event_cancellation",
                sourceId: event.id,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              },
              { transaction: user_tx }
            );
          } else {
            // Refund into existing coin transactions
            for (const txn of txnsToRestore) {
              const originallyUsed = txn.amount - txn.remaining;
              const refundable = Math.min(originallyUsed, remainingToRefund);

              if (refundable <= 0) continue;

              txn.remaining += refundable;
              remainingToRefund -= refundable;

              await txn.save({ transaction: user_tx });

              if (remainingToRefund <= 0) break;
            }

            // ⛳ If not fully refunded, create fallback transaction
            if (remainingToRefund > 0) {
              await FestgoCoinTransaction.create(
                {
                  userId: event.userId,
                  type: "refund_grace_period",
                  amount: remainingToRefund,
                  remaining: remainingToRefund,
                  sourceType: "event_cancellation",
                  sourceId: event.id,
                  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                },
                { transaction: user_tx }
              );
            }
          }

          await usedCoinHistory.update(
            { status: "not valid" },
            { transaction: user_tx }
          );
        }
      }
    }

    await service_tx.commit();
    await user_tx.commit();
    return res.status(200).json({
      success: true,
      message: `Event status updated to '${status}'`,
      event,
    });
  } catch (error) {
    await service_tx.rollback();
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

exports.updateFestbiteStatus = async (req, res) => {
  const service_tx = await sequelize.transaction();
  const user_tx = await usersequel.transaction();
  try {
    const { festbiteId } = req.params;
    const { status } = req.body;

    // ✅ Validate status
    const validStatuses = ["pending", "hold", "accepted", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    // 🔍 Find festbite
    const festbite = await Festbite.findByPk(festbiteId, {
      transaction: service_tx,
    });
    if (!festbite) {
      return res.status(404).json({
        success: false,
        message: "Festbite not found",
      });
    }

    if (["accepted", "cancelled"].includes(festbite.status)) {
      await service_tx.rollback();
      await user_tx.rollback();
      return res.status(409).json({
        message: `Festbite is already finalized with status: ${festbite.status}`,
      });
    }

    // ✅ Update status
    festbite.status = status;
    await festbite.save({ transaction: service_tx });

    // 💰 Handle accepted
    if (status === "accepted") {
      const coinToIssue = await FestgoCoinToIssue.findOne({
        where: {
          status: "pending",
          type: "festbite_referral",
          issue: false,
          sourceType: "festbite",
          sourceId: festbite.id,
        },
        transaction: user_tx,
      });

      if (coinToIssue) {
        const now = new Date();

        // 🔄 Create FestgoCoinTransaction
        await FestgoCoinTransaction.create(
          {
            userId: coinToIssue.userId,
            type: "festbite_referral",
            amount: coinToIssue.coinsToIssue,
            remaining: coinToIssue.coinsToIssue,
            expiresAt: new Date(now.setMonth(now.getMonth() + 12)),
          },
          { transaction: user_tx }
        );

        // 🔄 Update FestgoCoinToIssue
        coinToIssue.issue = true;
        coinToIssue.issueAt = new Date();
        await coinToIssue.save({ transaction: user_tx });

        // 🔄 Mark earned history as issued
        await FestGoCoinHistory.update(
          { status: "issued" },
          {
            where: {
              reason: "festbite referral",
              referenceId: festbite.id,
              status: "pending",
              type: "earned",
            },
            transaction: user_tx,
          }
        );
      }

      // 🔄 Mark used history as issued
      await FestGoCoinHistory.update(
        { status: "issued" },
        {
          where: {
            reason: "festbite",
            referenceId: festbite.id,
            status: "pending",
            type: "used",
          },
          transaction: user_tx,
        }
      );
    }

    // ❌ Handle cancelled
    else if (status === "cancelled") {
      const coinToIssue = await FestgoCoinToIssue.findOne({
        where: {
          status: "pending",
          type: "festbite_referral",
          issue: false,
          sourceType: "festbite",
          sourceId: festbite.id,
        },
        transaction: user_tx,
      });

      if (coinToIssue) {
        coinToIssue.issue = false;
        coinToIssue.status = "cancelled";
        await coinToIssue.save({ transaction: user_tx });

        await FestGoCoinHistory.update(
          { status: "not valid" },
          {
            where: {
              reason: "festbite referral",
              referenceId: festbite.id,
              status: "pending",
              type: "earned",
            },
            transaction: user_tx,
          }
        );
      }

      // 🔄 Refund used coins
      const usedCoinHistory = await FestGoCoinHistory.findOne({
        where: {
          reason: "festbite",
          referenceId: festbite.id,
          userId: festbite.userId,
          status: "pending",
          type: "used",
        },
        transaction: user_tx,
      });

      if (usedCoinHistory) {
        let refundedCoins = usedCoinHistory.coins;

        if (refundedCoins > 0) {
          const txnsToRestore = await FestgoCoinTransaction.findAll({
            where: {
              userId: festbite.userId,
              expiresAt: { [Op.gte]: new Date() },
            },
            order: [["expiresAt", "ASC"]],
            transaction: user_tx,
          });

          let remainingToRefund = refundedCoins;

          if (txnsToRestore.length === 0) {
            // No usable transactions → fallback
            await FestgoCoinTransaction.create(
              {
                userId: festbite.userId,
                type: "refund_grace_period",
                amount: refundedCoins,
                remaining: refundedCoins,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              },
              { transaction: user_tx }
            );
          } else {
            for (const txn of txnsToRestore) {
              const originallyUsed = txn.amount - txn.remaining;
              const refundable = Math.min(originallyUsed, remainingToRefund);

              if (refundable <= 0) continue;

              txn.remaining += refundable;
              remainingToRefund -= refundable;

              await txn.save({ transaction: user_tx });

              if (remainingToRefund <= 0) break;
            }

            if (remainingToRefund > 0) {
              await FestgoCoinTransaction.create(
                {
                  userId: festbite.userId,
                  type: "refund_grace_period",
                  amount: remainingToRefund,
                  remaining: remainingToRefund,
                  sourceType: "festbite_cancellation",
                  sourceId: festbite.id,
                  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                },
                { transaction: user_tx }
              );
            }
          }

          await usedCoinHistory.update(
            { status: "not valid" },
            { transaction: user_tx }
          );
        }
      }
    }

    await service_tx.commit();
    await user_tx.commit();
    return res.status(200).json({
      success: true,
      message: `Festbite status updated to '${status}'`,
      festbite,
    });
  } catch (error) {
    await service_tx.rollback();
    await user_tx.rollback();
    console.error("Error updating festbite status:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

exports.updateTripStatus = async (req, res) => {
  const service_tx = await sequelize.transaction();
  const user_tx = await usersequel.transaction();

  try {
    const { tripId } = req.params;
    const { status } = req.body;

    // ✅ Validate status
    const validStatuses = ["pending", "hold", "accepted", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
      });
    }

    // 🔍 Find trip
    const trip = await PlanMyTrips.findByPk(tripId, {
      transaction: service_tx,
    });
    if (!trip) {
      return res.status(404).json({
        success: false,
        message: "Trip not found",
      });
    }

    if (["accepted", "cancelled"].includes(trip.status)) {
      await service_tx.rollback();
      await user_tx.rollback();
      return res.status(409).json({
        message: `Trip is already finalized with status: ${trip.status}`,
      });
    }

    // ✅ Update status
    trip.status = status;
    await trip.save({ transaction: service_tx });

    // 💰 Issue coins if accepted
    if (status === "accepted") {
      const coinToIssue = await FestgoCoinToIssue.findOne({
        where: {
          status: "pending",
          type: "trips_referral",
          issue: false,
          sourceType: "trips",
          sourceId: trip.id,
        },
        transaction: user_tx,
      });

      if (coinToIssue) {
        const now = new Date();

        // 🔄 Create FestgoCoinTransaction
        await FestgoCoinTransaction.create(
          {
            userId: coinToIssue.userId,
            type: "trip_referral",
            amount: coinToIssue.coinsToIssue,
            remaining: coinToIssue.coinsToIssue,
            expiresAt: new Date(now.setMonth(now.getMonth() + 12)),
          },
          { transaction: user_tx }
        );

        // 🔄 Update FestgoCoinToIssue
        coinToIssue.issue = true;
        coinToIssue.issueAt = new Date();
        await coinToIssue.save({ transaction: user_tx });

        // 🔄 Update earned history
        await FestGoCoinHistory.update(
          { status: "issued" },
          {
            where: {
              reason: "trips referral",
              referenceId: trip.id,
              status: "pending",
              type: "earned",
            },
            transaction: user_tx,
          }
        );
      }

      // 🔄 Update used history
      await FestGoCoinHistory.update(
        { status: "issued" },
        {
          where: {
            reason: "trips_booking",
            referenceId: trip.id,
            status: "pending",
            type: "used",
          },
          transaction: user_tx,
        }
      );
    }

    // ❌ Handle cancelled
    else if (status === "cancelled") {
      const coinToIssue = await FestgoCoinToIssue.findOne({
        where: {
          status: "pending",
          type: "trips_referral",
          issue: false,
          sourceType: "trips",
          sourceId: trip.id,
        },
        transaction: user_tx,
      });

      if (coinToIssue) {
        coinToIssue.issue = false;
        coinToIssue.status = "cancelled";
        await coinToIssue.save({ transaction: user_tx });

        await FestGoCoinHistory.update(
          { status: "not valid" },
          {
            where: {
              reason: "trips referral",
              referenceId: trip.id,
              status: "pending",
              type: "earned",
            },
            transaction: user_tx,
          }
        );
      }

      const usedCoinHistory = await FestGoCoinHistory.findOne({
        where: {
          reason: "trips_booking",
          referenceId: trip.id,
          userId: trip.userId,
          status: "pending",
          type: "used",
        },
        transaction: user_tx,
      });

      if (usedCoinHistory) {
        let refundedCoins = usedCoinHistory.coins;

        if (refundedCoins > 0) {
          const txnsToRestore = await FestgoCoinTransaction.findAll({
            where: {
              userId: trip.userId,
              expiresAt: { [Op.gte]: new Date() },
            },
            order: [["expiresAt", "ASC"]],
            transaction: user_tx,
          });

          let remainingToRefund = refundedCoins;

          if (txnsToRestore.length === 0) {
            // No usable transactions — full refund as grace period fallback
            await FestgoCoinTransaction.create(
              {
                userId: trip.userId,
                type: "refund_grace_period",
                amount: refundedCoins,
                remaining: refundedCoins,
                sourceType: "trip_cancellation",
                sourceId: trip.id,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              },
              { transaction: user_tx }
            );
          } else {
            // Refund into existing coin transactions
            for (const txn of txnsToRestore) {
              const originallyUsed = txn.amount - txn.remaining;
              const refundable = Math.min(originallyUsed, remainingToRefund);

              if (refundable <= 0) continue;

              txn.remaining += refundable;
              remainingToRefund -= refundable;
              await txn.save({ transaction: user_tx });

              if (remainingToRefund <= 0) break;
            }

            // ⛳ If not fully refunded, create fallback transaction
            if (remainingToRefund > 0) {
              await FestgoCoinTransaction.create(
                {
                  userId: trip.userId,
                  type: "refund_grace_period",
                  amount: remainingToRefund,
                  remaining: remainingToRefund,
                  sourceType: "trip_cancellation",
                  sourceId: trip.id,
                  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                },
                { transaction: user_tx }
              );
            }
          }

          await usedCoinHistory.update(
            { status: "not valid" },
            { transaction: user_tx }
          );
        }
      }
    }

    await service_tx.commit();
    await user_tx.commit();

    return res.status(200).json({
      success: true,
      message: `Trip status updated to '${status}'`,
      trip,
    });
  } catch (error) {
    await service_tx.rollback();
    await user_tx.rollback();
    console.error("Error updating trip status:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// ✅ Create or Update Commission Settings (Only one commission record allowed)
exports.upsertCommission = async (req, res) => {
  try {
    const { commission } = req.body;

    // Validate commission value
    if (commission === undefined || commission === null) {
      return res.status(400).json({
        success: false,
        message: "Commission value is required",
      });
    }

    if (typeof commission !== "number" || commission < 0 || commission > 100) {
      return res.status(400).json({
        success: false,
        message: "Commission must be a number between 0 and 100",
      });
    }

    // Check if commission record already exists
    let existingCommission = await Commission.findOne();

    if (existingCommission) {
      // Update existing commission
      existingCommission.commission = commission;
      await existingCommission.save();

      return res.status(200).json({
        success: true,
        message: "Commission updated successfully",
        data: existingCommission,
      });
    } else {
      // Create new commission record
      const newCommission = await Commission.create({
        commission: commission,
      });

      return res.status(201).json({
        success: true,
        message: "Commission created successfully",
        data: newCommission,
      });
    }
  } catch (error) {
    console.error("Error in upsertCommission:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// ✅ Get Commission Settings
exports.getCommission = async (req, res) => {
  try {
    const commission = await Commission.findOne();

    if (!commission) {
      return res.status(404).json({
        success: false,
        message: "Commission settings not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: commission,
    });
  } catch (error) {
    console.error("Error fetching commission:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// ✅ Get Unpaid Hotel Payments (from property_bookings not in hotel_payments)
exports.getUnpaidHotelPayments = async (req, res) => {
  try {
    const { propertyId, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    // Build where clause for property_bookings
    let bookingWhereClause = {
      payment_status: "paid", // Only confirmed paid bookings
      booking_status: { [Op.in]: ["confirmed", "completed"] }, // Only confirmed/completed bookings
      check_in_date: { [Op.lte]: new Date() },
    };
    if (propertyId) {
      bookingWhereClause.property_id = propertyId;
    }

    // Get all paid bookings from property_bookings
    const allPaidBookings = await property_booking.findAll({
      where: bookingWhereClause,
      include: [
        {
          model: Property,
          as: "property",
          attributes: ["name", "email", "mobile_number"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });
    const commissionSettings = await Commission.findOne();
    const commissionPercentage = commissionSettings
      ? commissionSettings.commission
      : 0;

    // Get all booking IDs that are already in hotel_payments (already paid to hotels)
    const paidBookingIds = await HotelPayment.findAll({
      attributes: ["bookingId"],
      raw: true,
    });
    const paidBookingIdSet = new Set(
      paidBookingIds.map((item) => item.bookingId)
    );

    // Filter out bookings that are already paid to hotels
    const unpaidBookings = allPaidBookings.filter(
      (booking) => !paidBookingIdSet.has(booking.id)
    );

    // Apply pagination
    const totalUnpaid = unpaidBookings.length;
    const paginatedUnpaid = unpaidBookings.slice(
      offset,
      offset + parseInt(limit)
    );

    // Transform data to match expected format
    const formattedUnpaid = paginatedUnpaid.map((booking) => {
      const amountPaid = booking.amount_paid || 0;
      const commission = (amountPaid * commissionPercentage) / 100;
      const tds = commission * 0.02; // 2% TDS
      const gst = commission * 0.18; // 18% GST
      const netAmount = amountPaid - commission - tds - gst;

      return {
        id: booking.id,
        bookingId: booking.id,
        userId: booking.user_id,
        propertyId: booking.property_id,
        checkInDate: booking.check_in_date,
        checkOutDate: booking.check_out_date,
        numAdults: booking.num_adults,
        numChildren: booking.num_children,
        numRooms: booking.num_rooms,
        amountPaid: amountPaid,
        commission: parseFloat(commission.toFixed(2)),
        commissionPercentage: commissionPercentage,
        tds: parseFloat(tds.toFixed(2)),
        gst: parseFloat(gst.toFixed(2)),
        netAmount: parseFloat(netAmount.toFixed(2)),
        property: booking.property,
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt,
      };
    });

    return res.status(200).json({
      success: true,
      data: formattedUnpaid,
      pagination: {
        total: totalUnpaid,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalUnpaid / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching unpaid hotel payments:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// ✅ Get Paid Hotel Payments (from hotel_payments table)
exports.getPaidHotelPayments = async (req, res) => {
  try {
    const { propertyId, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = {};
    if (propertyId) {
      whereClause.propertyId = propertyId;
    }

    const paidPayments = await HotelPayment.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Property,
          as: "property",
          attributes: ["name", "email", "mobile_number"],
        },
      ],
      order: [["paymentDate", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    return res.status(200).json({
      success: true,
      data: paidPayments.rows,
      pagination: {
        total: paidPayments.count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(paidPayments.count / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching paid hotel payments:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
exports.exportUnpaidHotelPayments = async (req, res) => {
  try {
    const { propertyId } = req.query;

    // Step 1: Filter bookings that are paid by user but not paid to hotels
    let bookingWhereClause = {
      payment_status: "paid", // user paid
      booking_status: { [Op.in]: ["confirmed", "completed"] }, // confirmed/completed bookings
      check_in_date: {
        [Op.gt]: new Date(new Date().setDate(new Date().getDate() + 1)),
      },
    };
    if (propertyId) {
      bookingWhereClause.property_id = propertyId;
    }
    const commissionSettings = await Commission.findOne();
    const commissionPercentage = commissionSettings
      ? commissionSettings.commission
      : 0;

    // Step 2: Get all paid bookings
    const allPaidBookings = await property_booking.findAll({
      where: bookingWhereClause,
      include: [
        {
          model: Property,
          as: "property",
          attributes: ["name", "email", "mobile_number"],
        },
      ],
      check_in_date: { [Op.lte]: new Date() },

      order: [["createdAt", "DESC"]],
    });

    // Step 3: Get all booking IDs already in hotel_payments
    const paidBookingIds = await HotelPayment.findAll({
      attributes: ["bookingId"],
      raw: true,
    });
    const paidBookingIdSet = new Set(
      paidBookingIds.map((item) => item.bookingId)
    );

    // Step 4: Filter unpaid bookings (not yet paid to hotel)
    const unpaidBookings = allPaidBookings.filter(
      (booking) => !paidBookingIdSet.has(booking.id)
    );
    const excelData = unpaidBookings.map((booking, index) => {
      const amountPaid = booking.amount_paid || 0;
      const commission = (amountPaid * commissionPercentage) / 100;
      const tds = commission * 0.02; // 2% TDS
      const gst = commission * 0.18; // 18% GST
      const netAmount = amountPaid - commission - tds - gst;

      return {
        "S.No": index + 1,
        "Booking ID": booking.id,
        "Property Name": booking.property?.name || "N/A",
        "Property Email": booking.property?.email || "N/A",
        "Property Mobile": booking.property?.mobile_number || "N/A",
        "Check-in Date": booking.check_in_date,
        "Check-out Date": booking.check_out_date,
        Adults: booking.num_adults,
        Children: booking.num_children,
        Rooms: booking.num_rooms,
        "Amount Paid (₹)": amountPaid,
        "Commission Percentage (%)": commissionPercentage,
        "Commission (₹)": parseFloat(commission.toFixed(2)),
        "TDS (₹)": parseFloat(tds.toFixed(2)),
        "GST (₹)": parseFloat(gst.toFixed(2)),
        "Amount to be paid(₹)": parseFloat(netAmount.toFixed(2)),
        "Created Date": booking.createdAt,
      };
    });
    // Step 6: Create Excel workbook and write to buffer
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Unpaid Payments");

    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    const filename = `unpaid_hotel_payments_${
      new Date().toISOString().split("T")[0]
    }.xlsx`;

    // Step 7: Send Excel file as response
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    console.error("Error exporting unpaid hotel payments:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
// ✅ Export Paid Hotel Payments as Excel
exports.exportPaidHotelPayments = async (req, res) => {
  try {
    const { propertyId } = req.query;

    let whereClause = { status: "paid" };
    if (propertyId) {
      whereClause.propertyId = propertyId;
    }

    const paidPayments = await HotelPayment.findAll({
      where: whereClause,
      include: [
        {
          model: Property,
          as: "property",
          attributes: ["name", "email", "mobile_number"],
        },
      ],
      order: [["paymentDate", "DESC"]],
    });

    // Step 1: Create Excel-friendly data
    const excelData = paidPayments.map((payment, index) => ({
      "S.No": index + 1,
      "Booking ID": payment.bookingId,
      "Property Name": payment.property?.name || "N/A",
      "Property Email": payment.property?.email || "N/A",
      "Property Mobile": payment.property?.mobile_number || "N/A",
      "Check-in Date": payment.checkInDate,
      "Check-out Date": payment.checkOutDate,
      Adults: payment.numAdults,
      Children: payment.numChildren,
      Rooms: payment.numRooms,
      "Amount Paid (₹)": payment.amountPaid,
      "Commission (₹)": payment.commission,
      "TDS (₹)": payment.tds,
      "GST (₹)": payment.gst,
      "Amount paid to hotel (Net Amount ₹)": payment.netAmount,
      "Payment Date": payment.paymentDate,
      "Payment Reference": payment.paymentReference || "N/A",
      "Created Date": payment.createdAt,
    }));

    // Step 2: Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Paid Payments");

    // Step 3: Write workbook to buffer
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    const filename = `paid_hotel_payments_${
      new Date().toISOString().split("T")[0]
    }.xlsx`;

    // Step 4: Send Excel directly as response
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    console.error("Error exporting paid hotel payments:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// ✅ Mark All Checked-In Bookings for a Property as Paid
exports.markBookingsAsPaid = async (req, res) => {
  try {
    const { paymentReference, propertyId } = req.body;

    if (!propertyId) {
      return res.status(400).json({
        success: false,
        message: "propertyId is required",
      });
    }

    // Get commission settings
    const commissionSettings = await Commission.findOne();
    const commissionPercentage = commissionSettings
      ? commissionSettings.commission
      : 0;

    const createdPayments = [];
    const errors = [];

    // Step 1: Get all bookings that have already checked in
    const today = new Date();
    const checkedInBookings = await property_booking.findAll({
      where: {
        property_id: propertyId,
        payment_status: "paid", // only paid by user
        booking_status: { [Op.in]: ["confirmed", "completed"] },
        check_in_date: { [Op.lte]: today }, // already checked in
      },
      include: [
        {
          model: Property,
          as: "property",
          attributes: ["name", "email", "mobile_number"],
        },
      ],
    });

    // Step 2: Process each booking
    for (const booking of checkedInBookings) {
      try {
        // Skip if already paid to hotel
        const existingPayment = await HotelPayment.findOne({
          where: { bookingId: booking.id },
        });
        if (existingPayment) {
          errors.push(
            `Booking ${booking.id} is already marked as paid to hotel`
          );
          continue;
        }

        // Calculate financial details
        const amountPaid = booking.amount_paid;
        const commission = (amountPaid * commissionPercentage) / 100;
        const tds = commission * 0.02;
        const gst = commission * 0.18;
        const netAmount = amountPaid - commission - tds - gst;

        // Create hotel payment record
        const hotelPayment = await HotelPayment.create({
          bookingId: booking.id,
          userId: booking.user_id,
          propertyId: booking.property_id,
          checkInDate: booking.check_in_date,
          checkOutDate: booking.check_out_date,
          numAdults: booking.num_adults,
          numChildren: booking.num_children,
          numRooms: booking.num_rooms,
          amountPaid: amountPaid,
          transactionId: booking.transaction_id,
          tds: tds,
          gst: gst,
          commission: commission,
          netAmount: netAmount,
          status: "paid",
          paymentDate: new Date(),
          paymentReference: paymentReference,
        });

        createdPayments.push(hotelPayment);
      } catch (error) {
        console.error(`Error processing booking ${booking.id}:`, error);
        errors.push(`Error processing booking ${booking.id}: ${error.message}`);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Successfully processed ${createdPayments.length} bookings for property ${propertyId}`,
      data: {
        propertyId,
        createdPayments: createdPayments.length,
        totalRequested: checkedInBookings.length,
        errors,
      },
    });
  } catch (error) {
    console.error("Error marking bookings as paid:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
