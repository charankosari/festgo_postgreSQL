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
const {
  normalizePropertyData,
  normalizeRoomData,
} = require("../utils/normalizePropertyData");
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
  const roomConditions = {
    propertyId: property.id,
  };

  const totalPeople =
    (!isNaN(parseInt(adult)) ? parseInt(adult) : 0) +
    (!isNaN(parseInt(child)) ? parseInt(child) : 0);

  const where = {
    propertyId: property.id,
    [Op.and]: [],
  };

  // Total people (compare against sleeping_arrangement->max_occupancy)
  if (totalPeople > 0) {
    where[Op.and].push(
      Sequelize.literal(
        `(sleeping_arrangement->>'max_occupancy')::int >= ${totalPeople}`
      )
    );
  }

  // Adults
  if (adult !== null && adult !== undefined && !isNaN(adult)) {
    where[Op.and].push(
      Sequelize.literal(
        `(sleeping_arrangement->>'max_adults')::int >= ${parseInt(adult)}`
      )
    );
  }

  // Children
  if (child !== null && child !== undefined && !isNaN(child)) {
    where[Op.and].push(
      Sequelize.literal(
        `(sleeping_arrangement->>'max_children')::int >= ${parseInt(child)}`
      )
    );
  }

  // Remove empty [Op.and] if no conditions
  if (where[Op.and].length === 0) delete where[Op.and];

  const roomsInProperty = await Room.findAll({ where });

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
    plain.facilities = plain.amenities;
    // Clean up ownership_details
    delete plain.ownership_details;
    delete plain.bank_details;
    delete plain.tax_details;
    delete plain.strdata;
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
function updateStrdata(existingStrdata, step, newStepData) {
  const updatedStrdata = { ...existingStrdata };
  updatedStrdata[`step_${step}`] = {
    ...(existingStrdata[`step_${step}`] || {}),
    ...newStepData,
  };
  return updatedStrdata;
}

