const {
  Banquets,
  FestgoCoinSetting,
  FestgoCoinUsageLimit,
  sequelize,
} = require("../models/services/index");
const { review, User } = require("../models/users/index");
const {
  normalizePropertyData,
  normalizeRoomData,
} = require("../utils/normalizePropertyData");
const { Op, Sequelize } = require("sequelize");
const moment = require("moment");
function updateStrdata(existingStrdata, step, newStepData) {
  const updatedStrdata = { ...existingStrdata };
  updatedStrdata[`step_${step}`] = {
    ...(existingStrdata[`step_${step}`] || {}),
    ...newStepData,
  };
  return updatedStrdata;
}
const checkBanquetAvailable = async (banquet, startDate, finalDate) => {
  // Fetch booked entries for overlapping dates
  const booked = await BanquetBookedDate.findAll({
    where: {
      banquetId: banquet.id,
      checkIn: { [Op.lt]: finalDate }, // booking starts before end
      checkOut: { [Op.gt]: startDate }, // booking ends after start
      status: { [Op.in]: ["pending", "confirmed"] },
    },
  });

  // If anything overlaps → banquet unavailable
  if (booked.length > 0) return null;

  return banquet; // available
};

const formatBanquetResponse = async (banquet, startDate) => {
  const {
    id,
    vendorId,
    name,
    email,
    description,
    star_rating,
    location,
    photos,
    review_count,
    price, // ✅ base price stored in banquet
  } = banquet;

  let finalPrice = parseInt(price || 0);
  let originalPrice = Math.round(finalPrice * 1.05);

  // ✅ Override price if there is a banquet-specific rate for the given date
  if (startDate) {
    const rate = await BanquetRateInventory.findOne({
      where: { banquetId: id, date: startDate },
    });

    if (rate?.price) {
      finalPrice = parseInt(rate.price.offerBaseRate);
      originalPrice = parseInt(rate.price.base);
    }
  }

  const imageList = Array.isArray(photos)
    ? photos.map((p) => p.imageURL || "")
    : [];

  return {
    id,
    vendorId,
    name,
    email,
    description,
    star_rating,
    pricePerDay: finalPrice,
    originalPrice,
    review_count,
    location,
    imageList,
  };
};

const enrichBanquets = async (banquets, startDate, finalDate) => {
  const enriched = [];

  for (const b of banquets) {
    const plain = b.get ? b.get({ plain: true }) : b;

    // Check availability before formatting
    const available = await checkBanquetAvailable(plain, startDate, finalDate);
    if (!available) continue;

    delete plain.ownership_details;
    delete plain.bank_details;
    delete plain.tax_details;
    delete plain.strdata;

    const formatted = await formatBanquetResponse(plain, startDate);
    if (formatted) enriched.push(formatted);
  }

  return enriched;
};

