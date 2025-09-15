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

function updateStrdata(existingStrdata, step, newStepData) {
  const updatedStrdata = { ...existingStrdata };
  updatedStrdata[`step_${step}`] = {
    ...(existingStrdata[`step_${step}`] || {}),
    ...newStepData,
  };
  return updatedStrdata;
}

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
