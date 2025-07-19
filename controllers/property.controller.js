const { User } = require("../models/users");
const {
  Property,
  Room,
  amenity,
  amenity_category,
  room_amenity,
  room_amenity_category,
  RoomBookedDate,
  RoomRateInventory,
} = require("../models/services/index");
const { review } = require("../models/users/index");
const {
  normalizePropertyData,
  normalizeRoomData,
  normalizePropertyRules,
  normalizeAmenitiesdata,
} = require("../utils/normalizePropertyData");
const { Op, Sequelize } = require("sequelize");
// total steps in your property creation process
const TOTAL_STEPS = 7;
const moment = require("moment");
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
  const totalPeople = (parseInt(adult) || 0) + (parseInt(child) || 0);

  const where = {
    propertyId: property.id,
    [Op.and]: [],
  };

  if (totalPeople > 0) {
    where[Op.and].push(
      Sequelize.literal(
        `(sleeping_arrangement->>'max_occupancy')::int >= ${totalPeople}`
      )
    );
  }
  if (adult) {
    where[Op.and].push(
      Sequelize.literal(
        `(sleeping_arrangement->>'max_adults')::int >= ${parseInt(adult)}`
      )
    );
  }
  if (child) {
    where[Op.and].push(
      Sequelize.literal(
        `(sleeping_arrangement->>'max_children')::int >= ${parseInt(child)}`
      )
    );
  }

  if (!where[Op.and].length) delete where[Op.and];

  const roomsInProperty = await Room.findAll({ where });

  if (!roomsInProperty.length) return null;

  const roomIds = roomsInProperty.map((room) => room.id);

  // Fetch booked counts
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

  // Fetch room rates for the given date in one query
  const roomRates = await RoomRateInventory.findAll({
    where: {
      propertyId: property.id,
      roomId: { [Op.in]: roomIds },
      date: startDate,
    },
  });

  const roomRateMap = {};
  roomRates.forEach((rate) => {
    roomRateMap[rate.roomId] = rate.inventory;
  });

  // Calculate availability
  const availableRooms = roomsInProperty.filter((room) => {
    const alreadyBooked = bookedRoomCounts[room.id] || 0;
    const totalAvailable =
      roomRateMap[room.id] !== undefined
        ? roomRateMap[room.id]
        : room.number_of_rooms;

    const remainingAvailable = totalAvailable - alreadyBooked;

    return remainingAvailable >= (isNaN(requestedRooms) ? 1 : requestedRooms);
  });

  if (!availableRooms.length) return null;

  const plainProperty = property.get({ plain: true });
  delete plainProperty.ownership_details;

  return plainProperty;
};

const enrichProperties = async (properties, startDate, rooms, adult, child) => {
  const enriched = [];

  for (const p of properties) {
    const plain = p.get ? p.get({ plain: true }) : p;
    // plain.facilities = plain.amenities;
    // Clean up ownership_details
    delete plain.ownership_details;
    delete plain.bank_details;
    delete plain.tax_details;
    delete plain.strdata;
    // Format final response
    const formattedProperty = await formatPropertyResponse(
      plain,
      startDate,
      rooms,
      adult,
      child
    );
    if (formattedProperty) enriched.push(formattedProperty);
  }

  return enriched;
};

