const app = require("./app");
const { config } = require("dotenv");
const {
  usersPool,
  servicesPool,
  usersSequelize,
  servicesSequelize,
} = require("./db");

process.on("uncaughtException", (err) => {
  console.error(`Uncaught Exception: ${err.message}`);
  process.exit(1);
});

config({ path: "config/config.env" });

// Load and sync models
require("./models/users");
require("./models/services");

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// Test DB pool connections
usersPool
  .connect()
  .then((client) => {
    console.log("✅ Connected to festgo_users pool");
    client.release();
  })
  .catch((err) => console.error("❌ festgo_users pool error:", err.message));

servicesPool
  .connect()
  .then((client) => {
    console.log("✅ Connected to festgo_services pool");
    client.release();
  })
  .catch((err) => console.error("❌ festgo_services pool error:", err.message));

process.on("unhandledRejection", (err) => {
  console.error(`Unhandled Rejection: ${err.message}`);
  server.close(() => process.exit(1));
});
