const { RoomRateInventory, Property } = require("../models/services/index.js");

exports.submitRoomRates = async (req, res) => {
  try {
    const { propertyId, date, rooms } = req.body;
    const userId = req.user.id || null;

    if (!propertyId || !date || !Array.isArray(rooms)) {
      return res.status(400).json({ message: "Invalid request body" });
    }

    // ✅ Check if property exists and belongs to this vendor
    const property = await Property.findByPk(propertyId);
    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }

    if (property.vendorId !== userId) {
      return res
        .status(403)
        .json({ message: "Unauthorized: Not your property" });
    }

    // Proceed with upserts
    const upsertPromises = rooms.map(async (room) => {
      const { roomId, inventory, base, extra, offerBaseRate, offerPlusOne } =
        room;

      if (!roomId) {
        throw new Error("Missing roomId for one of the rooms");
      }

      const existingEntry = await RoomRateInventory.findOne({
        where: {
          propertyId,
          roomId,
          date,
        },
      });

      if (existingEntry) {
        existingEntry.inventory = inventory;
        existingEntry.price = {
          base: parseFloat(base),
          extra: parseFloat(extra),
          offerBaseRate: parseFloat(offerBaseRate),
          offerPlusOne: parseFloat(offerPlusOne),
        };
        existingEntry.userId = userId;

        await existingEntry.save();
        return existingEntry;
      } else {
        const newEntry = await RoomRateInventory.create({
          propertyId,
          roomId,
          userId,
          date,
          inventory,
          price: {
            base: parseFloat(base),
            extra: parseFloat(extra),
            offerBaseRate: parseFloat(offerBaseRate),
            offerPlusOne: parseFloat(offerPlusOne),
          },
        });
        return newEntry;
      }
    });

    const results = await Promise.all(upsertPromises);

    return res.status(200).json({
      success: true,
      message: "Rates and inventory updated successfully",
      data: results,
    });
  } catch (err) {
    console.error("Error in submitRoomRates:", err);
    return res.status(500).json({ message: err.message });
  }
};
