const { servicesSequelize, usersSequelize } = require("../../db");
const zeroBookingInstance = require("./zero_booking_instances.model")(
  servicesSequelize
);
const city_fest = require("./city_fest.model")(servicesSequelize);
const city_fest_category = require("./city_fest_category.model")(
  servicesSequelize
);
const ContactMessage = require("./ContactMessage")(servicesSequelize);

// Import models
const amenity_category = require("./amenity_category.model")(servicesSequelize);
const amenity = require("./amenity.model")(servicesSequelize);
const room_amenity_category = require("./room_amenity_category.model")(
  servicesSequelize
);
const RoomBookedDate = require("./roomBookedDate.model")(servicesSequelize);
const room_amenity = require("./room_amenity.model")(servicesSequelize);
const Property = require("./property.model")(servicesSequelize);
const Room = require("./room.model")(servicesSequelize);
const Event = require("./events.model")(servicesSequelize);
const EventType = require("./event_types.model")(servicesSequelize);
// fest bite
const Festbite = require("./festbite.model")(servicesSequelize);
const MenuItem = require("./menu_item.model")(servicesSequelize);
const MenuType = require("./menu_type.model")(servicesSequelize);
// beach fests model
const beach_fests = require("./beach_fest.model")(servicesSequelize);
const beachfests_booking = require("./beachfests_booking.model")(
  servicesSequelize
);

// city fests models
// const CityFestCategory = require("./city_fest_category.model")(
//   servicesSequelize
// );
// const CityFest = require("./city_fest.model")(servicesSequelize);
// property booking
const property_booking = require("./property_booking.model")(servicesSequelize);

const city_fest_booking = require("./city_fest_booking.model")(
  servicesSequelize
);

const Trips = require("./trips.model")(servicesSequelize);
const PlanMyTrips = require("./planmytrips.model")(servicesSequelize);
// room rate inventory
const RoomRateInventory = require("./room_rate_inventory.model")(
  servicesSequelize
);
const FestgoCoinSetting = require("./festgo_coins_settings.model")(
  servicesSequelize
);
// cron
const CronThing = require("./cron_things")(servicesSequelize);
const FestgoCoinUsageLimit = require("./festgo_coins_usage_limits.model")(
  servicesSequelize
);
const TripsBooking = require("./trips_booking.model")(servicesSequelize);
const Offers = require("./offers.model")(servicesSequelize);
const Banquets = require("./banquets.model")(servicesSequelize);

const Property_visits = require("./property_visit.model")(servicesSequelize);
amenity.belongsTo(amenity_category, {
  foreignKey: "categoryId",
  as: "category",
  onDelete: "CASCADE",
});
amenity_category.hasMany(amenity, {
  foreignKey: "categoryId",
  as: "amenities",
});

room_amenity.belongsTo(room_amenity_category, {
  foreignKey: "categoryId",
  as: "roomAmenityCategory",
  onDelete: "CASCADE",
});
room_amenity_category.hasMany(room_amenity, {
  foreignKey: "categoryId",
  as: "roomAmenities",
});
Event.belongsTo(EventType, {
  foreignKey: "eventTypeId",
  onDelete: "CASCADE",
});
EventType.hasMany(Event, { foreignKey: "eventTypeId", as: "events" });
Property.hasMany(Room, {
  foreignKey: "propertyId",
  as: "rooms",
  onDelete: "CASCADE",
});
Room.belongsTo(Property, {
  foreignKey: "propertyId",
  as: "property",
  onDelete: "CASCADE",
});

MenuType.hasMany(MenuItem, {
  foreignKey: "menuTypeId",
  as: "menuItems",
  onDelete: "CASCADE",
});
MenuItem.belongsTo(MenuType, {
  foreignKey: "menuTypeId",
  as: "menuType",
  onDelete: "CASCADE",
});
Room.hasMany(room_amenity, {
  foreignKey: "roomId",
  as: "roomAmenities", // camelCase
  onDelete: "CASCADE",
});

room_amenity.belongsTo(Room, {
  foreignKey: "roomId",
  as: "room",
  onDelete: "CASCADE",
});

