const {
  Festbite,
  MenuItem,
  MenuType,
  sequelize,
} = require("../models/services/index");
const {
  FestgoCoinTransaction,
  FestGoCoinHistory,
  usersequel,
} = require("../models/users/index");
const { handleReferralForFestbite } = require("../utils/issueCoins");
exports.createFestbite = async (req, res) => {
  const t = await sequelize.transaction();
  const user_tx = await usersequel.transaction();
  try {
    const userId = req.user.id;
    if (!userId) {
      await t.rollback();
      await user_tx.rollback();
      return res.status(401).json({ message: "Unauthorized: User not found" });
    }
    const requestedCoins = Number(req.body.festgo_coins) || 0;
    // const total_price = Number(req.body.estimatedBudget) || 0; // use eventBudget equivalent
    let festgo_coins_used = 0;
    let amount_to_be_paid = total_price;
    const festbiteData = { ...req.body };
    delete festbiteData.status;
    delete festbiteData.price_to_be_paid;
    festbiteData.userId = userId;
    festbiteData.status = "pending";
    if (requestedCoins > 0) {
      const now = new Date();

      const coinLimitConfig = await FestgoCoinUsageLimit.findOne({
        transaction: t,
      });
      if (!coinLimitConfig || !coinLimitConfig.festbite) {
        throw new Error(
          "FestGo coin usage limits for festbite are not configured."
        );
      }

      const { monthly_limit: monthlyLimit, transaction_limit: singleLimit } =
        coinLimitConfig.festbite;

      const startOfMonth = moment().startOf("month").toDate();
      const endOfMonth = moment().endOf("month").toDate();

      const usedThisMonth = await FestGoCoinHistory.sum("coins", {
        where: {
          userId,
          type: "used",
          createdAt: { [Op.between]: [startOfMonth, endOfMonth] },
        },
        transaction: user_tx,
      });

      const availableThisMonth = (monthlyLimit || 0) - (usedThisMonth || 0);

      if (availableThisMonth > 0) {
        const usable_coins = Math.min(
          requestedCoins,
          availableThisMonth,
          singleLimit || Infinity
        );

        let remainingToUse = usable_coins;
        let totalUsed = 0;

        const txns = await FestgoCoinTransaction.findAll({
          where: {
            userId,
            remaining: { [Op.gt]: 0 },
            expiresAt: { [Op.gt]: now },
          },
          order: [["expiresAt", "ASC"]],
          transaction: user_tx,
        });

        for (const txn of txns) {
          if (remainingToUse <= 0) break;
          const deduct = Math.min(txn.remaining, remainingToUse);
          txn.remaining -= deduct;
          await txn.save({ transaction: user_tx });

          totalUsed += deduct;
          remainingToUse -= deduct;
        }

        festgo_coins_used = totalUsed;
        amount_to_be_paid = total_price - totalUsed;
      }
    }
    festbiteData.festgo_coins_used = festgo_coins_used;
    festbiteData.coins_discount_value = festgo_coins_used;
    festbiteData.price_to_be_paid = amount_to_be_paid;
    const festbite = await Festbite.create(festbiteData, { transaction: t });

    if (festgo_coins_used > 0) {
      await FestGoCoinHistory.create(
        {
          userId,
          referenceId: festbite.id,
          type: "used",
          coins: festgo_coins_used,
          reason: "festbite",
          status: "pending",
        },
        { transaction: user_tx }
      );
    }
    const referralId = req.body.referral_id?.trim();
    if (referralId && referralId.length > 0) {
      await handleReferralForFestbite({
        referralId,
        festbite: festbite, // reuse same handler
        transactions: { service_tx: t, user_tx },
        reason: "festbite",
      });
    }
    await t.commit();
    await user_tx.commit();

    res.status(201).json({
      success: true,
      message: "Festbite created successfully",
      festbite,
    });
  } catch (error) {
    await t.rollback();
    await user_tx.rollback();
    console.error("Error creating festbite:", error);
    res.status(400).json({
      success: false,
      message: "Failed to create festbite. Please try again.",
    });
  }
};