const formatPropertyResponse = async (
  property,
  startDate,
  rooms = 1,
  adults = 2,
  children = 0
) => {
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
    review_count,
  } = property;

  const imageList = Array.isArray(photos)
    ? photos.map((p) => p.imageURL || "")
    : [];

  const roomsList = await Room.findAll({
    where: { propertyId: id },
  });

  if (!roomsList || roomsList.length === 0) {
    console.log("No rooms found for property:", id);
    return null;
  }

  const totalGuests = parseInt(adults) + parseInt(children);
  const avgGuestsPerRoom = Math.ceil(totalGuests / rooms);
  console.log(
    `Input ➤ Rooms: ${rooms}, Adults: ${adults}, Children: ${children}`
  );
  console.log(
    "Calculated ➤ Total guests:",
    totalGuests,
    "Avg guests per room:",
    avgGuestsPerRoom
  );

  // Show all room capacities
  console.log("All rooms:");
  roomsList.forEach((r, i) => {
    console.log(`Room ${i + 1}:`, {
      id: r.id,
      max_adults: r.max_adults,
      max_children: r.max_children,
      price: r.price?.base_price_for_2_adults,
    });
  });

  // Filter valid rooms
  const validRooms = roomsList.filter((room) => {
    const maxAdults = parseInt(room.max_adults || 0);
    const maxChildren = parseInt(room.max_children || 0);
    const totalCapacity = maxAdults + maxChildren;
    return totalCapacity >= avgGuestsPerRoom;
  });

  console.log("Filtered valid rooms based on avg guest capacity:");
  validRooms.forEach((r, i) => {
    console.log(`Valid Room ${i + 1}:`, {
      id: r.id,
      max_adults: r.max_adults,
      max_children: r.max_children,
      price: r.price?.base_price_for_2_adults,
    });
  });

  if (validRooms.length === 0) {
    console.log("❌ No valid rooms for the given guest count.");
    return null;
  }

  // Select cheapest valid room
  let selectedRoom = null;
  let selectedPrice = Infinity;
  let selectedOriginal = 0;

  for (const room of validRooms) {
    let basePrice = parseInt(room.price?.base_price_for_2_adults || 0);
    let originalPrice = Math.round(basePrice * 1.05);

    if (startDate) {
      const rate = await RoomRateInventory.findOne({
        where: { propertyId: id, roomId: room.id, date: startDate },
      });
      if (rate) {
        basePrice = parseInt(rate.price.offerBaseRate);
        originalPrice = parseInt(rate.price.base);
      }
    }

    if (basePrice < selectedPrice) {
      selectedRoom = room;
      selectedPrice = basePrice;
      selectedOriginal = originalPrice;
    }
  }

  if (!selectedRoom) {
    console.log("❌ No room selected despite valid room list.");
    return null;
  }

  console.log("✅ Selected Room:", {
    id: selectedRoom.id,
    base_price: selectedPrice,
    original_price: selectedOriginal,
    base_adults: selectedRoom.price?.base_adults,
    extra_adult_charge: selectedRoom.price?.extra_adult_charge,
    child_charge: selectedRoom.price?.child_charge,
  });

  // Price calculation
  const baseAdults = parseInt(selectedRoom.price?.base_adults || 2);
  const extraAdultChargePer = parseInt(
    selectedRoom.price?.extra_adult_charge || 0
  );
  const childChargePer = parseInt(selectedRoom.price?.child_charge || 0);

  const includedAdults = baseAdults * rooms;
  const extraAdults = Math.max(0, adults - includedAdults);
  const extraAdultCharge = extraAdults * extraAdultChargePer;

  const extraChildCharge = children * childChargePer;

  const pricePerNight =
    selectedPrice * rooms + extraAdultCharge + extraChildCharge;
  const originalPrice = selectedOriginal * rooms;

  console.log("💰 Final Price Breakdown:");
  console.log(
    "Base price × rooms:",
    selectedPrice,
    "×",
    rooms,
    "=",
    selectedPrice * rooms
  );
  console.log("Extra adults:", extraAdults, "Charge:", extraAdultCharge);
  console.log("Extra children:", children, "Charge:", extraChildCharge);
  console.log(
    "➤ Final pricePerNight:",
    pricePerNight,
    "Original:",
    originalPrice
  );

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
    additionalInfo: selectedRoom.additional_info || "",
    freeBreakfast: selectedRoom.free_breakfast,
    freeCancellation: selectedRoom.free_cancellation,
    review_count,
    location,
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
      const existingCuisines = Array.isArray(property.cuisines)
        ? property.cuisines
        : [];
      const newCuisines = [];

      updates.rooms.forEach((room) => {
        const cuisines = room?.mealPlanDetailsFormInfo?.cuisines || [];
        newCuisines.push(...cuisines);
      });

      // ✅ Merge and deduplicate cuisines
      const mergedCuisines = Array.from(
        new Set([...existingCuisines, ...newCuisines])
      );

      // ✅ Update property cuisines now
      await property.update({ cuisines: mergedCuisines });
      delete updates.rooms;
    }

    // 🔄 --- REVISED CODE BLOCK FOR STEP 5 STARTS HERE --- 🔄
    if (currentStep === 5) {
      newStrdata.step_5 = {
        ...(newStrdata.step_5 || {}),
        ...updates,
      };

      const imageItems = [];
      const videoItems = [];
      const mediaKeys = [];

      for (const key in updates) {
        const item = updates[key];
        if (!isNaN(parseInt(key)) && typeof item === "object") {
          if (item?.type === "image" && item?.imageURL) {
            imageItems.push(item);
            mediaKeys.push(key);
          } else if (item?.type === "video" && item?.imageURL) {
            videoItems.push(item);
            mediaKeys.push(key);
          }
        }
      }

      const rooms = await Room.findAll({ where: { propertyId: id } });
      const roomMap = new Map(rooms.map((room) => [room.id, room]));
      const roomsToUpdate = new Set();

      let newCoverPhoto = null;
      const newGeneralPhotos = [];

      imageItems.forEach((item) => {
        if (item.coverPhoto) {
          newCoverPhoto = item;
          return;
        }

        let assigned = false;
        if (Array.isArray(item.tags)) {
          item.tags.forEach((tag) => {
            const room = roomMap.get(tag.id);
            if (room) {
              const updated = [...(room.photos || []), item];
              room.set("photos", updated);
              roomsToUpdate.add(room);
              assigned = true;
            }
          });
        }

        if (!assigned) newGeneralPhotos.push(item);
      });

      let newCoverVideo = null;
      const newGeneralVideos = [];

      videoItems.forEach((item) => {
        if (item.coverPhoto) {
          newCoverVideo = item;
          return;
        }

        let assigned = false;
        if (Array.isArray(item.tags)) {
          item.tags.forEach((tag) => {
            const room = roomMap.get(tag.id);
            if (room) {
              const updated = [...(room.videos || []), item];
              room.set("videos", updated);
              roomsToUpdate.add(room);
              assigned = true;
            }
          });
        }

        if (!assigned) newGeneralVideos.push(item);
      });

      if (roomsToUpdate.size > 0) {
        try {
          await Promise.all(
            Array.from(roomsToUpdate).map((room) => room.save())
          );
        } catch (error) {
          console.error("❌ ERROR saving room media:", error);
        }
      }

      try {
        const propertyInstance = await Property.findByPk(id);

        // ---- PHOTOS ----
        const existingPhotos = Array.isArray(propertyInstance.photos)
          ? propertyInstance.photos
          : [];

        console.log("📸 Existing photos count:", existingPhotos.length);

        const existingPhotoMap = new Map(
          existingPhotos.map((p) => [p.imageURL, p])
        );

        const incomingPhotos = [
          ...(newCoverPhoto ? [newCoverPhoto] : []),
          ...newGeneralPhotos,
        ];

        console.log("📥 Incoming photos count:", incomingPhotos.length);

        let hasNewPhotos =
          existingPhotos.length === 0 && incomingPhotos.length > 0;

        incomingPhotos.forEach((photo) => {
          if (!existingPhotoMap.has(photo.imageURL)) {
            console.log("➕ New unique photo found:", photo.imageURL);
            existingPhotoMap.set(photo.imageURL, photo);
            hasNewPhotos = true;
          } else {
            console.log("✅ Duplicate photo skipped:", photo.imageURL);
          }
        });

        if (hasNewPhotos) {
          console.log("✅ Updating property photos with new items...");
          propertyInstance.set("photos", Array.from(existingPhotoMap.values()));
        } else {
          console.log("ℹ️ No new photos to update.");
        }

        // ---- VIDEOS ----
        const existingVideos = Array.isArray(propertyInstance.videos)
          ? propertyInstance.videos
          : [];

        console.log("🎥 Existing videos count:", existingVideos.length);

        const existingVideoMap = new Map(
          existingVideos.map((v) => [v.imageURL, v])
        );

        const incomingVideos = [
          ...(newCoverVideo ? [newCoverVideo] : []),
          ...newGeneralVideos,
        ];

        console.log("📥 Incoming videos count:", incomingVideos.length);

        let hasNewVideos =
          existingVideos.length === 0 && incomingVideos.length > 0;

        incomingVideos.forEach((video) => {
          if (!existingVideoMap.has(video.imageURL)) {
            console.log("➕ New unique video found:", video.imageURL);
            existingVideoMap.set(video.imageURL, video);
            hasNewVideos = true;
          } else {
            console.log("✅ Duplicate video skipped:", video.imageURL);
          }
        });

        if (hasNewVideos) {
          console.log("✅ Updating property videos with new items...");
          propertyInstance.set("videos", Array.from(existingVideoMap.values()));
        } else {
          console.log("ℹ️ No new videos to update.");
        }

        if (hasNewPhotos || hasNewVideos) {
          console.log("💾 Saving updated property media...");
          await propertyInstance.save();
          console.log("✅ Property media saved successfully.");
        } else {
          console.log("🛑 Nothing to save — media unchanged.");
        }
      } catch (error) {
        console.error("❌ ERROR updating property media:", error);
      }

      mediaKeys.forEach((key) => delete updates[key]);
    }

    // 🔄 --- REVISED CODE BLOCK FOR STEP 5 ENDS HERE --- 🔄

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

    // 🧹 Clean and normalize incoming params
    const clean = (val) => (val === "" ? null : val);

    const lat = clean(latitude);
    const long = clean(longitude);
    const startDate = clean(todate)
      ? moment(todate, "DD-MM-YYYY").format("YYYY-MM-DD")
      : null;
    const finalDate = clean(enddate)
      ? moment(enddate, "DD-MM-YYYY").format("YYYY-MM-DD")
      : null;
    const requestedRooms = parseInt(clean(rooms)) || null;
    const adults = parseInt(clean(adult)) || 0;
    const children = parseInt(clean(child)) || 0;
    const city = clean(location);
    const propType = clean(property_type);

    const propertyTypeFilter = propType
      ? Sequelize.where(
          Sequelize.fn("lower", Sequelize.col("property_type")),
          propType.toLowerCase()
        )
      : null;

    let availableProperties = [];

    // 🟢 If only lat/long given and no dates — just return active properties within 10km
    if (lat && long && !startDate && !finalDate) {
      const whereNearby = {
        active: true,
        [Op.and]: [
          propertyTypeFilter,
          Sequelize.literal(`
      earth_distance(
        ll_to_earth(${lat}, ${long}),
        ll_to_earth(
          (location->>'lat')::float, 
          (location->>'lng')::float
        )
      ) <= 10000
    `),
        ].filter(Boolean),
      };

      const nearbyProperties = await Property.findAll({ where: whereNearby });

      const finalProperties = await enrichProperties(nearbyProperties, null);

      return res.json({
        success: true,
        status: 200,
        properties: finalProperties,
      });
    }

    // ✅ Regular flow if dates provided — Nearby properties within 10km
    if (lat && long) {
      const whereNearby = {
        active: true,
        [Op.and]: [
          propertyTypeFilter,
          Sequelize.literal(`
      earth_distance(
        ll_to_earth(${lat}, ${long}),
        ll_to_earth(
          (location->>'lat')::float, 
          (location->>'lng')::float
        )
      ) <= 10000
    `),
        ].filter(Boolean),
      };

      const nearbyProperties = await Property.findAll({ where: whereNearby });

      for (const property of nearbyProperties) {
        const available = await checkAvailableRooms(
          property,
          adults,
          children,
          requestedRooms,
          startDate,
          finalDate
        );
        if (available) availableProperties.push(available);
      }
    }

    // ✅ Step 2: Search by city if properties < 20 and city provided
    if (availableProperties.length < 20 && city) {
      const whereCity = {
        active: true,
        [Op.and]: [
          propertyTypeFilter,
          Sequelize.literal(`(
      lower(location->>'city') = lower('${city}')
      OR lower(location->>'locality') = lower('${city}')
      OR lower(location->>'searchLocation') = lower('${city}')
    )`),
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
          adults,
          children,
          requestedRooms,
          startDate,
          finalDate
        );
        if (available) availableProperties.push(available);
        if (availableProperties.length === 20) break;
      }
    }

    // ✅ Step 3: Fallback active properties (same property_type if given)
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
          adults,
          children,
          requestedRooms,
          startDate,
          finalDate
        );
        if (available) availableProperties.push(available);
        if (availableProperties.length === 20) break;
      }
    }

    // ✅ Final enrichment and response
    const finalProperties = await enrichProperties(
      availableProperties,
      startDate,
      rooms,
      adult,
      child
    );

    return res.json({
      success: true,
      status: 200,
      properties: finalProperties,
    });
  } catch (err) {
    console.error("Error fetching properties:", err);
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
    const property = await Property.findOne({ where: { id: propertyId } });

    if (!property) {
      return res
        .status(404)
        .json({ success: false, message: "Property not found" });
    }

    const plainProperty = property.get({ plain: true });

    // Normalize property rules and amenities
    const propertyRules = normalizePropertyRules(plainProperty.policies || []);
    const commonFacilities = normalizeAmenitiesdata(
      plainProperty.amenities || []
    ).amenities;
    const propertyImages = Array.isArray(plainProperty.photos)
      ? plainProperty.photos.map((p) => p.imageURL || "")
      : [];

    const propertyVideos = Array.isArray(plainProperty.videos)
      ? plainProperty.videos.map((v) => v.videoURL || "")
      : [];
    // Fetch rooms
    const rooms = await Room.findAll({
      where: { propertyId },
      include: [{ model: room_amenity, as: "roomAmenities" }],
    });

    const formattedRooms = rooms.map((r) => {
      const room = r.get({ plain: true });
      const imageList = Array.isArray(room.photos)
        ? room.photos.map((p) => p.imageURL || "")
        : [];
      const videoList = Array.isArray(room.videos)
        ? room.videos.map((v) => v.videoURL || "")
        : [];
      return {
        ...room,
        photos: imageList,
        videos: videoList,
      };
    });

    // Reviews
    const reviewRecords = await review.findAll({
      where: { propertyId },
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

    // Prepare final response

    const response = {
      success: true,
      status: 200,
      hotelName: plainProperty.name,
      description: plainProperty.description,
      cuisines: Array.isArray(plainProperty.cuisines)
        ? plainProperty.cuisines.map((cuisine) => ({ food: cuisine }))
        : [],

      rating: plainProperty.star_rating || 0,
      latitude: parseFloat(plainProperty.location?.lat),
      longitude: parseFloat(plainProperty.location?.lng),

      amenities: commonFacilities,
      totalReviewRate: parseFloat(totalReviewRate.toFixed(1)),
      review: reviews,
      propertyRules,
      // rooms: formattedRooms,
      photos: propertyImages,
      videos: propertyVideos,
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
    // await property.update({ strdata: newStrdata });

    // 📌 Normalize room data and save to Room table
    const normalizedRoomData = normalizeRoomData(incomingRoomData);
    const newRoom = await Room.create({
      ...normalizedRoomData,
      propertyId,
    });
    const incomingCuisines =
      incomingRoomData?.mealPlanDetailsFormInfo?.cuisines || [];
    const existingCuisines = Array.isArray(property.cuisines)
      ? property.cuisines
      : [];
    const mergedCuisines = Array.from(
      new Set([...existingCuisines, ...incomingCuisines])
    );

    // 📌 Update property with new cuisines and strdata
    await property.update({
      cuisines: mergedCuisines,
      strdata: newStrdata,
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
