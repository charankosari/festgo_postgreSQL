const {
  Event,
  EventType,
  FestgoCoinUsageLimit,
  sequelize,
} = require("../models/services"); // adjust path as per your project
const {
  usersequel,
  FestGoCoinHistory,
  FestgoCoinTransaction,
} = require("../models/users");
const { handleReferralForEvent } = require("../utils/issueCoins"); // adjust path as per your project}
// Create Event
exports.createEvent = async (req, res) => {
  const t = await sequelize.transaction();
  const user_tx = await usersequel.transaction();

  try {
    const userId = req.user.id;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: User not found" });
    }

    // 🧹 Remove 'status' from req.body if present
    if ("status" in req.body) {
      delete req.body.status;
    }

    const eventData = {
      ...req.body,
      userId,
      status: "pending",
    };

    // ⏺️ Create event
    const event = await Event.create(eventData, { transaction: t });

    // 🪙 Inline Coin Application
    const requestedCoins = Number(req.body.requestedCoins) || 0;
    const total_price = Number(req.body.eventBudget) || 0;
    const type = "event";
    const now = new Date();

    let coinLimit = await FestgoCoinUsageLimit.findOne({ transaction: t });

    if (!coinLimit) {
      throw new Error("Festgo coin usage limit not set for user.");
    }
    coinLimit = coinLimit.event;
    const monthlyLimit = Number(coinLimit.monthly_limit);
    const singleLimit = Number(coinLimit.transaction_limit);

    const txns = await FestgoCoinTransaction.findAll({
      where: {
        userId,
        remaining: { [Op.gt]: 0 },
        expiresAt: { [Op.gt]: now },
      },
      order: [["expiresAt", "ASC"]],
      transaction: user_tx,
    });

    const startOfMonth = moment().startOf("month").toDate();
    const endOfMonth = moment().endOf("month").toDate();

    const usedThisMonth = await FestGoCoinHistory.sum("coins", {
      where: {
        userId,
        type: "used",
        createdAt: {
          [Op.between]: [startOfMonth, endOfMonth],
        },
      },
      transaction: user_tx,
    });

    const availableThisMonth = monthlyLimit - (usedThisMonth || 0);

    let festgo_coins_used = 0;
    let amount_to_be_paid = total_price;

    if (availableThisMonth > 0) {
      const usable_coins = Math.min(
        requestedCoins,
        availableThisMonth,
        singleLimit
      );
      let remainingToUse = usable_coins;
      let totalUsed = 0;

      for (const txn of txns) {
        if (remainingToUse <= 0) break;
        const deduct = Math.min(txn.remaining, remainingToUse);
        txn.remaining -= deduct;
        await txn.save({ transaction: t });

        totalUsed += deduct;
        remainingToUse -= deduct;
      }

      if (totalUsed > 0) {
        await FestGoCoinHistory.create(
          {
            userId,
            type: "used",
            coins: totalUsed,
            reason: type,
            status: "pending",
          },
          { transaction: user_tx }
        );

        festgo_coins_used = totalUsed;
        amount_to_be_paid = total_price - totalUsed;
      }
    }

    // 📢 Handle referral if present
    const referralId = req.body.referral_id?.trim();
    if (referralId && referralId.length > 0) {
      await handleReferralForEvent(referralId, event);
    }

    await t.commit();
    await user_tx.commit();

    res.status(201).json({
      success: true,
      message: "Event created successfully",
      status: 201,
      event,
      festgo_coins_used,
      coins_discount_value: festgo_coins_used,
      amount_to_be_paid,
    });
  } catch (error) {
    console.error("Error creating event:", error);
    await t.rollback();
    await user_tx.rollback();
    res.status(400).json({
      success: false,
      message: error.message,
      status: 400,
    });
  }
};

// Update Event
exports.updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findByPk(id);

    if (!event) return res.status(404).json({ message: "Event not found" });

    // 🧹 Remove 'active' from req.body if present
    if ("status" in req.body) {
      delete req.body.status;
    }

    await event.update(req.body);
    res.json(event);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete Event
exports.deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findByPk(id);

    if (!event) return res.status(404).json({ message: "Event not found" });

    await event.destroy();
    res.json({ message: "Event deleted successfully" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get All Events
exports.getAllEvents = async (req, res) => {
  try {
    const events = await Event.findAll({
      include: [{ model: EventType, as: "EventType" }],
    });
    res.json(events);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get Event By Id
exports.getEventById = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findByPk(id, {
      include: [{ model: EventType, as: "EventType" }],
    });

    if (!event) return res.status(404).json({ message: "Event not found" });

    res.json(event);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get Events By VendorId
exports.getEventsByUserId = async (req, res) => {
  try {
    const { userId } = req.params;
    const events = await Event.findAll({
      where: { userId: userId },
      include: [{ model: EventType, as: "EventType" }],
    });

    res.json(events);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get Events By EventTypeId
exports.getEventsByEventTypeId = async (req, res) => {
  try {
    const { eventTypeId } = req.params;
    const events = await Event.findAll({
      where: { eventTypeId },
      include: [{ model: EventType, as: "EventType" }],
    });

    res.json(events);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// event types controllers

exports.createEventType = async (req, res) => {
  try {
    const eventType = await EventType.create(req.body);
    res.status(201).json(eventType);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update EventType
exports.updateEventType = async (req, res) => {
  try {
    const { id } = req.params;
    const eventType = await EventType.findByPk(id);

    if (!eventType)
      return res.status(404).json({ message: "EventType not found" });

    await eventType.update(req.body);
    res.json(eventType);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete EventType
exports.deleteEventType = async (req, res) => {
  try {
    const { id } = req.params;
    const eventType = await EventType.findByPk(id);

    if (!eventType)
      return res.status(404).json({ message: "EventType not found" });

    await eventType.destroy();
    res.json({ message: "EventType deleted successfully" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get All EventTypes
exports.getAllEventTypes = async (req, res) => {
  try {
    const eventTypes = await EventType.findAll();
    res.json(eventTypes);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get EventType By Id
exports.getEventTypeById = async (req, res) => {
  try {
    const { id } = req.params;
    const eventType = await EventType.findByPk(id);

    if (!eventType)
      return res.status(404).json({ message: "EventType not found" });

    res.json(eventType);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