exports.getAllFestbites = async (req, res) => {
  try {
    const festbites = await Festbite.findAll();
    res.json(festbites);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getFestbiteById = async (req, res) => {
  try {
    const festbite = await Festbite.findByPk(req.params.id);
    if (!festbite) return res.status(404).json({ message: "Not found" });
    res.json(festbite);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
exports.updateFestbite = async (req, res) => {
  try {
    const festbite = await Festbite.findByPk(req.params.id);
    if (!festbite) {
      return res.status(404).json({ message: "Not found" });
    }

    const { status, price_to_be_paid, ...updateData } = req.body;

    await festbite.update(updateData);

    res.json(festbite);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteFestbite = async (req, res) => {
  try {
    const festbite = await Festbite.findByPk(req.params.id);
    if (!festbite) return res.status(404).json({ message: "Not found" });
    await festbite.destroy();
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getFestbitesByUser = async (req, res) => {
  try {
    const userId = req.user.id;
    const festbites = await Festbite.findAll({ where: { userId } });
    res.json(festbites);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
exports.getFestbitesForAdmin = async (req, res) => {
  try {
    const userId = req.params.id;
    const festbites = await Festbite.findAll({ where: { userId } });
    res.json(festbites);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
// menu type
exports.createMenuType = async (req, res) => {
  try {
    const menuType = await MenuType.create(req.body);
    res.status(201).json(menuType);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAllMenuTypes = async (req, res) => {
  try {
    const menuTypes = await MenuType.findAll();
    res.json(menuTypes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateMenuType = async (req, res) => {
  try {
    const menuType = await MenuType.findByPk(req.params.id);
    if (!menuType) return res.status(404).json({ message: "Not found" });
    await menuType.update(req.body);
    res.json(menuType);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteMenuType = async (req, res) => {
  try {
    const menuType = await MenuType.findByPk(req.params.id);
    if (!menuType) return res.status(404).json({ message: "Not found" });
    await menuType.destroy();
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// menu item
exports.createMenuItem = async (req, res) => {
  try {
    const { itemName, menuTypeId, imageUrl } = req.body;
    const menuType = await MenuType.findByPk(menuTypeId);
    if (!menuType)
      return res.status(404).json({ message: "Menu Type not found" });

    const menuItem = await MenuItem.create({ itemName, menuTypeId, imageUrl });
    res.status(201).json(menuItem);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getAllMenuItems = async (req, res) => {
  try {
    const menuItems = await MenuItem.findAll({ include: "menuType" });
    res.json(menuItems);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const { itemName, imageUrl, menuTypeId } = req.body;

    const menuItem = await MenuItem.findByPk(id);
    if (!menuItem) {
      return res.status(404).json({ message: "Menu Item not found" });
    }

    // Update fields if provided
    if (itemName) menuItem.itemName = itemName;
    if (imageUrl) menuItem.imageUrl = imageUrl;
    if (menuTypeId) menuItem.menuTypeId = menuTypeId;

    await menuItem.save();

    res
      .status(200)
      .json({ message: "Menu Item updated successfully", menuItem });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
exports.getMenuItemsByType = async (req, res) => {
  try {
    const { menuTypeId } = req.params;

    const menuItems = await MenuItem.findAll({
      where: { menuTypeId },
    });

    res.json(menuItems);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
exports.getMenuItemsByTypesForUser = async (req, res) => {
  try {
    const menuItems = await MenuItem.findAll({
      include: [
        {
          model: MenuType,
          as: "menuType",
          attributes: ["typeName"], // only fetch typeName
        },
      ],
      attributes: [
        "id",
        "itemName",
        "menuTypeId",
        "imageUrl",
        "createdAt",
        "updatedAt",
      ], // exclude menuTypeId if not needed
    });

    // Group items by menuType.typeName and remove the nested menuType object
    const groupedItems = {};
    menuItems.forEach((item) => {
      const typeName = item.menuType?.typeName || "Unknown";

      if (!groupedItems[typeName]) {
        groupedItems[typeName] = [];
      }

      // Exclude the `menuType` field from the item
      const { menuType, ...cleanItem } = item.toJSON();
      groupedItems[typeName].push(cleanItem);
    });

    res.json(groupedItems);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteMenuItem = async (req, res) => {
  try {
    const menuItem = await MenuItem.findByPk(req.params.id);
    if (!menuItem) return res.status(404).json({ message: "Not found" });
    await menuItem.destroy();
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
