const { servicesSequelize } = require("../../db");
const amenity_category = require("./amenity_category.model")(servicesSequelize);
const amenity = require("./amenity.model")(servicesSequelize);
amenity.belongsTo(amenity_category, {
  foreignKey: "categoryId",
  as: "category",
  onDelete: "CASCADE",
});

amenity_category.hasMany(amenity, {
  foreignKey: "categoryId",
  as: "amenities",
});

const db = {};
db.Sequelize = servicesSequelize;
db.amenity_category = amenity_category;
db.amenity = amenity;

db.Sequelize.sync({ alter: true })
  .then(() => console.log("✅ Services DB models synced."))
  .catch((err) => console.error("❌ Services DB sync error:", err.message));

module.exports = db;
