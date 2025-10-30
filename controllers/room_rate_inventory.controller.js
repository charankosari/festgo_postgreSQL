const {
  RoomRateInventory,
  Property,
  Room,
} = require("../models/services/index.js");
const moment = require("moment");
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
    const formattedDate = moment(date).format("YYYY-MM-DD");
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
          date: formattedDate,
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
          date: formattedDate,
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

exports.getRoomRatesForDate = async (req, res) => {
  try {
    const { propertyId, roomId, date } = req.body;
    const userId = req.user.id || null;
    if (!propertyId || !roomId || !date) {
      return res
        .status(400)
        .json({ message: "propertyId, roomId, and date are required" });
    }
    // Check that property exists and belongs to this vendor
    const property = await Property.findByPk(propertyId);
    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }
    if (property.vendorId !== userId) {
      return res
        .status(403)
        .json({ message: "Unauthorized: Not your property" });
    }
    // Check that room exists under this property
    const room = await Room.findByPk(roomId);
    if (!room) {
      return res
        .status(404)
        .json({ message: "Room not found under this property" });
    }
    const formattedDate = moment(date).format("YYYY-MM-DD");
    // Try to find special rate/inventory for this date and room
    const roomRateInventory = await RoomRateInventory.findOne({
      where: {
        propertyId,
        roomId,
        date: formattedDate,
      },
    });
    let roomObj;
    if (roomRateInventory) {
      // Special rate set for this date
      const rp = roomRateInventory.price || {};
      roomObj = {
        roomId: roomId,
        inventory: roomRateInventory.inventory,
        base: rp.base,
        extra: rp.extra,
        offerBaseRate: rp.offerBaseRate,
        offerPlusOne: rp.offerPlusOne,
      };
    } else {
      // No special rate, fall back to room default prices
      // room.price could be {base_price_for_2_adults, extra_adult_charge, child_charge, ...}
      const rp = room.price || {};
      roomObj = {
        roomId: roomId,
        inventory: room.number_of_rooms || null,
        base: rp.base_price_for_2_adults || 0,
        extra: room.price.extra_adult_charge || 0,
        offerBaseRate: room.price.base_price_for_2_adults || 0,
        offerPlusOne: room.price.extra_adult_charge || 0,
      };
    }
    return res.status(200).json({
      propertyId: propertyId,
      date: formattedDate,
      rooms: [roomObj],
    });
  } catch (err) {
    console.error("Error in getRoomRatesForDate:", err);
    return res.status(500).json({ message: err.message });
  }
};
