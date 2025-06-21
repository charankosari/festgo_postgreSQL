const { servicesSequelize, usersSequelize } = require("../../db");
const city_fest = require("./city_fest.model");
const city_fest_category = require("./city_fest_category.model");

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

// city fests models
const CityFestCategory = require("./city_fest_category.model")(
  servicesSequelize
);
const CityFest = require("./city_fest.model")(servicesSequelize);
// Define Associations for Amenity

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
CityFest.belongsTo(CityFestCategory, {
  foreignKey: "categoryId",
  as: "festCategory", // <-- changed alias here
  onDelete: "CASCADE",
});

CityFestCategory.hasMany(CityFest, {
  foreignKey: "categoryId",
  as: "cityFests",
});

// Setup DB object
const db = {
  Sequelize: servicesSequelize,
  amenity_category,
  amenity,
  room_amenity_category,
  room_amenity,
  Property,
  Room,
  Event,
  EventType,
  MenuItem,
  MenuType,
  Festbite,
  RoomBookedDate,
  beach_fests,
  city_fest,
  city_fest_category,
};

// Sync all models
servicesSequelize
  .sync({ alter: true })
  .then(() => console.log("✅ Services DB models synced."))
  .catch((err) => console.error("❌ Services DB sync error:", err.message));

module.exports = db;
