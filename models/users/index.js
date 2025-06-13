const { usersSequelize } = require("../../db");
const review = require("./review.model")(usersSequelize);
const User = require("./user.model")(usersSequelize);

const db = {
  Sequelize: usersSequelize,
  User,
  review,
};
review.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
  onDelete: "CASCADE",
});

User.hasMany(review, {
  foreignKey: "userId",
  as: "reviews",
  onDelete: "CASCADE",
});
db.Sequelize.sync({ alter: true })
  .then(() => console.log("✅ Users DB models synced."))
  .catch((err) => console.error("❌ Users DB sync error:", err.message));

module.exports = db;
