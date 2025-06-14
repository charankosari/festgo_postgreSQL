const { User } = require("../models/users");
const {
  Property,
  Room,
  amenity,
  amenity_category,
  room_amenity,
  room_amenity_category,
} = require("../models/services/index");
// total steps in your property creation process
const TOTAL_STEPS = 7;

// helper function to calculate status
const calculateStatus = (currentStep) => {
  return Math.floor((currentStep / TOTAL_STEPS) * 100);
};

// ✅ Create Property
exports.createProperty = async (req, res) => {
  try {
    const { current_step = 1, ...details } = req.body;
    const vendorId = req.user.id;
    const vendor = await User.findByPk(vendorId);
    if (!vendor) return res.status(404).json({ message: "Vendor not found" });
    if (vendor.role !== "vendor")
      return res
        .status(403)
        .json({ message: "Vendor can only create a property" });

    const status = calculateStatus(current_step);
    const in_progress = status < 100;
    const is_completed = status === 100;

    const property = await Property.create({
      vendorId,
      current_step,
      status,
      in_progress,
      is_completed,
      ...details,
    });

    res.status(201).json({ success: true, property });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Update Property by ID
exports.updateProperty = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const property = await Property.findByPk(id);
    if (!property)
      return res.status(404).json({ message: "Property not found" });

    // If rooms are included in update request
    if (updates.rooms && Array.isArray(updates.rooms)) {
      // Create new room records for this property without deleting existing ones
      await Promise.all(
        updates.rooms.map((room) =>
          Room.create({
            ...room,
            propertyId: id,
          })
        )
      );

      // Remove rooms key from updates so it doesn't touch Property model's 'rooms' JSONB field
      delete updates.rooms;
    }

    // Update other property fields
    await property.update(updates);

    // recalculate status and completion state
    const currentStep = updates.current_step || property.current_step + 1;
    const status = Math.floor((currentStep / 7) * 100);
    const in_progress = status < 100;
    const is_completed = status === 100;

    await property.update({
      current_step: currentStep,
      status,
      in_progress,
      is_completed,
    });

    res.json({ success: true, property });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Get All Properties
exports.getAllProperties = async (req, res) => {
  try {
    const properties = await Property.findAll();
    res.json({ success: true, properties });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// get all active properties
exports.getAllActiveProperties = async (req, res) => {
  try {
    const properties = await Property.findAll({
      where: { active: true },
    });
    res.json({ success: true, properties });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Get Property by ID
exports.getPropertyById = async (req, res) => {
  try {
    const { id } = req.params;
    const property = await Property.findByPk(id);
    if (!property)
      return res.status(404).json({ message: "Property not found" });
    res.json({ success: true, property });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Get Properties by Vendor
exports.getPropertiesByVendor = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const properties = await Property.findAll({ where: { vendorId } });
    res.json({ success: true, properties });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ Delete Property by ID
exports.deleteProperty = async (req, res) => {
  try {
    const { id } = req.params;
    const property = await Property.findByPk(id);
    if (!property)
      return res.status(404).json({ message: "Property not found" });

    await property.destroy();
    res.json({ success: true, message: "Property deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
//  get property range 10 km
exports.getAllActivePropertiesByRange = async (req, res) => {
  try {
    const { latitude, longitude } = req.query;

    const properties = await Property.findAll({
      where: { active: true },
    });

    if (!latitude || !longitude) {
      // If no location provided, return first 20 active properties
      return res.json({
        success: true,
        properties: properties.slice(0, 20).map((property) => {
          const plainProperty = property.get({ plain: true });
          delete plainProperty.ownership_details;
          return plainProperty;
        }),
      });
    }

    // Haversine distance function
    const haversineDistance = (lat1, lon1, lat2, lon2) => {
      const toRad = (value) => (value * Math.PI) / 180;
      const R = 6371; // Earth radius in km

      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);

      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      return R * c;
    };

    // Filter properties within 10km
    const nearbyProperties = properties.filter((property) => {
      if (!property.location) return false;

      const propLat = property.location.latitude;
      const propLng = property.location.longitude;

      if (propLat == null || propLng == null) return false;

      const distance = haversineDistance(
        parseFloat(latitude),
        parseFloat(longitude),
        parseFloat(propLat),
        parseFloat(propLng)
      );

      return distance <= 10;
    });

    // Return only up to 20 properties
    res.json({
      success: true,
      properties: nearbyProperties.slice(0, 20).map((property) => {
        const plainProperty = property.get({ plain: true });
        delete plainProperty.ownership_details;
        return plainProperty;
      }),
    });
  } catch (err) {
    console.error("Error fetching properties:", err);
    res.status(500).json({ message: err.message });
  }
};

exports.getAmenitiesForProperty = async (req, res) => {
  try {
    const { propertyId } = req.body;
    if (!propertyId) {
      return res.status(400).json({ message: "propertyId is required" });
    }

    // Fetch property by id
    const property = await Property.findOne({ where: { id: propertyId } });
    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }

    // === Fetch Property Amenities ===
    const amenityIds = property.amenities.map((a) => a.amenityId);

    const amenities = await amenity.findAll({
      where: { id: amenityIds },
      include: [{ model: amenity_category, as: "category" }],
      attributes: ["id", "name", "type", "options"],
    });

    const propertyAmenities = amenities.map((a) => {
      const matchedValue = property.amenities.find(
        (am) => am.amenityId === a.id
      )?.value;

      return {
        id: a.id,
        name: a.name,
        type: a.type,
        value: matchedValue,
        categoryName: a.category ? a.category.categoryName : null,
      };
    });

    // === Fetch Room Amenities ===
    const rooms = await Room.findAll({
      where: { propertyId },
      include: ["room_amenities"], // assuming you have a relation alias set as 'room_amenities'
    });

    const roomAmenityIds = rooms.flatMap((room) =>
      room.room_amenities.map((ra) => ra.roomAmenityId)
    );

    const uniqueRoomAmenityIds = [...new Set(roomAmenityIds)];

    const roomAmenities = await room_amenity.findAll({
      where: { id: uniqueRoomAmenityIds },
      include: [{ model: room_amenity_category, as: "roomAmenityCategory" }],
      attributes: ["id", "name", "type", "options"],
    });

    const roomAmenitiesList = roomAmenities.map((ra) => {
      const matchedValue = rooms
        .flatMap((room) => room.room_amenities)
        .find((ram) => ram.roomAmenityId === ra.id)?.value;

      return {
        id: ra.id,
        name: ra.name,
        type: ra.type,
        value: matchedValue,
        categoryName: ra.roomAmenityCategory
          ? ra.roomAmenityCategory.categoryName
          : null,
      };
    });

    // Final clean response
    res.status(200).json({
      success: true,
      amenities: propertyAmenities,
      room_amenities: roomAmenitiesList,
    });
  } catch (error) {
    console.error("Error fetching amenities:", error);
    res.status(500).json({ message: "Something went wrong", error });
  }
};
exports.getRoomsByPropertyId = async (req, res) => {
  try {
    const { propertyId } = req.params;

    if (!propertyId) {
      return res.status(400).json({ message: "propertyId is required" });
    }

    // Fetch rooms by propertyId
    const rooms = await Room.findAll({
      where: { propertyId },
      include: [
        {
          model: room_amenity,
          as: "room_amenities", // use the alias you defined in your model
        },
      ],
    });

    if (!rooms || rooms.length === 0) {
      return res
        .status(404)
        .json({ message: "No rooms found for this property" });
    }

    res.status(200).json({
      success: true,
      rooms,
    });
  } catch (error) {
    console.error("Error fetching rooms:", error);
    res.status(500).json({ message: "Something went wrong", error });
  }
};
exports.editRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Find room by ID
    const room = await Room.findByPk(id);

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    // Update fields
    await room.update(updates);

    res.status(200).json({
      success: true,
      message: "Room updated successfully",
      room,
    });
  } catch (error) {
    console.error("Error updating room:", error);
    res.status(500).json({ message: "Something went wrong", error });
  }
};
exports.deleteRoom = async (req, res) => {
  try {
    const { id } = req.params;

    // Find room by ID
    const room = await Room.findByPk(id);

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    // Delete the room
    await room.destroy();

    res.status(200).json({
      success: true,
      message: "Room deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting room:", error);
    res.status(500).json({ message: "Something went wrong", error });
  }
};
