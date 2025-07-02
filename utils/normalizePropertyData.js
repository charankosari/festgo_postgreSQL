export function normalizePropertyData(data) {
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

    // people capacity
    max_people: selectedRoomFormInfo.maxOccupancy,
    max_adults: selectedRoomFormInfo.maxAdults,
    max_children: selectedRoomFormInfo.maxChildren,

    // sleeping arrangement: convert bed info to a string summary
    sleeping_arrangement: selectedRoomFormInfo.beds
      .map((b) => `${b.quantity} x ${b.bedType}`)
      .join(", "),

    // bathroom details
    bathroom_details: `${bathroomDetailsFormInfo.numberOfBathrooms} Bathroom(s)`,

    // meal plans
    meal_plans: mealPlanDetailsFormInfo.mealPlan
      ? [mealPlanDetailsFormInfo.mealPlan]
      : [],

    original_price: mealPlanDetailsFormInfo.baseRateFor2Adults || 0,
    discounted_price: null, // you can compute this elsewhere if needed
    free_cancellation: "No",
    free_breakfast:
      mealPlanDetailsFormInfo.mealPlan === "breakfast_only" ? "Yes" : "No",

    // room amenities
    room_amenities: roomAmenities.map((a) => ({
      amenityId: a.amenityId,
      name: a.otaName,
      isSelected: a.isSelected,
      chargeType: a.chargeType,
      category: a.category,
      selectedSubAmenities: a.selectedSubAmenities,
    })),

    // photos (if images array available in roomDetailsFormInfo)
    photos: (roomDetailsFormInfo.images || []).map((url) => ({ url, tag: "" })),

    videos: [], // none in your payload now
  };
}