// for available rooms
Property.hasMany(RoomBookedDate, {
  foreignKey: "propertyId",
  as: "roomBookedDates",
  onDelete: "CASCADE",
});
RoomBookedDate.belongsTo(Property, {
  foreignKey: "propertyId",
  as: "property",
  onDelete: "CASCADE",
});
// In RoomBookedDate model
RoomBookedDate.belongsTo(property_booking, {
  foreignKey: "bookingId",
  as: "booking",
});

Room.hasMany(RoomBookedDate, {
  foreignKey: "roomId",
  as: "bookedDates",
  onDelete: "CASCADE",
});
RoomBookedDate.belongsTo(Room, {
  foreignKey: "roomId",
  as: "room",
  onDelete: "CASCADE",
});
city_fest.belongsTo(city_fest_category, {
  foreignKey: "categoryId",
  as: "festCategory", // <-- changed alias here
  onDelete: "CASCADE",
});

city_fest_category.hasMany(city_fest, {
  foreignKey: "categoryId",
  as: "cityFests",
});
// City Fest Booking Associations

city_fest_booking.belongsTo(city_fest, {
  foreignKey: "cityfest_id",
  as: "cityFest",
  onDelete: "CASCADE",
});

city_fest.hasMany(city_fest_booking, {
  foreignKey: "cityfest_id",
  as: "bookings",
  onDelete: "CASCADE",
});

// Optional — if booking also directly stores categoryId:
city_fest_booking.belongsTo(city_fest_category, {
  foreignKey: "category_id",
  as: "festCategory",
  onDelete: "CASCADE",
});

city_fest_category.hasMany(city_fest_booking, {
  foreignKey: "category_id",
  as: "bookings",
  onDelete: "CASCADE",
});

// Property-Booking Association
Property.hasMany(property_booking, {
  foreignKey: "property_id",
  as: "bookings",
  onDelete: "CASCADE",
});
property_booking.belongsTo(Property, {
  foreignKey: "property_id",
  as: "property",
  onDelete: "CASCADE",
});

// Room-Booking Association
Room.hasMany(property_booking, {
  foreignKey: "room_id",
  as: "roomBookings",
  onDelete: "CASCADE",
});
property_booking.belongsTo(Room, {
  foreignKey: "room_id",
  as: "room",
  onDelete: "CASCADE",
});

beach_fests.hasMany(beachfests_booking, {
  foreignKey: "beachfest_id",
  as: "bookings",
  onDelete: "CASCADE",
});

beachfests_booking.belongsTo(beach_fests, {
  foreignKey: "beachfest_id",
  as: "beachfest",
  onDelete: "CASCADE",
});

// Setup associations for RoomRateInventory
Property.hasMany(RoomRateInventory, {
  foreignKey: "propertyId",
  as: "roomRateInventories",
  onDelete: "CASCADE",
});
RoomRateInventory.belongsTo(Property, {
  foreignKey: "propertyId",
  as: "property",
  onDelete: "CASCADE",
});

Room.hasMany(RoomRateInventory, {
  foreignKey: "roomId",
  as: "rateInventories",
  onDelete: "CASCADE",
});
RoomRateInventory.belongsTo(Room, {
  foreignKey: "roomId",
  as: "room",
  onDelete: "CASCADE",
});

// Setup DB object
const db = {
  sequelize: servicesSequelize,
  Sequelize: servicesSequelize,
  amenity_category,
  amenity,
  room_amenity_category,
  room_amenity,
  Property,
  property_booking,
  Room,
  Event,
  EventType,
  MenuItem,
  MenuType,
  Festbite,
  RoomBookedDate,
  beach_fests,
  beachfests_booking,
  city_fest,
  city_fest_category,
  city_fest_booking,
  CronThing,
  ContactMessage,
  RoomRateInventory,
  FestgoCoinSetting,
  FestgoCoinUsageLimit,
  Offers,
  zeroBookingInstance,
  Trips,
  PlanMyTrips,
  TripsBooking,
  Property_visits,
  Banquets,
};

// Sync all models
servicesSequelize
  .sync({ alter: true })
  .then(() => console.log("✅ Services DB models synced."))
  .catch((err) => console.error("❌ Services DB sync error:", err.message));

module.exports = db;
