const { User } = require("../models/users");
const {
  Property,
  Room,
  amenity,
  amenity_category,
  room_amenity,
  room_amenity_category,
  RoomBookedDate,
} = require("../models/services/index");
const { Op, Sequelize } = require("sequelize");
// total steps in your property creation process
const TOTAL_STEPS = 7;

// helper function to calculate status
const calculateStatus = (currentStep) => {
  return Math.floor((currentStep / TOTAL_STEPS) * 100);
};
// helper for checking available rooms
const checkAvailableRooms = async (
  property,
  adult,
  child,
  requestedRooms,
  startDate,
  finalDate
) => {
  const roomConditions = { propertyId: property.id };

  const totalPeople =
    (!isNaN(parseInt(adult)) ? parseInt(adult) : 0) +
    (!isNaN(parseInt(child)) ? parseInt(child) : 0);
  if (totalPeople > 0) {
    roomConditions.max_people = { [Op.gte]: totalPeople };
  }
  if (adult !== null && adult !== undefined && !isNaN(adult)) {
    roomConditions.max_adults = { [Op.gte]: parseInt(adult) };
  }
  if (child !== null && child !== undefined && !isNaN(child)) {
    roomConditions.max_children = { [Op.gte]: parseInt(child) };
  }

  const roomsInProperty = await Room.findAll({ where: roomConditions });
  if (!roomsInProperty.length) return null;

  const roomIds = roomsInProperty.map((room) => room.id);

  const bookedRooms = await RoomBookedDate.findAll({
    where: {
      roomId: { [Op.in]: roomIds },
      [Op.and]: [
        { checkIn: { [Op.lt]: finalDate } },
        { checkOut: { [Op.gt]: startDate } },
      ],
    },
  });

  const bookedRoomCounts = {};
  bookedRooms.forEach((booking) => {
    bookedRoomCounts[booking.roomId] =
      (bookedRoomCounts[booking.roomId] || 0) + 1;
  });

  const availableRooms = roomsInProperty.filter((room) => {
    const alreadyBooked = bookedRoomCounts[room.id] || 0;
    return (
      room.number_of_rooms - alreadyBooked >=
      (isNaN(requestedRooms) ? 1 : requestedRooms)
    );
  });

  if (!availableRooms.length) return null;

  const plainProperty = property.get({ plain: true });
  delete plainProperty.ownership_details;
  return plainProperty;
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
// exports.getAllActivePropertiesByRange = async (req, res) => {
//   try {
//     const { latitude, longitude } = req.query;

//     const properties = await Property.findAll({
//       where: { active: true },
//     });

//     if (!latitude || !longitude) {
//       // If no location provided, return first 20 active properties
//       return res.json({
//         success: true,
//         properties: properties.slice(0, 20).map((property) => {
//           const plainProperty = property.get({ plain: true });
//           delete plainProperty.ownership_details;
//           return plainProperty;
//         }),
//         status: 200,
//       });
//     }

//     // Haversine distance function
//     const haversineDistance = (lat1, lon1, lat2, lon2) => {
//       const toRad = (value) => (value * Math.PI) / 180;
//       const R = 6371; // Earth radius in km

//       const dLat = toRad(lat2 - lat1);
//       const dLon = toRad(lon2 - lon1);

//       const a =
//         Math.sin(dLat / 2) ** 2 +
//         Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

//       const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

//       return R * c;
//     };

//     // Filter properties within 10km
//     const nearbyProperties = properties.filter((property) => {
//       if (!property.location) return false;

//       const propLat = property.location.latitude;
//       const propLng = property.location.longitude;

//       if (propLat == null || propLng == null) return false;

//       const distance = haversineDistance(
//         parseFloat(latitude),
//         parseFloat(longitude),
//         parseFloat(propLat),
//         parseFloat(propLng)
//       );

//       return distance <= 10;
//     });

//     // Return only up to 20 properties
//     res.json({
//       success: true,
//       status: 200,
//       properties: nearbyProperties.slice(0, 20).map((property) => {
//         const plainProperty = property.get({ plain: true });
//         delete plainProperty.ownership_details;
//         return plainProperty;
//       }),
//     });
//   } catch (err) {
//     console.error("Error fetching properties:", err);
//     res.status(500).json({ message: err.message, status: 200 });
//   }
// };
exports.getAllActivePropertiesByRange = async (req, res) => {
  try {
    const {
      latitude,
      longitude,
      rooms,
      adult,
      child,
      todate,
      enddate,
      location,
    } = req.body;

    if (!latitude || !longitude) {
      const properties = await Property.findAll({
        where: { active: true },
        limit: 20,
      });

      return res.json({
        success: true,
        status: 200,
        properties: properties.map((p) => {
          const plain = p.get({ plain: true });
          delete plain.ownership_details;
          return plain;
        }),
      });
    }

    const startDate = new Date(todate);
    const finalDate = new Date(enddate);
    const requestedRooms = parseInt(rooms);

    const availableProperties = [];

    // Step 1: Nearby properties within 10km
    const nearbyProperties = await Property.findAll({
      where: {
        active: true,
        [Op.and]: Sequelize.literal(`
          earth_distance(
            ll_to_earth(${latitude}, ${longitude}),
            ll_to_earth(
              (location->>'latitude')::float, 
              (location->>'longitude')::float
            )
          ) <= 10000
        `),
      },
    });

    for (const property of nearbyProperties) {
      const available = await checkAvailableRooms(
        property,
        adult,
        child,
        requestedRooms,
        startDate,
        finalDate
      );
      if (available) availableProperties.push(available);
    }

    // Step 2: If less than 20, get from same city (using location.city from req.body)
    if (availableProperties.length < 20 && location) {
      const cityProperties = await Property.findAll({
        where: {
          active: true,
          [Op.and]: Sequelize.literal(`(location->>'city') = '${location}'`),
          id: { [Op.notIn]: availableProperties.map((p) => `'${p.id}'`) },
        },
        limit: 20 - availableProperties.length,
      });

      for (const property of cityProperties) {
        const available = await checkAvailableRooms(
          property,
          adult,
          child,
          requestedRooms,
          startDate,
          finalDate
        );
        if (available) availableProperties.push(available);
        if (availableProperties.length === 20) break;
      }
    }

    res.json({
      success: true,
      status: 200,
      properties: availableProperties,
    });
  } catch (err) {
    console.error("Error fetching nearby properties:", err);
    res.status(500).json({ message: err.message, status: 500 });
  }
};

exports.getAmenitiesForProperty = async (req, res) => {
  try {
    const { propertyId } = req.body;
    if (!propertyId) {
      return res
        .status(400)
        .json({ message: "propertyId is required", status: 400 });
    }

    // Fetch property by id
    const property = await Property.findOne({ where: { id: propertyId } });
    if (!property) {
      return res
        .status(404)
        .json({ message: "Property not found", status: 404 });
    }

    // === Fetch Property Amenities ===
    const amenityIds = property.amenities.map((a) => a.amenityId);

    const amenities = await amenity.findAll({
      where: { id: amenityIds },
      include: [{ model: amenity_category, as: "category" }],
      attributes: ["id", "name", "type", "options", "image"],
    });

    const propertyAmenities = amenities.map((a) => {
      const matchedValue = property.amenities.find(
        (am) => am.amenityId === a.id
      )?.value;

      return {
        id: a.id,
        name: a.name,
        type: a.type,
        image: a.image,
        value: matchedValue,
        categoryName: a.category ? a.category.categoryName : null,
        categoryImage: a.category ? a.category.image : null,
      };
    });

    // === Fetch Room Amenities ===
    const rooms = await Room.findAll({
      where: { propertyId },
      include: [{ model: room_amenity, as: "roomAmenities" }],
    });
    const roomAmenityIds = rooms.flatMap((room) =>
      room.room_amenities.map((ra) => ra.roomAmenityId)
    );

    const uniqueRoomAmenityIds = [...new Set(roomAmenityIds)];
    const roomAmenities = await room_amenity.findAll({
      where: { id: uniqueRoomAmenityIds },
      include: [{ model: room_amenity_category, as: "roomAmenityCategory" }],
      attributes: ["id", "name", "type", "options", "image"],
    });

    const roomAmenitiesList = roomAmenities.map((ra) => {
      const matchedValue = rooms
        .flatMap((room) => room.roomAmenities)
        .find((ram) => ram.roomAmenityId === ra.id)?.value;

      return {
        id: ra.id,
        name: ra.name,
        type: ra.type,
        value: matchedValue,
        image: ra.image,
        categoryName: ra.roomAmenityCategory
          ? ra.roomAmenityCategory.categoryName
          : null,
        categoryImage: ra.roomAmenityCategory
          ? ra.roomAmenityCategory.image
          : null,
      };
    });

    // Final clean response
    res.status(200).json({
      success: true,
      amenities: propertyAmenities,
      room_amenities: roomAmenitiesList,
      status: 200,
    });
  } catch (error) {
    console.error("Error fetching amenities:", error);
    res
      .status(500)
      .json({ message: "Something went wrong", error, status: 500 });
  }
};

exports.getRoomsByPropertyId = async (req, res) => {
  try {
    const { propertyId } = req.params;

    if (!propertyId) {
      return res
        .status(400)
        .json({ message: "propertyId is required", status: 400 });
    }

    // Fetch rooms by propertyId
    const rooms = await Room.findAll({
      where: { propertyId },
      include: [
        {
          model: room_amenity,
          as: "roomAmenities", // use the alias you defined in your model
        },
      ],
    });

    if (!rooms || rooms.length === 0) {
      return res
        .status(404)
        .json({ message: "No rooms found for this property", status: 404 });
    }

    res.status(200).json({
      success: true,
      status: 200,
      rooms,
    });
  } catch (error) {
    console.error("Error fetching rooms:", error);
    res
      .status(500)
      .json({ message: "Something went wrong", error, status: 500 });
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