exports.createProperty = async (req, res) => {
  try {
    const { current_step = 1, strdata, ...rest } = req.body;
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

    // 📌 Merge provided strdata (if any) and current_step data
    let newStrdata = strdata && Object.keys(strdata).length ? strdata : {};
    newStrdata = updateStrdata(newStrdata, current_step, rest);

    // 📌 Flatten combined strdata into one object for normalization
    const flattenedData = Object.values(newStrdata).reduce(
      (acc, val) => ({ ...acc, ...val }),
      {}
    );

    // 📌 Now normalize the full flattened data
    const normalizedDetails = normalizePropertyData(flattenedData);

    // 📌 Now create the property record
    const property = await Property.create({
      vendorId,
      current_step,
      status,
      in_progress,
      is_completed,
      strdata: newStrdata,
      ...normalizedDetails,
    });

    res.status(201).json({ success: true, property });
  } catch (err) {
    console.error("Error in createProperty:", err);
    res.status(500).json({ message: err.message });
  }
};
exports.updateProperty = async (req, res) => {
  try {
    const { id } = req.params;
    let updates = { ...req.body };
    const incomingStep = updates.current_step;

    const property = await Property.findByPk(id);
    if (!property)
      return res.status(404).json({ message: "Property not found" });

    let currentStep = property.current_step;
    if (incomingStep !== undefined) {
      currentStep = Math.min(incomingStep, 7);
    } else if (currentStep < 7) {
      currentStep += 1;
    }

    // Load existing strdata
    let newStrdata = property.strdata || {};

    // 1️⃣ Merge incoming updates into existing step's strdata
    newStrdata = updateStrdata(newStrdata, currentStep, updates);

    // 2️⃣ Special case: Step 4 — merge and store rooms
    if (currentStep === 4 && updates.rooms && Array.isArray(updates.rooms)) {
      const existingRooms = newStrdata[`step_4`]?.rooms || [];
      newStrdata[`step_4`].rooms = [...existingRooms, ...updates.rooms];

      await Promise.all(
        updates.rooms.map((room) => {
          const normalizedRoom = normalizeRoomData(room);
          return Room.create({
            ...normalizedRoom,
            propertyId: id,
          });
        })
      );

      delete updates.rooms;
    }

    // 3️⃣ Special case: Step 5 — process mediaItems
    if (
      currentStep === 5 &&
      updates.mediaItems &&
      Array.isArray(updates.mediaItems)
    ) {
      const mediaItems = updates.mediaItems;

      // Update Property.photos with coverPhoto items
      const coverPhotos = mediaItems
        .filter((item) => item.coverPhoto)
        .map((item) => item.imageURL);

      const existingPhotos = property.photos || [];
      const updatedPhotos = [...existingPhotos, ...coverPhotos];

      // Prepare room photo mappings
      const roomPhotosMap = {};

      mediaItems.forEach((item) => {
        if (item.tags && item.tags.length) {
          item.tags.forEach((tag) => {
            if (!roomPhotosMap[tag]) roomPhotosMap[tag] = [];
            roomPhotosMap[tag].push({
              url: item.imageURL,
              tag,
            });
          });
        }
      });

      // Update strdata step_5 with room photos
      if (!newStrdata[`step_5`]) {
        newStrdata[`step_5`] = {};
      }

      // Append roomPhotosMap to step_5
      if (!newStrdata[`step_5`].roomPhotos) {
        newStrdata[`step_5`].roomPhotos = {};
      }

      for (const [roomTag, photos] of Object.entries(roomPhotosMap)) {
        if (!newStrdata[`step_5`].roomPhotos[roomTag]) {
          newStrdata[`step_5`].roomPhotos[roomTag] = [];
        }
        newStrdata[`step_5`].roomPhotos[roomTag].push(...photos);
      }

      delete updates.mediaItems;

      // ✅ Update Property photos field now
      await property.update({
        photos: updatedPhotos,
      });
    }

    delete updates.current_step;

    // 4️⃣ Merge cumulative strdata for normalization
    const cumulativeData = Object.values(newStrdata).reduce(
      (acc, val) => ({ ...acc, ...val }),
      {}
    );

    const mergedDataForNormalization = {
      ...cumulativeData,
      ...updates,
    };

    // 5️⃣ Normalize data
    const normalizedData = normalizePropertyData(mergedDataForNormalization);

    // 6️⃣ Compute progress status
    const status = Math.floor((currentStep / 7) * 100);
    const in_progress = status < 100;
    const is_completed = status === 100;

    // 7️⃣ Update property with normalizedData and newStrdata
    await property.update({
      ...normalizedData,
      current_step: currentStep,
      status,
      in_progress,
      is_completed,
      strdata: newStrdata,
    });

    res.json({ success: true, property });
  } catch (err) {
    console.error("Error in updateProperty:", err);
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

      for (const property of fallbackProperties) {
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

    // Property rules (policies)
    const propertyRules = (plainProperty.policies || []).map((p) => ({
      rulesData: `${p.title}: ${p.description}`,
    }));

    // Fetch all rooms for this property, with room amenities
    const rooms = await Room.findAll({
      where: { propertyId: propertyId },
      include: [{ model: room_amenity, as: "roomAmenities" }],
    });

    const formattedRooms = rooms.map((r) => r.get({ plain: true }));

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
      commonFacilities: plainProperty.amenities,
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

    // Fetch property and verify vendor ownership
    const property = await Property.findByPk(room.propertyId);
    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }

    if (property.vendorId !== vendorId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to edit this room.",
      });
    }

    if (updates.hasOwnProperty("propertyId")) {
      delete updates.propertyId;
    }

    // ✅ Normalize the data to save into Room table
    const normalizedRoomData = normalizeRoomData(updates);

    // ✅ Update the Room record in DB
    await room.update(normalizedRoomData);

    // ✅ Update the raw strdata.step_4 (not normalized)
    const updatedStrdata = updateStrdata(property.strdata, 4, updates);
    await property.update({ strdata: updatedStrdata });

    res.status(200).json({
      success: true,
      message: "Room updated successfully",
      room,
      str: updatedStrdata,
    });
  } catch (error) {
    console.error("Error updating room:", error);
    res.status(500).json({ message: "Something went wrong", error });
  }
};

