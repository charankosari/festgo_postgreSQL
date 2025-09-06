const {
  Property,
  Room,
  amenity,
  amenity_category,
  room_amenity,
  room_amenity_category,
  RoomBookedDate,
  RoomRateInventory,
  FestgoCoinSetting,
  FestgoCoinUsageLimit,
  property_booking,
  sequelize,
} = require("../models/services/index");
const {
  review,
  User,
  FestGoCoinHistory,
  FestgoCoinTransaction,
} = require("../models/users/index");
const {
  normalizePropertyData,
  normalizeRoomData,
  normalizePropertyRules,
  normalizeAmenitiesdata,
  normalizeRoomAmenities,
} = require("../utils/normalizePropertyData");
const { Op, Sequelize, fn, json, literal } = require("sequelize");
const { calculateFestgoCoins } = require("../utils/issueCoins");
// total steps in your property creation process
const TOTAL_STEPS = 7;
const moment = require("moment");
// helper function to calculate status
const calculateStatus = (currentStep) => {
  return Math.floor((currentStep / TOTAL_STEPS) * 100);
};
// helper for checking available rooms
const checkAvailableRoomsForFilter = async (
  property,
  adult,
  child,
  requestedRooms,
  startDate,
  finalDate,
  roomAmenities,
  roomView
) => {
  const totalAdults = parseInt(adult) || 0;
  const totalChildren = parseInt(child) || 0;
  const numRooms = parseInt(requestedRooms) || 1;
  const totalPeople = totalAdults + totalChildren;

  // If no guests or dates, we can't determine availability.
  if (totalPeople === 0 || !startDate || !finalDate) {
    return property.get({ plain: true }); // Return property to be handled by pricing logic
  }

  const avgGuestsPerRoom = Math.ceil(totalPeople / numRooms);
  const avgAdultsPerRoom = Math.ceil(totalAdults / numRooms);

  // 1. Find rooms that match capacity and other criteria
  const where = {
    propertyId: property.id,
    [Op.and]: [
      // Capacity checks
      Sequelize.literal(
        `(sleeping_arrangement->>'max_occupancy')::int >= ${avgGuestsPerRoom}`
      ),
      Sequelize.literal(
        `(sleeping_arrangement->>'max_adults')::int >= ${avgAdultsPerRoom}`
      ),

      // Room View check (finds rooms with ANY of the selected views)
      ...(roomView?.length
        ? [{ view: { [Op.in]: roomView.map((v) => v.toLowerCase()) } }]
        : []),

      // Room Amenities checks (finds rooms with ALL of the selected amenities)
      ...(roomAmenities?.length
        ? roomAmenities.map((amenityName) =>
            Sequelize.literal(`
              EXISTS (
                SELECT 1 FROM jsonb_array_elements("Room"."room_amenities") AS elem
                WHERE lower(elem->>'otaName') = lower('${amenityName}')
              )
            `)
          )
        : []),
    ].filter(Boolean), // This safely removes any null/empty filters
  };
  const candidateRooms = await Room.findAll({ where });

  if (!candidateRooms.length) {
    return null;
  }

  const roomIds = candidateRooms.map((room) => room.id);

  // 2. Find all confirmed/pending bookings that overlap with the requested dates
  const bookedRooms = await RoomBookedDate.findAll({
    where: {
      roomId: { [Op.in]: roomIds },
      checkIn: { [Op.lt]: finalDate }, // Booking starts before the user's checkout
      checkOut: { [Op.gt]: startDate }, // Booking ends after the user's check-in
      status: { [Op.in]: ["pending", "confirmed"] },
    },
  });

  const bookedRoomCounts = {};
  bookedRooms.forEach((booking) => {
    bookedRoomCounts[booking.roomId] =
      (bookedRoomCounts[booking.roomId] || 0) + 1;
  });

  // 3. Get specific inventory counts for the check-in date
  const roomRates = await RoomRateInventory.findAll({
    where: {
      propertyId: property.id,
      roomId: { [Op.in]: roomIds },
      date: startDate,
    },
  });

  const roomRateMap = {};
  roomRates.forEach((rate) => (roomRateMap[rate.roomId] = rate.inventory));

  let hasSufficientInventory = false;
  for (const room of candidateRooms) {
    const alreadyBooked = bookedRoomCounts[room.id] || 0;

    // Use specific daily inventory if available, otherwise fall back to the room's total inventory
    const totalInventory =
      roomRateMap[room.id] !== undefined
        ? roomRateMap[room.id]
        : room.number_of_rooms;

    const remainingAvailable = totalInventory - alreadyBooked;

    if (remainingAvailable >= numRooms) {
      hasSufficientInventory = true;
      break; // Found a valid option, no need to check further rooms in this property
    }
  }

  if (!hasSufficientInventory) {
    return null;
  }

  // Return a plain object to prevent issues with Sequelize instances
  const plainProperty = property.get({ plain: true });
  delete plainProperty.ownership_details; // Clean up sensitive data
  return plainProperty;
};
const checkAvailableRooms = async (
  property,
  adult,
  child,
  requestedRooms,
  startDate,
  finalDate
) => {
  const totalAdults = parseInt(adult) || 0;
  const totalChildren = parseInt(child) || 0;
  const numRooms = parseInt(requestedRooms) || 1;
  const totalPeople = totalAdults + totalChildren;

  // If no guests, we can't determine suitability. This can be adjusted if needed.
  if (totalPeople === 0) return null;

  // ✅ Calculate average guests per room to find suitable room types
  const avgGuestsPerRoom = Math.ceil(totalPeople / numRooms);
  const avgAdultsPerRoom = Math.ceil(totalAdults / numRooms);

  const where = {
    propertyId: property.id,
    [Op.and]: [
      // Find rooms that can hold the average number of guests
      Sequelize.literal(
        `(sleeping_arrangement->>'max_occupancy')::int >= ${avgGuestsPerRoom}`
      ),
      // And the average number of adults
      Sequelize.literal(
        `(sleeping_arrangement->>'max_adults')::int >= ${avgAdultsPerRoom}`
      ),
    ],
  };

  const candidateRooms = await Room.findAll({ where });
  if (!candidateRooms.length) return null;

  const roomIds = candidateRooms.map((room) => room.id);

  // Fetch all bookings that overlap with the requested dates
  const bookedRooms = await RoomBookedDate.findAll({
    where: {
      roomId: { [Op.in]: roomIds },
      checkIn: { [Op.lt]: finalDate },
      checkOut: { [Op.gt]: startDate },
      status: { [Op.in]: ["pending", "confirmed"] },
    },
  });

  const bookedRoomCounts = {};
  bookedRooms.forEach((booking) => {
    bookedRoomCounts[booking.roomId] =
      (bookedRoomCounts[booking.roomId] || 0) + 1;
  });

  // Fetch room rates/inventory for the specific check-in date
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

  // ✅ Check if ANY suitable room type has enough inventory for the request
  let hasSufficientInventory = false;
  for (const room of candidateRooms) {
    const alreadyBooked = bookedRoomCounts[room.id] || 0;
    const totalInventory =
      roomRateMap[room.id] !== undefined
        ? roomRateMap[room.id]
        : room.number_of_rooms; // Fallback to base inventory

    const remainingAvailable = totalInventory - alreadyBooked;

    if (remainingAvailable >= numRooms) {
      hasSufficientInventory = true;
      break; // Found a valid option, no need to check further
    }
  }

  if (!hasSufficientInventory) return null;

  // If checks pass, return the property to be enriched later
  const plainProperty = property.get({ plain: true });
  delete plainProperty.ownership_details;
  return plainProperty;
};
const enrichProperties = async (
  properties,
  startDate,
  requestedRooms,
  adults,
  children
) => {
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
      requestedRooms,
      adults,
      children
    );
    if (formattedProperty) enriched.push(formattedProperty);
  }

  return enriched;
};
const formatPropertyResponse = async (
  property,
  startDate,
  requestedRooms,
  adults,
  children
) => {
  // Immediately parse inputs to guarantee they are numbers for all calculations
  const numRooms = parseInt(requestedRooms) || 1;
  const numAdults = parseInt(adults) || 0;
  const numChildren = parseInt(children) || 0;
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

  const allRoomsInProperty = await Room.findAll({ where: { propertyId: id } });
  if (!allRoomsInProperty || allRoomsInProperty.length === 0) {
    return null;
  }

  // Filter for rooms that can accommodate the request
  const totalGuests = numAdults + numChildren;
  const avgGuestsPerRoom = Math.ceil(totalGuests / numRooms);
  const avgAdultsPerRoom = Math.ceil(numAdults / numRooms);

  const validRooms = allRoomsInProperty.filter((room) => {
    const maxAdults = parseInt(room.sleeping_arrangement?.max_adults || 0);
    const maxOccupancy = parseInt(
      room.sleeping_arrangement?.max_occupancy || 0
    );
    return maxOccupancy >= avgGuestsPerRoom && maxAdults >= avgAdultsPerRoom;
  });

  if (validRooms.length === 0) {
    return null;
  }

  let bestFinalPrice = Infinity;
  let bestOriginalPrice = 0;
  let bestRoom = null;

  for (const room of validRooms) {
    // Step 1: Get the base price for THIS specific room
    let currentBasePrice = parseInt(room.price?.base_price_for_2_adults || 0);
    let currentOriginalPrice = Math.round(currentBasePrice * 1.05);

    if (startDate) {
      const rate = await RoomRateInventory.findOne({
        where: { propertyId: id, roomId: room.id, date: startDate },
      });
      if (rate?.price) {
        currentBasePrice = parseInt(rate.price.offerBaseRate);
        currentOriginalPrice = parseInt(rate.price.base);
      }
    }

    const baseAdultsPerRoom = parseInt(room.price?.base_adults || 2);
    const extraAdultChargePerRoom = parseInt(
      room.price?.extra_adult_charge || 0
    );
    const childChargePerChild = parseInt(room.price?.child_charge || 0);

    // Step 2: Calculate the FULL price for THIS room
    const totalBaseForRooms = currentBasePrice * numRooms;
    const totalIncludedAdults = baseAdultsPerRoom * numRooms;
    const extraAdultsCount = Math.max(0, numAdults - totalIncludedAdults);

    const totalExtraAdultCharge = extraAdultsCount * extraAdultChargePerRoom;
    const totalChildCharge = numChildren * childChargePerChild;

    const finalPriceForThisRoom =
      totalBaseForRooms + totalExtraAdultCharge + totalChildCharge;

    // Step 3: If this room offers a better final price, it becomes the new best option
    if (finalPriceForThisRoom < bestFinalPrice) {
      bestFinalPrice = finalPriceForThisRoom;
      bestOriginalPrice =
        currentOriginalPrice * numRooms +
        totalExtraAdultCharge +
        totalChildCharge;
      bestRoom = room;
    }
  }

  const imageList = Array.isArray(photos)
    ? photos.map((p) => p.imageURL || "")
    : [];

  return {
    id,
    vendorId,
    name,
    property_type,
    email,
    description,
    star_rating,
    pricePerNight: bestFinalPrice,
    originalPrice: bestOriginalPrice,
    additionalInfo: bestRoom.additional_info || "",
    freeBreakfast: bestRoom.free_breakfast,
    freeCancellation: bestRoom.free_cancellation,
    review_count,
    location,
    imageList,
  };
};
const enrichPropertiesFilter = async (
  properties,
  startDate,
  requestedRooms,
  adults,
  children,
  minPrice,
  maxPrice
) => {
  const enriched = [];
  for (const p of properties) {
    const plain = p.get ? p.get({ plain: true }) : p;
    delete plain.ownership_details;
    delete plain.bank_details;
    delete plain.tax_details;
    delete plain.strdata;
    const formattedProperty = await formatPropertyResponseForFilter(
      plain,
      startDate,
      requestedRooms,
      adults,
      children,
      minPrice,
      maxPrice
    );
    if (formattedProperty) {
      enriched.push(formattedProperty);
    } else {
      console.log(
        `[DEBUG] Property ID ${plain.id} was discarded during formatting (no suitable rooms or price match).`
      );
    }
  }

  return enriched;
};
const formatPropertyResponseForFilter = async (
  property,
  startDate,
  requestedRooms,
  adults,
  children,
  minPrice,
  maxPrice
) => {
  const numRooms = parseInt(requestedRooms) || 1;
  const numAdults = parseInt(adults) || 0;
  const numChildren = parseInt(children) || 0;
  const { id } = property; // Destructuring other properties as needed

  const allRoomsInProperty = await Room.findAll({ where: { propertyId: id } });
  if (!allRoomsInProperty || allRoomsInProperty.length === 0) {
    return null;
  }

  const totalGuests = numAdults + numChildren;
  const avgGuestsPerRoom = Math.ceil(totalGuests / numRooms);
  const avgAdultsPerRoom = Math.ceil(numAdults / numRooms);
  const validRooms = allRoomsInProperty.filter((room) => {
    const maxAdults = parseInt(room.sleeping_arrangement?.max_adults || 0);
    const maxOccupancy = parseInt(
      room.sleeping_arrangement?.max_occupancy || 0
    );
    return maxOccupancy >= avgGuestsPerRoom && maxAdults >= avgAdultsPerRoom;
  });

  if (validRooms.length === 0) {
    return null;
  }
  let bestPriceInRange = Infinity;
  let matchingRoom = null;
  let matchingOriginalPrice = 0;

  for (const room of validRooms) {
    let currentBasePrice = parseInt(room.price?.base_price_for_2_adults || 0);
    let currentOriginalPrice = Math.round(currentBasePrice * 1.05);

    if (startDate) {
      const rate = await RoomRateInventory.findOne({
        where: { propertyId: id, roomId: room.id, date: startDate },
      });
      if (rate?.price) {
        currentBasePrice = parseInt(rate.price.offerBaseRate);
        currentOriginalPrice = parseInt(rate.price.base);
      }
    }

    // ✅ FIXED: The full price calculation logic is now here, BEFORE it is used.
    const baseAdultsPerRoom = parseInt(room.price?.base_adults || 2);
    const extraAdultChargePerRoom = parseInt(
      room.price?.extra_adult_charge || 0
    );
    const childChargePerChild = parseInt(room.price?.child_charge || 0);

    const totalBaseForRooms = currentBasePrice * numRooms;
    const totalIncludedAdults = baseAdultsPerRoom * numRooms;
    const extraAdultsCount = Math.max(0, numAdults - totalIncludedAdults);
    const totalExtraAdultCharge = extraAdultsCount * extraAdultChargePerRoom;
    const totalChildCharge = numChildren * childChargePerChild;

    const finalPriceForThisRoom =
      totalBaseForRooms + totalExtraAdultCharge + totalChildCharge;

    if (minPrice && maxPrice) {
      if (
        finalPriceForThisRoom >= minPrice &&
        finalPriceForThisRoom <= maxPrice
      ) {
        if (finalPriceForThisRoom < bestPriceInRange) {
          bestPriceInRange = finalPriceForThisRoom;
          matchingRoom = room;
          matchingOriginalPrice =
            currentOriginalPrice * numRooms +
            totalExtraAdultCharge +
            totalChildCharge;
        }
      }
    } else {
      if (finalPriceForThisRoom < bestPriceInRange) {
        bestPriceInRange = finalPriceForThisRoom;
        matchingRoom = room;
        matchingOriginalPrice =
          currentOriginalPrice * numRooms +
          totalExtraAdultCharge +
          totalChildCharge;
      }
    }
  }

  if (!matchingRoom) {
    return null;
  }

  // Destructure all needed properties from the original property object for the return
  const {
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

  return {
    id,
    vendorId,
    name,
    property_type,
    email,
    description,
    star_rating,
    location,
    review_count,
    imageList,
    pricePerNight: bestPriceInRange,
    originalPrice: matchingOriginalPrice,
    additionalInfo: matchingRoom.additional_info || "",
    freeBreakfast: matchingRoom.free_breakfast,
    freeCancellation: matchingRoom.free_cancellation,
  };
};
const simulateUsableFestgoCoins = async ({ userId, total_room_price }) => {
  const now = new Date();
  const firstDayOfMonth = moment().startOf("month").toDate();
  const lastDayOfMonth = moment().endOf("month").toDate();

  const [coinLimit, setting, totalUsedAcrossAll, transactions] =
    await Promise.all([
      FestgoCoinUsageLimit.findOne(),
      FestgoCoinSetting.findOne({ where: { type: "property" } }),
      FestGoCoinHistory.sum("coins", {
        where: {
          userId,
          type: "used",
          status: { [Op.in]: ["issued", "pending"] },
          reason: {
            [Op.in]: [
              "property_booking",
              "beachfest_booking",
              "cityfest_booking",
            ],
          },
          createdAt: { [Op.between]: [firstDayOfMonth, lastDayOfMonth] },
        },
      }),
      FestgoCoinTransaction.findAll({
        where: {
          userId,
          [Op.or]: [{ remaining: { [Op.gt]: 0 } }, { amount: { [Op.gt]: 0 } }],
          expiresAt: { [Op.or]: { [Op.gt]: now }, [Op.is]: null },
        },
        order: [["expiresAt", "ASC"]],
      }),
    ]);

  if (!coinLimit || !setting) {
    return { usable_coins: 0, coin_discount: 0 };
  }

  const allOtherMonthlyLimit = Number(coinLimit.allother);
  const singleTransactionLimit = Number(setting.single_transaction_limit_value);
  const propertyMonthlyLimit = Number(setting.monthly_limit_value);
  const totalAvailable = transactions.reduce(
    (sum, txn) => sum + txn.remaining,
    0
  );
  const remainingGlobal = allOtherMonthlyLimit - (totalUsedAcrossAll || 0);

  const usable_coins = Math.min(
    totalAvailable,
    singleTransactionLimit,
    propertyMonthlyLimit,
    remainingGlobal,
    total_room_price
  );

  return {
    usable_coins,
    coin_discount: usable_coins,
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
    let finalPhotos = property.photos || [];
    let finalVideos = property.videos || [];

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
        if (
          !isNaN(parseInt(key)) &&
          typeof item === "object" &&
          item !== null
        ) {
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
              const updatedPhotos = [...(room.photos || []), item];
              room.set("photos", updatedPhotos);
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
              const updatedVideos = [...(room.videos || []), item];
              room.set("videos", updatedVideos);
              roomsToUpdate.add(room);
              assigned = true;
            }
          });
        }
        if (!assigned) newGeneralVideos.push(item);
      });

      if (roomsToUpdate.size > 0) {
        await Promise.all(Array.from(roomsToUpdate).map((room) => room.save()));
      }

      // --------- MERGE & DEDUPLICATE PHOTOS ---------
      const incomingPhotos = [
        ...(newCoverPhoto ? [newCoverPhoto] : []),
        ...newGeneralPhotos,
      ];
      const mergedPhotos = [...(property.photos || []), ...incomingPhotos];
      const uniquePhotoMap = new Map();
      for (const photo of mergedPhotos) {
        if (photo?.imageURL && !uniquePhotoMap.has(photo.imageURL)) {
          uniquePhotoMap.set(photo.imageURL, photo);
        }
      }
      finalPhotos = Array.from(uniquePhotoMap.values());

      // --------- MERGE & DEDUPLICATE VIDEOS ---------
      const incomingVideos = [
        ...(newCoverVideo ? [newCoverVideo] : []),
        ...newGeneralVideos,
      ];
      const mergedVideos = [...(property.videos || []), ...incomingVideos];
      const uniqueVideoMap = new Map();
      for (const video of mergedVideos) {
        if (video?.imageURL && !uniqueVideoMap.has(video.imageURL)) {
          uniqueVideoMap.set(video.imageURL, video);
        }
      }
      finalVideos = Array.from(uniqueVideoMap.values());

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
      photos: finalPhotos, // ✅ Save the final, correct photos array
      videos: finalVideos, // ✅ Save the final, correct videos array
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

    // // ✅ Step 3: Fallback active properties (same property_type if given)
    // if (availableProperties.length < 20) {
    //   const whereFallback = {
    //     active: true,
    //     [Op.and]: [propertyTypeFilter].filter(Boolean),
    //     id: {
    //       [Op.notIn]: availableProperties.map((p) => p.id),
    //     },
    //   };

    //   const fallbackProperties = await Property.findAll({
    //     where: whereFallback,
    //     limit: 20 - availableProperties.length,
    //   });

    //   for (const property of fallbackProperties) {
    //     const available = await checkAvailableRooms(
    //       property,
    //       adults,
    //       children,
    //       requestedRooms,
    //       startDate,
    //       finalDate
    //     );
    //     if (available) availableProperties.push(available);
    //     if (availableProperties.length === 20) break;
    //   }
    // }

    // ✅ Final enrichment and response
    const finalProperties = await enrichProperties(
      availableProperties,
      startDate,
      requestedRooms,
      adults,
      children
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
const parseArray = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }
  return [];
};

