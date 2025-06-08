const { Sequelize } = require("sequelize");
const { Pool } = require("pg");
const { config } = require("dotenv");

config({ path: "config/config.env" });

// Create Sequelize instances
const usersSequelize = new Sequelize(
  process.env.DB_NAME_USERS,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: "postgres",
    logging: false,
  }
);

const servicesSequelize = new Sequelize(
  process.env.DB_NAME_SERVICES,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: "postgres",
    logging: false,
  }
);

// Optionally create pg.Pool instances (if needed)
const usersPool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME_USERS,
  port: process.env.DB_PORT,
});

const servicesPool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME_SERVICES,
  port: process.env.DB_PORT,
});

module.exports = {
  usersSequelize,
  servicesSequelize,
  usersPool,
  servicesPool,
};