exports.createBanquet = async (req, res) => {
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
    const banquet = await Banquets.create({
      vendorId,
      current_step,
      status,
      in_progress,
      is_completed,
      strdata: newStrdata,
      ...normalizedDetails,
    });

    res.status(201).json({ success: true, banquet });
  } catch (err) {
    console.error("Error in create banquet:", err);
    res.status(500).json({ message: err.message });
  }
};
exports.updateBanquet = async (req, res) => {
  try {
    const { id } = req.params;
    let updates = { ...req.body };
    const incomingStep = updates.current_step;

    const banquet = await Banquets.findByPk(id);
    if (!banquet) return res.status(404).json({ message: "Banquet not found" });

    let currentStep = banquet.current_step;
    if (incomingStep !== undefined) {
      currentStep = Math.min(incomingStep, 6);
    } else if (currentStep < 6) {
      currentStep += 1;
    }

    // Load existing strdata
    let newStrdata = banquet.strdata || {};
    let finalPhotos = banquet.photos || [];
    let finalVideos = banquet.videos || [];

    // 1️⃣ Merge incoming updates into existing step's strdata
    newStrdata = updateStrdata(newStrdata, currentStep, updates);

    // 🔄 --- MEDIA HANDLING ---
    if (currentStep === 4) {
      newStrdata.step_4 = {
        ...(newStrdata.step_4 || {}),
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

      // --------- MERGE & DEDUPLICATE PHOTOS ---------
      let mergedPhotos = [...(banquet.photos || []), ...imageItems];
      const uniquePhotoMap = new Map();
      for (const photo of mergedPhotos) {
        if (photo?.imageURL && !uniquePhotoMap.has(photo.imageURL)) {
          uniquePhotoMap.set(photo.imageURL, photo);
        }
      }
      finalPhotos = Array.from(uniquePhotoMap.values());

      // Ensure cover photo is at index 0
      const coverPhotoIndex = finalPhotos.findIndex((p) => p.coverPhoto);
      if (coverPhotoIndex > 0) {
        const [coverPhoto] = finalPhotos.splice(coverPhotoIndex, 1);
        finalPhotos.unshift(coverPhoto);
      }

      // --------- MERGE & DEDUPLICATE VIDEOS ---------
      let mergedVideos = [...(banquet.videos || []), ...videoItems];
      const uniqueVideoMap = new Map();
      for (const video of mergedVideos) {
        if (video?.imageURL && !uniqueVideoMap.has(video.imageURL)) {
          uniqueVideoMap.set(video.imageURL, video);
        }
      }
      finalVideos = Array.from(uniqueVideoMap.values());

      // Ensure cover video is at index 0
      const coverVideoIndex = finalVideos.findIndex((v) => v.coverPhoto);
      if (coverVideoIndex > 0) {
        const [coverVideo] = finalVideos.splice(coverVideoIndex, 1);
        finalVideos.unshift(coverVideo);
      }

      // Remove processed media keys from updates
      mediaKeys.forEach((key) => delete updates[key]);
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

    await banquet.update({
      ...normalizedData,
      current_step: currentStep,
      status,
      in_progress,
      is_completed,
      photos: finalPhotos,
      videos: finalVideos,
      strdata: newStrdata,
    });

    res.json({ success: true, banquet });
  } catch (err) {
    console.error("Error in update banquet:", err);
    res.status(500).json({ message: err.message });
  }
};
exports.deleteBanquet = async (req, res) => {
  try {
    const { id } = req.params;
    const Banquet = await Banquets.findByPk(id);
    if (!Banquet) return res.status(404).json({ message: "Banquet not found" });

    await Banquet.destroy();
    res.json({ success: true, message: "Banquet deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getAllActiveBanquetsByRange = async (req, res) => {
  try {
    const { latitude, longitude, todate, enddate, location } = req.body;

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
    const city = clean(location);

    let availableBanquets = [];

    // 🟢 Case 1: Only lat/long, no dates → just return active banquets within 10km
    if (lat && long && !startDate && !finalDate) {
      const whereNearby = {
        active: true,
        [Op.and]: [
          Sequelize.literal(`
            earth_distance(
              ll_to_earth(${lat}, ${long}),
              ll_to_earth(
                (location->>'lat')::float, 
                (location->>'lng')::float
              )
            ) <= 10000
          `),
        ],
      };

      const nearbyBanquets = await Banquets.findAll({ where: whereNearby });
      const finalBanquets = await enrichBanquets(nearbyBanquets, null, null);

      return res.json({
        success: true,
        status: 200,
        properties: finalBanquets,
      });
    }

    // 🟢 Case 2: Lat/long + dates → check availability + pricing
    if (lat && long) {
      const whereNearby = {
        active: true,
        [Op.and]: [
          Sequelize.literal(`
            earth_distance(
              ll_to_earth(${lat}, ${long}),
              ll_to_earth(
                (location->>'lat')::float, 
                (location->>'lng')::float
              )
            ) <= 10000
          `),
        ],
      };

      const nearbyBanquets = await Banquets.findAll({ where: whereNearby });

      for (const banquet of nearbyBanquets) {
        const available = await checkBanquetAvailable(
          banquet,
          startDate,
          finalDate
        );
        if (available) availableBanquets.push(banquet);
      }
    }

    // 🟢 Case 3: Fallback → search by city if <20 banquets found
    if (availableBanquets.length < 20 && city) {
      const whereCity = {
        active: true,
        [Op.and]: [
          Sequelize.literal(`(
            lower(location->>'city') = lower('${city}')
            OR lower(location->>'locality') = lower('${city}')
            OR lower(location->>'searchLocation') = lower('${city}')
          )`),
        ],
        id: {
          [Op.notIn]: availableBanquets.map((b) => b.id),
        },
      };

      const cityBanquets = await Banquets.findAll({
        where: whereCity,
        limit: 20 - availableBanquets.length,
      });

      for (const banquet of cityBanquets) {
        const available = await checkBanquetAvailable(
          banquet,
          startDate,
          finalDate
        );
        if (available) availableBanquets.push(banquet);
        if (availableBanquets.length === 20) break;
      }
    }

    // 🟢 Final enrichment (pricing, photos, etc.)
    const finalBanquets = await enrichBanquets(
      availableBanquets,
      startDate,
      finalDate
    );

    return res.json({
      success: true,
      status: 200,
      properties: finalBanquets,
    });
  } catch (err) {
    console.error("Error fetching banquets:", err);
    res.status(500).json({ message: err.message, status: 500 });
  }
};
