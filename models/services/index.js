const { servicesSequelize, usersSequelize } = require("../../db");

// Import models
const amenity_category = require("./amenity_category.model")(servicesSequelize);
const amenity = require("./amenity.model")(servicesSequelize);
const room_amenity_category = require("./room_amenity_category.model")(
  servicesSequelize
);
const room_amenity = require("./room_amenity.model")(servicesSequelize);
const Property = require("./property.model")(servicesSequelize);
const Event = require("./events.model")(servicesSequelize);
const EventType = require("./event_types.model")(servicesSequelize);
// fest bite
const Festbite = require("./festbite.model")(servicesSequelize);
const MenuItem = require("./menu_item.model")(servicesSequelize);
const MenuType = require("./menu_type.model")(servicesSequelize);
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
// Setup DB object
const db = {
  Sequelize: servicesSequelize,
  amenity_category,
  amenity,
  room_amenity_category,
  room_amenity,
  Property,
  Event,
  EventType,
  MenuItem,
  MenuType,
  Festbite,
};

// Sync all models
servicesSequelize
  .sync({ alter: true })
  .then(() => console.log("✅ Services DB models synced."))
  .catch((err) => console.error("❌ Services DB sync error:", err.message));

module.exports = db;
