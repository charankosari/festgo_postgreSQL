export function normalizePropertyData(data) {
  console.log("Normalizing property data:", data);
  return {
    property_type: data.hotelType,
    name: data.propertyName,
    star_rating: parseInt(data.hotelStarRating) || null,
    property_built_date: data.builtYear ? `${data.builtYear}-01-01` : null,
    accepting_bookings_since: data.acceptingBookingSince
      ? `${data.acceptingBookingSince}-01-01`
      : null,
    email: data.email,
    mobile_number: data.mobileNumber,
    landline_number: data.landline,
    ownership_details: data.ownershipDetails || {},
    bank_details: data.bankDetails || {},
    tax_details: data.taxDetails || {},
    consent: data.acceptTerms || false,
    amenities: data.amenities || [],
    photos: data.photos || [],
    videos: data.videos || [],
    channelManager: data.channelManager || false,
    sameAsWhatsapp: data.sameAsWhatsapp || false,
    channelManagerName: data.channelManagerName || "",
    description: data.description || "",
    // Policies block
    policies: data.policies || {
      checkInTime: data.checkInTime,
      checkOutTime: data.checkOutTime,
      minimumStay: data.minimumStay,
      maximumStay: data.maximumStay,
      advanceBookingDays: data.advanceBookingDays,
      instantBooking: data.instantBooking,
      smokingPolicy: data.smokingPolicy,
      petPolicy: data.petPolicy,
      eventPolicy: data.eventPolicy,
      childPolicy: data.childPolicy,
      additionalGuestFee: data.additionalGuestFee,
      securityDeposit: data.securityDeposit,
      cleaningFee: data.cleaningFee,
      cancellationPolicy: data.cancellationPolicy,
      houseRules: data.houseRules,
      customRules: data.customRules,
      quietHours: data.quietHours,
      ageRestriction: data.ageRestriction,
      guestVerification: data.guestVerification,
      damagePolicy: data.damagePolicy,
      accessInstructions: data.accessInstructions,
    },

    // Location mapping
    location: {
      searchLocation: data.searchLocation,
      houseNumber: data.houseNumber,
      locality: data.locality,
      pincode: data.pincode,
      country: data.country,
      state: data.state,
      city: data.city,
      lat: data.mapLocation?.lat || null,
      lng: data.mapLocation?.lng || null,
    },
  };
}

export function normalizeRoomData(data) {
  const {
    roomDetailsFormInfo,
    selectedRoomFormInfo,
    bathroomDetailsFormInfo,
    mealPlanDetailsFormInfo,
    roomAmenities,
  } = data;

  return {
    propertyId: data.propertyId,
    room_name: roomDetailsFormInfo.name,
    room_type: roomDetailsFormInfo.type,
    view: roomDetailsFormInfo.view,
    area: roomDetailsFormInfo.size
      ? `${roomDetailsFormInfo.size} ${roomDetailsFormInfo.sizeUnit}`
      : null,
    number_of_rooms: roomDetailsFormInfo.numberOfRooms,
    description: roomDetailsFormInfo.description,
    max_adults: selectedRoomFormInfo.maxAdults || 0,
    max_children: selectedRoomFormInfo.maxChildren || 0,
    // New structured sleeping arrangement
    sleeping_arrangement: {
      base_adults: selectedRoomFormInfo.baseAdults || 0,
      max_adults: selectedRoomFormInfo.maxAdults || 0,
      max_children: selectedRoomFormInfo.maxChildren || 0,
      max_occupancy: selectedRoomFormInfo.maxOccupancy || 0,
      max_extra_beds: selectedRoomFormInfo.maxExtraBeds || 0,
      beds: selectedRoomFormInfo.beds || [],
    },

    bathroom_available: bathroomDetailsFormInfo.numberOfBathrooms || 0,

    price: {
      base_price_for_2_adults: mealPlanDetailsFormInfo.baseRateFor2Adults || 0,
      extra_adult_charge: mealPlanDetailsFormInfo.extraAdultCharge || 0,
      child_charge: mealPlanDetailsFormInfo.childCharge || 0,
    },

    free_cancellation: mealPlanDetailsFormInfo.freeCancellation || "No",
    additional_info: roomDetailsFormInfo.additionalInfo || "",

    meal_plan: mealPlanDetailsFormInfo.mealPlan || null,
    room_amenities: roomAmenities || [],
    photos: data.photos || [],
    videos: [], // no video input yet
  };
}
export function normalizePropertyRules(policies = {}) {
  const rules = [];

  if (policies.petPolicy) rules.push(`Pet Policy: ${policies.petPolicy}`);

  if (Array.isArray(policies.houseRules)) {
    rules.push(...policies.houseRules);
  }

  if (policies.quietHours?.enabled) {
    const { startTime, endTime } = policies.quietHours;
    rules.push(`Quiet Hours: ${startTime} - ${endTime}`);
  }

  if (policies.checkInTime)
    rules.push(`Check-in Time: ${policies.checkInTime}`);

  if (policies.checkOutTime)
    rules.push(`Check-out Time: ${policies.checkOutTime}`);

  if (policies.childPolicy) rules.push(`Child Policy: ${policies.childPolicy}`);

  if (policies.eventPolicy) rules.push(`Event Policy: ${policies.eventPolicy}`);

  if (policies.minimumStay)
    rules.push(`Minimum Stay: ${policies.minimumStay} night(s)`);

  if (policies.maximumStay)
    rules.push(`Maximum Stay: ${policies.maximumStay} night(s)`);

  if (policies.cleaningFee)
    rules.push(`Cleaning Fee: ₹${policies.cleaningFee}`);

  if (policies.additionalGuestFee)
    rules.push(`Additional Guest Fee: ₹${policies.additionalGuestFee}`);

  if (policies.smokingPolicy)
    rules.push(`Smoking Policy: ${policies.smokingPolicy}`);

  if (policies.cancellationPolicy)
    rules.push(`Cancellation Policy: ${policies.cancellationPolicy}`);

  if (policies.ageRestriction?.enabled) {
    rules.push(`Minimum Age: ${policies.ageRestriction.minimumAge}`);
  }

  if (policies.securityDeposit)
    rules.push(`Security Deposit: ₹${policies.securityDeposit}`);

  if (Array.isArray(policies.customRules)) {
    rules.push(...policies.customRules);
  }

  return rules;
}