exports.createRoom = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { propertyId, current_step = 4, ...incomingRoomData } = req.body;

    // 📌 Fetch the property
    const property = await Property.findByPk(propertyId);
    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }

    if (property.vendorId !== vendorId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to add a room to this property.",
      });
    }

    // 📌 Load existing strdata and deep clone it
    let newStrdata = JSON.parse(JSON.stringify(property.strdata || {}));

    // 📌 Ensure step_4 exists
    if (!newStrdata[`step_${current_step}`]) {
      newStrdata[`step_${current_step}`] = {};
    }

    // 📌 Ensure rooms array exists under step_4
    if (!Array.isArray(newStrdata[`step_${current_step}`].rooms)) {
      newStrdata[`step_${current_step}`].rooms = [];
    }

    // 📌 Push the new room data
    newStrdata[`step_${current_step}`].rooms.push(incomingRoomData);

    // 📌 Update property strdata
    await property.update({ strdata: newStrdata });

    // 📌 Normalize room data and save to Room table
    const normalizedRoomData = normalizeRoomData(incomingRoomData);
    const newRoom = await Room.create({
      ...normalizedRoomData,
      propertyId,
    });

    res.status(201).json({
      success: true,
      message: "Room created successfully",
      room: newRoom,
      strdata: newStrdata,
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

// merchants inventory
exports.getPropertyRoomInventories = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res
        .status(400)
        .json({ message: "startDate and endDate are required" });
    }

    // Get properties owned by this vendor
    const properties = await Property.findAll({
      where: { vendorId: req.user.id },
    });

    if (!properties.length) {
      return res
        .status(404)
        .json({ message: "No properties found for vendor" });
    }

    const result = [];

    for (const property of properties) {
      const rooms = await Room.findAll({
        where: { propertyId: property.id },
      });

      const roomsData = [];

      for (const room of rooms) {
        // Default inventory from room.number_of_rooms
        const defaultInventory = room.number_of_rooms;

        // Default rates
        const defaultRates = {
          base: room.price.base_price_for_2_adults,
          extra: room.price.extra_adult_charge,
          child: room.price.child_charge,
        };

        // Initialize inventory & rates for given date range
        const inventory = {};
        const rates = {};

        let currentDate = new Date(startDate);
        const end = new Date(endDate);

        while (currentDate <= end) {
          const dateStr = currentDate.toISOString().split("T")[0];
          inventory[dateStr] = defaultInventory;
          rates[dateStr] = {
            base: defaultRates.base,
            extra: defaultRates.extra,
            child: defaultRates.child,
          };
          currentDate.setDate(currentDate.getDate() + 1);
        }

        // Fetch bookings of this room in date range
        const bookings = await RoomBookedDate.findAll({
          where: {
            roomId: room.id,
            status: { [Op.in]: ["confirmed", "pending"] },
            [Op.or]: [
              {
                checkIn: { [Op.between]: [startDate, endDate] },
              },
              {
                checkOut: { [Op.between]: [startDate, endDate] },
              },
              {
                checkIn: { [Op.lte]: startDate },
                checkOut: { [Op.gte]: endDate },
              },
            ],
          },
        });

        // Adjust inventory based on bookings
        for (const booking of bookings) {
          const checkIn = new Date(booking.checkIn);
          const checkOut = new Date(booking.checkOut);

          let date = new Date(checkIn);
          while (date < checkOut) {
            const dateStr = date.toISOString().split("T")[0];
            if (inventory[dateStr] !== undefined) {
              inventory[dateStr] = Math.max(inventory[dateStr] - 1, 0);
            }
            date.setDate(date.getDate() + 1);
          }
        }

        // Assemble room data
        roomsData.push({
          id: room.id,
          name: room.room_name,
          inventory,
          rates,
          defaultInventory,
          defaultRates,
          beds: room.beds,
        });
      }

      // Assemble property data
      result.push({
        id: property.id,
        name: property.name,
        type: property.property_type,
        rooms: roomsData,
      });
    }

    res.status(200).json(result);
  } catch (error) {
    console.error("Error fetching inventory:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.updateRoomPrices = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { price } = req.body;

    if (!price || typeof price !== "object") {
      return res
        .status(400)
        .json({ message: "Price object is required in request body." });
    }

    // Find room
    const room = await Room.findByPk(roomId);
    if (!room) {
      return res.status(404).json({ message: "Room not found." });
    }

    // Find property
    const property = await Property.findByPk(room.propertyId);
    if (!property) {
      return res
        .status(404)
        .json({ message: "Property for this room not found." });
    }

    // Check vendor ownership
    if (property.vendorId !== req.user.id) {
      return res.status(403).json({
        message: "You are not authorized to update prices for this room.",
      });
    }

    // Merge new price with existing room.price
    const updatedPrice = { ...room.price, ...price };
    room.price = updatedPrice;
    await room.save();

    // Work directly with property.strdata object
    if (
      property.strdata?.step_4?.rooms &&
      Array.isArray(property.strdata.step_4.rooms)
    ) {
      // Find room by name in strdata.step_4.rooms
      const roomInStrdata = property.strdata.step_4.rooms.find(
        (r) => r.roomDetailsFormInfo?.name === room.room_name
      );

      if (roomInStrdata) {
        // Update pricing fields if present
        if (!roomInStrdata.mealPlanDetailsFormInfo) {
          roomInStrdata.mealPlanDetailsFormInfo = {};
        }

        if (price.base_price_for_2_adults !== undefined) {
          roomInStrdata.mealPlanDetailsFormInfo.baseRateFor2Adults =
            price.base_price_for_2_adults;
        }
        if (price.extra_adult_charge !== undefined) {
          roomInStrdata.mealPlanDetailsFormInfo.extraAdultCharge =
            price.extra_adult_charge;
        }
        if (price.child_charge !== undefined) {
          roomInStrdata.mealPlanDetailsFormInfo.paidChildCharge =
            price.child_charge;
        }

        // Save property since strdata is a JSONB field directly
        await property.save();
      }
    }

    res.status(200).json({
      message: "Room price and property strdata updated successfully.",
      roomId: room.id,
      updatedPrice: room.price,
    });
  } catch (error) {
    console.error("Error updating room price and property strdata:", error);
    res.status(500).json({ message: "Internal server error." });
  }
};
