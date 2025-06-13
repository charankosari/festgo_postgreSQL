const { Festbite, MenuItem, MenuType } = require("../models/services/index");

exports.createFestbite = async (req, res) => {
  try {
    const festbite = await Festbite.create(req.body);
    res.status(201).json(festbite);
  } catch (err) {
    res.status(500).json({ error: err.message });
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
    if (!festbite) return res.status(404).json({ message: "Not found" });
    await festbite.update(req.body);
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
