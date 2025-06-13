const { usersSequelize } = require("../../db");
const review = require("./review.model");
const User = require("./user.model")(usersSequelize);

const db = {
  Sequelize: usersSequelize,
  User,
  review,
};

db.Sequelize.sync({ alter: true })
  .then(() => console.log("✅ Users DB models synced."))
  .catch((err) => console.error("❌ Users DB sync error:", err.message));

module.exports = db;