exports.filterActiveProperties = async (req, res) => {
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
    const userRatings = parseArray(req.body.userRatings);
    const starRatings = parseArray(req.body.starRatings);
    const popularTags = parseArray(req.body.popular);
    const amenities = parseArray(req.body.amenities);
    const roomView = parseArray(req.body.roomView);
    const roomAmenities = parseArray(req.body.roomAmenities);
    const minPrice = parseFloat(req.body.minPrice);
    const maxPrice = parseFloat(req.body.maxPrice);

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
    let isBookZeroApplicable = false;
    if (popularTags.includes("book_zero") && clean(todate)) {
      const checkInDate = moment(todate, "DD-MM-YYYY");
      const now = moment();

      // Calculate the difference in full days
      const daysDifference = checkInDate
        .startOf("day")
        .diff(now.startOf("day"), "days");

      // Rule: Not applicable for today or past dates
      if (daysDifference >= 1) {
        const isSaturday = checkInDate.day() === 6; // moment().day() for Saturday is 6

        if (isSaturday) {
          // For Saturday check-ins, require a 4-day gap
          if (daysDifference >= 4) {
            isBookZeroApplicable = true;
          }
        } else {
          // For other days, require a 2-day gap
          if (daysDifference >= 2) {
            isBookZeroApplicable = true;
          }
        }
      }
    }
    if (popularTags.includes("book_zero") && !isBookZeroApplicable) {
      return res.json({
        success: true,
        status: 200,
        properties: [], // Return empty array and exit
      });
    }
    const propertyTypeFilter = propType
      ? Sequelize.where(
          Sequelize.fn("lower", Sequelize.col("property_type")),
          propType.toLowerCase()
        )
      : null;
    const extraPropertyFilters = [];

    if (userRatings.length) {
      const ratingConditions = [];

      userRatings.forEach((rating) => {
        switch (rating.toLowerCase()) {
          case "excellent":
            // Corresponds to ratings 4.5 and above
            ratingConditions.push({ star_rating: { [Op.gte]: 4.5 } });
            break;
          case "very_good":
            // Corresponds to ratings from 4.0 up to 4.5
            ratingConditions.push({
              star_rating: { [Op.between]: [4.0, 4.4] },
            });
            break;
          case "good":
            // Corresponds to ratings from 3.0 up to 4.0
            ratingConditions.push({
              star_rating: { [Op.between]: [3.0, 3.9] },
            });
            break;
          // You can add more cases here if needed (e.g., 'average')
        }
      });

      // If any valid rating strings were found, combine them with an OR condition
      if (ratingConditions.length > 0) {
        extraPropertyFilters.push({ [Op.or]: ratingConditions });
      }
    }
    if (starRatings.length) {
      extraPropertyFilters.push({
        star_rating: { [Op.in]: starRatings.map(Number) },
      });
    }
    const tagsForDbFilter = popularTags.filter((tag) => tag !== "free_cancel");

    if (tagsForDbFilter.length) {
      const tagConditions = tagsForDbFilter.map((tag) => {
        const tagName = tag.replace(/_/g, " ");
        switch (tag) {
          case "couple_friendly":
            return `("Property".policies->'houseRules' @> '["Unmarried couples allowed"]')`;
          default:
            return `EXISTS (SELECT 1 FROM jsonb_array_elements("Property"."amenities") AS elem WHERE lower(elem->>'amenity_name') = lower('${tagName}') AND elem->>'is_selected' = 'true')`;
        }
      });
      if (tagConditions.length > 0) {
        extraPropertyFilters.push(
          Sequelize.literal(`(${tagConditions.join(" OR ")})`)
        );
      }
    }
    if (amenities.length) {
      const amenityConditions = amenities.map(
        (a) =>
          `EXISTS (SELECT 1 FROM jsonb_array_elements("Property"."amenities") AS elem WHERE elem->>'amenity_name' = '${a}' AND elem->>'is_selected' = 'true')`
      );
      extraPropertyFilters.push(
        Sequelize.literal(amenityConditions.join(" AND "))
      );
    }

    let availableProperties = [];

    if (lat && long && !startDate && !finalDate) {
      const whereNearby = {
        active: true,
        [Op.and]: [
          propertyTypeFilter,
          Sequelize.literal(
            `(lower(location->>'city') = lower('${city}') OR lower(location->>'locality') = lower('${city}') OR lower(location->>'searchLocation') = lower('${city}'))`
          ),
          ...extraPropertyFilters,
        ].filter(Boolean),
        id: { [Op.notIn]: availableProperties.map((p) => p.id) },
      };
      const nearbyProperties = await Property.findAll({ where: whereNearby });

      const finalProperties = await enrichPropertiesFilter(
        nearbyProperties,
        null,
        minPrice,
        maxPrice
      );

      return res.json({
        success: true,
        status: 200,
        properties: finalProperties,
      });
    }

    if (lat && long) {
      const whereNearby = {
        active: true,
        [Op.and]: [
          propertyTypeFilter,
          Sequelize.literal(
            `earth_distance(ll_to_earth(${lat}, ${long}), ll_to_earth((location->>'lat')::float, (location->>'lng')::float)) <= 10000`
          ),
          ...extraPropertyFilters,
        ].filter(Boolean),
      };

      const nearbyProperties = await Property.findAll({
        where: { [Op.and]: whereNearby },
      });

      for (const property of nearbyProperties) {
        const available = await checkAvailableRoomsForFilter(
          property,
          adults,
          children,
          requestedRooms,
          startDate,
          finalDate,
          roomAmenities,
          roomView
        );
        if (available) availableProperties.push(available);
      }
    }

    if (availableProperties.length < 20 && city) {
      const whereCity = {
        active: true,
        [Op.and]: [
          propertyTypeFilter,
          Sequelize.literal(
            `(lower(location->>'city') = lower('${city}') OR lower(location->>'locality') = lower('${city}') OR lower(location->>'searchLocation') = lower('${city}'))`
          ),
          ...extraPropertyFilters,
        ].filter(Boolean),
        id: { [Op.notIn]: availableProperties.map((p) => p.id) },
      };

      const cityProperties = await Property.findAll({
        where: whereCity,
        limit: 20 - availableProperties.length,
      });

      for (const property of cityProperties) {
        const available = await checkAvailableRoomsForFilter(
          property,
          adults,
          children,
          requestedRooms,
          startDate,
          finalDate,
          roomAmenities,
          roomView
        );
        if (available) availableProperties.push(available);
        if (availableProperties.length === 20) break;
      }
    }

    const finalProperties = await enrichPropertiesFilter(
      availableProperties,
      startDate,
      requestedRooms,
      adults,
      children,
      minPrice,
      maxPrice
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
    // const rooms = await Room.findAll({
    //   where: { propertyId },
    //   include: [{ model: room_amenity, as: "roomAmenities" }],
    // });

    // const formattedRooms = rooms.map((r) => {
    //   const room = r.get({ plain: true });
    //   const imageList = Array.isArray(room.photos)
    //     ? room.photos.map((p) => p.imageURL || "")
    //     : [];
    //   const videoList = Array.isArray(room.videos)
    //     ? room.videos.map((v) => v.videoURL || "")
    //     : [];
    //   return {
    //     ...room,
    //     photos: imageList,
    //     videos: videoList,
    //   };
    // });

    // Reviews
    const reviewRecords = await review.findAll({
      where: { propertyId },
    });

    const totalReviewRate = reviewRecords.length
      ? reviewRecords.reduce((sum, r) => sum + parseFloat(r.rating || 0), 0) /
        reviewRecords.length
      : 0;

    const reviews = reviewRecords.map((r) => ({
      userName: r.name,
      reviewText: r.comment,
      rating: parseFloat(r.rating),
      image: r.image || "",
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
        const defaultInventory = room.number_of_rooms;

        const defaultRates = {
          base: room.price.base_price_for_2_adults,
          extra: room.price.extra_adult_charge,
          child: room.price.child_charge,
        };

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

        // Apply overrides from RoomRateInventory
        const overrides = await RoomRateInventory.findAll({
          where: {
            roomId: room.id,
            date: { [Op.between]: [startDate, endDate] },
          },
        });

        for (const override of overrides) {
          const dateStr = new Date(override.date).toISOString().split("T")[0];

          if (inventory[dateStr] !== undefined) {
            inventory[dateStr] = override.inventory;
            rates[dateStr] = {
              base: override.price.base,
              extra: override.price.extra,
              child: defaultRates.child, // use default if child not included
              offerBaseRate: override.price.offerBaseRate,
              offerPlusOne: override.price.offerPlusOne,
            };
          }
        }

        // Adjust inventory based on bookings
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

        roomsData.push({
          id: room.id,
          name: room.room_name,
          inventory,
          rates,
          defaultInventory,
          defaultRates,
        });
      }

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

exports.getUpdatedRoomsForProperty = async (req, res) => {
  try {
    const { propertyId, adults, children, requestedRooms, startDate, endDate } =
      req.body;
    const userId = req.user?.id;

    if (!propertyId || !startDate || !endDate) {
      return res
        .status(400)
        .json({ message: "propertyId, startDate, and endDate are required" });
    }

    const property = await Property.findByPk(propertyId);
    const cancellationPolicy = property?.policies?.cancellationPolicy || null;

    const numRooms = parseInt(requestedRooms) || 1;
    const numAdults = parseInt(adults) || 0;
    const numChildren = parseInt(children) || 0;

    const start = moment(startDate, "YYYY-MM-DD");
    const end = moment(endDate, "YYYY-MM-DD");
    const no_of_days_stay = end.diff(start, "days");

    if (no_of_days_stay <= 0) {
      return res
        .status(400)
        .json({ message: "endDate must be after startDate" });
    }

    const allRoomsInProperty = await Room.findAll({ where: { propertyId } });
    if (!allRoomsInProperty.length) {
      return res.status(404).json({ message: "No rooms found for property" });
    }

    const roomIds = allRoomsInProperty.map((room) => room.id);
    const finalDate = end.clone().format("YYYY-MM-DD");

    const bookedRooms = await RoomBookedDate.findAll({
      where: {
        roomId: { [Op.in]: roomIds },
        checkIn: { [Op.lt]: finalDate },
        checkOut: { [Op.gt]: startDate },
        status: { [Op.in]: ["pending", "confirmed"] },
      },
    });

    const bookedCountMap = {};
    bookedRooms.forEach((b) => {
      bookedCountMap[b.roomId] = (bookedCountMap[b.roomId] || 0) + 1;
    });

    const roomRates = await RoomRateInventory.findAll({
      where: {
        propertyId,
        roomId: { [Op.in]: roomIds },
        date: startDate,
      },
    });

    const roomRateMap = {};
    roomRates.forEach((rate) => {
      roomRateMap[rate.roomId] = rate.inventory;
    });

    const totalGuests = numAdults + numChildren;
    const avgGuestsPerRoom = Math.ceil(totalGuests / numRooms);
    const avgAdultsPerRoom = Math.ceil(numAdults / numRooms);
    const validRooms = [];

    for (const room of allRoomsInProperty) {
      const maxAdults = parseInt(room.sleeping_arrangement?.max_adults || 0);
      const maxOccupancy = parseInt(
        room.sleeping_arrangement?.max_occupancy || 0
      );

      if (maxOccupancy < avgGuestsPerRoom || maxAdults < avgAdultsPerRoom)
        continue;

      const roomInventory = roomRateMap[room.id] || room.number_of_rooms || 0;
      const bookedCount = bookedCountMap[room.id] || 0;
      const availableRooms = Math.max(0, roomInventory - bookedCount);

      if (availableRooms < numRooms) continue;

      let basePrice = parseInt(room.price?.base_price_for_2_adults || 0);
      let originalPrice = Math.round(basePrice * 1.05);
      let totalBase = 0,
        totalOriginal = 0;

      for (let d = 0; d < no_of_days_stay; d++) {
        const currDate = start.clone().add(d, "days").format("YYYY-MM-DD");
        const rate = await RoomRateInventory.findOne({
          where: { propertyId, roomId: room.id, date: currDate },
        });

        if (rate?.price) {
          totalBase += parseInt(rate.price.offerBaseRate);
          totalOriginal += parseInt(rate.price.base);
        } else {
          totalBase += basePrice;
          totalOriginal += originalPrice;
        }
      }

      const baseAdultsPerRoom = parseInt(room.price?.base_adults || 2);
      const extraAdultCharge = parseInt(room.price?.extra_adult_charge || 0);
      const childCharge = parseInt(room.price?.child_charge || 0);

      const totalBaseForRooms = totalBase * numRooms;
      const totalIncludedAdults = baseAdultsPerRoom * numRooms;
      const extraAdults = Math.max(0, numAdults - totalIncludedAdults);
      const totalExtraAdultCharge =
        extraAdults * extraAdultCharge * no_of_days_stay;
      const totalChildCharge = numChildren * childCharge * no_of_days_stay;

      const finalPrice =
        totalBaseForRooms + totalExtraAdultCharge + totalChildCharge;
      const finalOriginalPrice =
        totalOriginal * numRooms + totalExtraAdultCharge + totalChildCharge;

      // --- Apply Coins using simulateUsableFestgoCoins ---
      let usableCoins = 0;
      let coinDiscount = 0;

      if (userId && finalPrice > 0) {
        try {
          const { usable_coins, coin_discount } =
            await simulateUsableFestgoCoins({
              userId,
              total_room_price: finalPrice,
            });
          usableCoins = usable_coins;
          coinDiscount = coin_discount;
        } catch (err) {
          console.warn(`Coin simulation failed: ${err.message}`);
        }
      }

      const plainRoom = room.get({ plain: true });
      const normalizedAmenities = normalizeRoomAmenities(
        room.room_amenities || []
      );
      let gst_rate = 0;
      if (finalPrice >= 8000) gst_rate = 18;
      else if (finalPrice >= 1000) gst_rate = 12;

      const gst_amount = (finalPrice * gst_rate) / 100;

      let service_fee = 50;
      if (finalPrice >= 1000 && finalPrice <= 1999) service_fee = 50;
      else if (finalPrice >= 2000 && finalPrice <= 4999) service_fee = 100;
      else if (finalPrice >= 5000 && finalPrice <= 7499) service_fee = 150;
      else if (finalPrice >= 7500 && finalPrice <= 9999) service_fee = 200;
      else if (finalPrice >= 10000) service_fee = 250;

      const totalPricePayable =
        finalPrice + gst_amount + service_fee - coinDiscount;
      let zero_booking = false;
      const checkIn = moment(startDate, "YYYY-MM-DD");
      const today = moment().startOf("day");
      const dayGap = checkIn.diff(today, "days");
      const isWeekend = checkIn.day() === 6 || checkIn.day() === 0; // Saturday or Sunday
      let zero_booking_deadline = null;
      if (isWeekend && dayGap > 4) {
        zero_booking = true;
        zero_booking_deadline = checkIn
          .clone()
          .subtract(5, "days")
          .endOf("day")
          .toDate();
      } else if (!isWeekend && dayGap > 2) {
        zero_booking = true;
        zero_booking_deadline = checkIn
          .clone()
          .subtract(3, "days")
          .endOf("day")
          .toDate();
      }
      const photos = (plainRoom.photos || []).map((photo) => photo.imageURL);
      const videos = (plainRoom.videos || []).map((video) => video.imageURL);

      delete plainRoom.room_amenities;
      delete plainRoom.photos;
      delete plainRoom.videos;

      validRooms.push({
        ...plainRoom,
        pricing: {
          pricePerNight: finalPrice,
          originalPrice: finalOriginalPrice,
          numberOfDays: no_of_days_stay,
          usableCoins,
          tax: gst_amount,
          service_fee,
          coinDiscount,
          totalPrice: totalPricePayable,
        },
        cancellationPolicy,
        availableRooms,
        zero_booking,
        deadline: zero_booking_deadline,
        amenities: normalizedAmenities.amenities,
        photos,
        videos,
      });
    }

    return res
      .status(200)
      .json({ rooms: validRooms, count: validRooms.length });
  } catch (error) {
    console.error("Error in getUpdatedRoomsForProperty:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.getPropertiesNames = async (req, res) => {
  try {
    const vendorId = req.user.id;

    const properties = await Property.findAll({
      where: { vendorId },
      attributes: [
        "id",
        "name",
        [
          fn(
            "concat",
            json("location.city"),
            literal("', '"),
            json("location.state"),
            literal("', '"),
            json("location.country")
          ),
          "location",
        ],
      ],
    });
    res.status(200).json({
      success: true,
      properties,
    });
  } catch (error) {
    console.error("Error fetching properties:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch properties",
      error: error.message,
    });
  }
};

exports.getMerchantPropertyBookings = async (req, res) => {
  try {
    const { propertyId } = req.params;

    // 1. Fetch property & its rooms
    const property = await Property.findByPk(propertyId, {
      include: [{ model: Room, as: "rooms" }],
    });

    if (!property) {
      return res.status(404).json({ message: "Property not found" });
    }

    // 2. Check vendor access
    if (property.vendorId !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Not authorized to access this property" });
    }

    // 3. Get all bookings for this property
    const bookings = await property_booking.findAll({
      where: {
        property_id: propertyId,
        payment_status: {
          [Op.in]: ["paid", "pending"],
        },
      },
    });

    if (bookings.length === 0) {
      return res.json({
        property: {
          id: property.id,
          name: property.name,
          vendorId: property.vendorId,
        },
        rooms: property.rooms,
        bookings: [],
      });
    }

    // 4. Fetch all users for bookings in one query
    const userIds = bookings.map((b) => b.user_id);
    const users = await User.findAll({
      where: { id: { [Op.in]: userIds } },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    // 5. Create a room lookup map for faster access
    const roomMap = new Map(property.rooms.map((r) => [r.id, r]));

    // 6. Transform bookings
    const result = bookings.map((booking) => {
      const user = userMap.get(booking.user_id);
      const room = roomMap.get(booking.room_id);

      // format guest name
      let guestName = user
        ? user.firstname && user.lastname
          ? `${user.firstname} ${user.lastname}`
          : user.username || "Guest"
        : "Guest";

      return {
        guestName,
        guests: booking.num_adults + booking.num_children,
        checkIn: booking.check_in_date, // frontend can format if needed
        checkOut: booking.check_out_date,
        roomType: room ? room.room_type : "Unknown",
        mealPlan: room ? room.meal_plan : "EP", // ✅ now from room
        bookingId: booking.id,
        guestContact: user.number,
        guestEmail: user.email,

        netAmount: booking.amount_paid,
        paymentStatus: booking.payment_status,
        bookingType: booking.zero_booking ? "zero booking" : "regular",
      };
    });

    res.json({
      property: {
        id: property.id,
        name: property.name,
        vendorId: property.vendorId,
      },
      bookings: result,
    });
  } catch (error) {
    console.error("Error fetching property bookings:", error);
    res.status(500).json({ message: "Server error" });
  }
};
