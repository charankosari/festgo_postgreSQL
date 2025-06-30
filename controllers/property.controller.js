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
const { review } = require("../models/users/index");
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
      status: { [Op.in]: ["pending", "confirmed"] },
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

const enrichProperties = async (properties) => {
  const enriched = [];

  for (const p of properties) {
    const plain = p.get ? p.get({ plain: true }) : p;
    // Fetch amenities by IDs
    const amenityIds = plain.amenities?.map((a) => a.amenityId) || [];

    let amenities = [];
    if (amenityIds.length) {
      const foundAmenities = await amenity.findAll({
        where: { id: { [Op.in]: amenityIds } },
        attributes: ["name"],
      });
      amenities = foundAmenities.map((a) => a.name);
    }

    // Attach amenities as 'facilities'
    plain.facilities = amenities;

    // Clean up ownership_details
    delete plain.ownership_details;

    // Format final response
    const formattedProperty = await formatPropertyResponse(plain);
    if (formattedProperty) enriched.push(formattedProperty);
  }

  return enriched;
};

const formatPropertyResponse = async (property) => {
  const {
    id,
    vendorId,
    name,
    property_type,
    email,
    description,
    star_rating,
    location,
    photos,
    facilities,
    review_count,
  } = property;

  // Parse image URLs
  const imageList = photos ? photos.map((p) => JSON.parse(p).url) : [];

  // Fetch room
  const room = await Room.findOne({
    where: { propertyId: id },
    order: [["discounted_price", "ASC"]],
  });

  // If no room found, skip property
  if (!room) return null;

  // Extract room details
  const pricePerNight = `${room.discounted_price}`;
  const originalPrice = `${room.original_price}`;
  const discount = room.discount;
  const additionalInfo = room.additional_info || "";
  const freeBreakfast = room.free_breakfast;
  const freeCancellation = room.free_cancellation;

  return {
    id,
    vendorId,
    name,
    property_type,
    email,
    description,
    star_rating,
    pricePerNight,
    originalPrice,
    discount,
    additionalInfo,
    freeBreakfast,
    freeCancellation,
    review_count,
    location,
    facilities,
    imageList,
  };
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
    let currentStep = property.current_step;

    // If update value exists and is ≤ 7, use it
    if (updates.current_step !== undefined) {
      currentStep = Math.min(updates.current_step, 7);
    } else if (currentStep < 7) {
      // If no update provided, increment only if less than 7
      currentStep += 1;
    }

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

    const properties = await Property.findAll({
      where: { vendorId },
      include: [
        {
          model: Room,
          as: "rooms",
        },
      ],
    });

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
    const {
      latitude,
      longitude,
      rooms,
      adult,
      child,
      todate,
      enddate,
      location,
      property_type,
    } = req.body;

    const startDate = new Date(todate);
    const finalDate = new Date(enddate);
    const requestedRooms = parseInt(rooms);

    // Prepare property_type filter if given
    const propertyTypeFilter = property_type
      ? Sequelize.where(
          Sequelize.fn("lower", Sequelize.col("property_type")),
          property_type.toLowerCase()
        )
      : null;

    const availableProperties = [];

    // Step 1: Nearby properties within 10km
    if (latitude && longitude) {
      const whereNearby = {
        active: true,
        [Op.and]: [
          propertyTypeFilter,
          Sequelize.literal(`
            earth_distance(
              ll_to_earth(${latitude}, ${longitude}),
              ll_to_earth(
                (location->>'latitude')::float, 
                (location->>'longitude')::float
              )
            ) <= 10000
          `),
        ].filter(Boolean),
      };

      const nearbyProperties = await Property.findAll({ where: whereNearby });

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
    }

    // Step 2: If less than 20 and location.city given
    if (availableProperties.length < 20 && location) {
      const whereCity = {
        active: true,
        [Op.and]: [
          propertyTypeFilter,
          Sequelize.literal(`(location->>'city') = '${location}'`),
        ].filter(Boolean),
        id: {
          [Op.notIn]: availableProperties.map((p) => p.id),
        },
      };

      const cityProperties = await Property.findAll({
        where: whereCity,
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

    // Step 3: Fallback — fetch default active properties (same type if given)
    if (availableProperties.length < 20) {
      const whereFallback = {
        active: true,
        [Op.and]: [propertyTypeFilter].filter(Boolean),
        id: {
          [Op.notIn]: availableProperties.map((p) => p.id),
        },
      };

      const fallbackProperties = await Property.findAll({
        where: whereFallback,
        limit: 20 - availableProperties.length,
      });

      availableProperties.push(...fallbackProperties);
    }

    // Step 4: Enrich final properties
    const finalProperties = await enrichProperties(availableProperties);

    return res.json({
      success: true,
      status: 200,
      properties: finalProperties,
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

    // Fetch property
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

    // Group amenities by category
    const categoryMap = {};
    amenities.forEach((a) => {
      const categoryName = a.category ? a.category.categoryName : "General";
      const categoryImage = a.category
        ? a.category.image
        : "https://example.com/default_icon.png";

      if (!categoryMap[categoryName]) {
        categoryMap[categoryName] = {
          iconRes: categoryImage,
          title: categoryName,
          features: [],
        };
      }
      categoryMap[categoryName].features.push(a.name);
    });

    // === Fetch Room Amenities ===
    const rooms = await Room.findAll({
      where: { propertyId },
      include: [{ model: room_amenity, as: "roomAmenities" }],
    });
    const roomAmenityIds = rooms.flatMap((room) =>
      (room.room_amenities || []).map((ra) => ra.roomAmenityId)
    );

    const uniqueRoomAmenityIds = [...new Set(roomAmenityIds)];

    const roomAmenities = await room_amenity.findAll({
      where: { id: uniqueRoomAmenityIds },
      include: [{ model: room_amenity_category, as: "roomAmenityCategory" }],
      attributes: ["id", "name", "type", "options", "image"],
    });

    // Group room amenities by category
    roomAmenities.forEach((ra) => {
      const categoryName = ra.roomAmenityCategory
        ? ra.roomAmenityCategory.categoryName
        : "General";
      const categoryImage = ra.roomAmenityCategory
        ? ra.roomAmenityCategory.image
        : "https://example.com/default_icon.png";

      if (!categoryMap[categoryName]) {
        categoryMap[categoryName] = {
          iconRes: categoryImage,
          title: categoryName,
          features: [],
        };
      }
      categoryMap[categoryName].features.push(ra.name);
    });

    // Convert map to array
    const finalData = Object.values(categoryMap);

    res.status(200).json({
      data: finalData,
      responseCode: "200",
      responseMessage: "Facilities fetched successfully",
    });
  } catch (error) {
    console.error("Error fetching amenities:", error);
    res.status(500).json({
      message: "Something went wrong",
      error: error.message,
      status: 500,
    });
  }
};

exports.getSelectedPropertyDetailed = async (req, res) => {
  try {
    const { propertyId } = req.body;

    if (!propertyId) {
      return res
        .status(400)
        .json({ success: false, message: "Property ID required" });
    }

    // Fetch property
    const property = await Property.findOne({
      where: { id: propertyId },
    });

    if (!property) {
      return res
        .status(404)
        .json({ success: false, message: "Property not found" });
    }

    const plainProperty = property.get({ plain: true });

    // Get common facilities (amenities) via amenityIds inside property.amenities array
    const amenityIds = (plainProperty.amenities || []).map((a) => a.amenityId);
    const amenityRecords = await amenity.findAll({
      where: { id: { [Op.in]: amenityIds } },
      attributes: ["name", "image"],
    });

    const commonFacilities = amenityRecords.map((a) => ({
      name: a.name,
      iconRes: a.image,
    }));

    // Property rules (policies)
    const propertyRules = (plainProperty.policies || []).map((p) => ({
      rulesData: `${p.title}: ${p.description}`,
    }));

    // Fetch all rooms for this property, with room amenities
    const rooms = await Room.findAll({
      where: { propertyId: propertyId },
      include: [{ model: room_amenity, as: "roomAmenities" }],
    });

    const formattedRooms = await Promise.all(
      rooms.map(async (r) => {
        const room = r.get({ plain: true });

        // Fetch room amenity details by roomAmenities
        const amenityIds = (room.room_amenities || []).map(
          (ra) => ra.roomAmenityId
        );
        const roomAmenityRecords = await room_amenity.findAll({
          where: { id: { [Op.in]: amenityIds } },
          attributes: ["name", "image"],
        });

        return {
          ...room,
          roomAmenities: roomAmenityRecords.map((a) => ({
            name: a.name,
            iconRes: a.image,
          })),
        };
      })
    );

    // Fetch reviews
    const reviewRecords = await review.findAll({
      where: { propertyId: propertyId },
    });

    const totalReviewRate = reviewRecords.length
      ? reviewRecords.reduce((sum, r) => sum + parseFloat(r.rating || 0), 0) /
        reviewRecords.length
      : 0;

    const reviews = reviewRecords.map((r) => ({
      userName: r.userName,
      reviewText: r.reviewText,
      rating: parseFloat(r.rating),
    }));

    // Final response
    const firstRoom = formattedRooms[0] || {};

    const response = {
      success: true,
      status: 200,
      hotelName: plainProperty.name,
      rating: plainProperty.star_rating || 0,
      latitude: parseFloat(plainProperty.location?.latitude),
      longitude: parseFloat(plainProperty.location?.longitude),
      price: {
        amount: parseFloat(firstRoom.discounted_price || 0),
        currency: "INR",
        perNight: true,
      },
      description: firstRoom.description || "",
      commonFacilities,
      totalReviewRate: parseFloat(totalReviewRate.toFixed(1)),
      review: reviews,
      propertyRules,
      rooms: formattedRooms,
    };

    return res.json(response);
  } catch (err) {
    console.error("Error in getSelectedPropertyDetailed:", err);
    res.status(500).json({ success: false, message: err.message });
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
    });

    if (!rooms || rooms.length === 0) {
      return res
        .status(200)
        .json({ message: "No rooms found for this property", status: 200 });
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
    const vendorId = req.user.id;

    // Find room by ID
    const room = await Room.findByPk(id);

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    // Fetch all property IDs owned by this vendor
    const vendorProperties = await Property.findAll({
      where: { vendorId },
      attributes: ["id"],
    });

    const vendorPropertyIds = vendorProperties.map((prop) => prop.id);

    // Check if the room.propertyId belongs to this vendor's properties
    if (!vendorPropertyIds.includes(room.propertyId)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to edit this room.",
      });
    }
    if (updates.hasOwnProperty("propertyId")) {
      delete updates.propertyId;
    }
    // Update the room
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
exports.createRoom = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const roomData = req.body;

    // Fetch all property IDs owned by this vendor
    const vendorProperties = await Property.findAll({
      where: { vendorId },
      attributes: ["id"],
    });

    const vendorPropertyIds = vendorProperties.map((prop) => prop.id);

    // Check if the roomData.propertyId is one of the vendor's properties
    if (!vendorPropertyIds.includes(roomData.propertyId)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to add a room to this property.",
      });
    }

    // Create a new room
    const newRoom = await Room.create(roomData);

    res.status(201).json({
      success: true,
      message: "Room created successfully",
      room: newRoom,
    });
  } catch (error) {
    console.error("Error creating room:", error);
    res.status(500).json({ message: "Something went wrong", error });
  }
};
exports.deleteRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const vendorId = req.user.id;

    // Find room by ID
    const room = await Room.findByPk(id);

    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    // Fetch all property IDs owned by this vendor
    const vendorProperties = await Property.findAll({
      where: { vendorId },
      attributes: ["id"],
    });

    const vendorPropertyIds = vendorProperties.map((prop) => prop.id);

    // Check if the room.propertyId belongs to this vendor's properties
    if (!vendorPropertyIds.includes(room.propertyId)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to delete this room.",
      });
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
//   get rooms by vendor
exports.getRoomsByVendor = async (req, res) => {
  try {
    const { vendorId } = req.params;

    // 1️⃣ Find properties for this vendor, include their rooms using alias 'rooms'
    const properties = await Property.findAll({
      where: { vendorId },
      include: [
        {
          model: Room,
          as: "rooms", // this is mandatory because of your association
        },
      ],
      attributes: ["id"], // only need property id
    });

    // 2️⃣ Flatten rooms from each property into a single array
    const rooms = properties.flatMap((property) => property.rooms);

    res.status(200).json({
      success: true,
      rooms,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};
