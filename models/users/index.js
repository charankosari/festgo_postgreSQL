const { usersSequelize } = require("../../db");
const User = require("./user.model")(usersSequelize);

const db = {};
db.Sequelize = usersSequelize;
db.User = User;

db.Sequelize.sync({ alter: true })
  .then(() => console.log("✅ Users DB models synced."))
  .catch((err) => console.error("❌ Users DB sync error:", err.message));

module.exports = db;
