const { Wishlist } = require("../models/users/index");
// ✅ Create Wishlist Item
exports.createWishlist = async (req, res) => {
  try {
    const { wishlisted_id, type } = req.body;
    const user_id = req.user.id;

    const existing = await Wishlist.findOne({
      where: { user_id, wishlisted_id, type },
    });
    if (existing) {
      return res.status(400).json({ message: "Item already in wishlist" });
    }

    const wishlistItem = await Wishlist.create({
      user_id,
      wishlisted_id,
      type,
    });
    return res
      .status(201)
      .json({ message: "Item added to wishlist", wishlistItem });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ Get Wishlist Items by User
exports.getWishlist = async (req, res) => {
  try {
    const user_id = req.user.id;
    const wishlist = await Wishlist.findAll({ where: { user_id } });
    return res.status(200).json({ wishlist });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ Delete Wishlist Item
exports.deleteWishlistItem = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { id } = req.params;

    const wishlistItem = await Wishlist.findOne({ where: { id, user_id } });
    if (!wishlistItem) {
      return res.status(404).json({ message: "Wishlist item not found" });
    }

    await wishlistItem.destroy();
    return res.status(200).json({ message: "Item removed from wishlist" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ Update Wishlist Item (type only — optional)
exports.updateWishlistItem = async (req, res) => {
  try {
    const user_id = req.user.id;
    const { id } = req.params;
    const { type } = req.body;

    const wishlistItem = await Wishlist.findOne({ where: { id, user_id } });
    if (!wishlistItem) {
      return res.status(404).json({ message: "Wishlist item not found" });
    }

    wishlistItem.type = type || wishlistItem.type;
    await wishlistItem.save();

    return res
      .status(200)
      .json({ message: "Wishlist item updated", wishlistItem });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};
