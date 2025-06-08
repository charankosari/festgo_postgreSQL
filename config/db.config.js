const { config } = require("dotenv");
config({ path: "config/config.env" });

module.exports = {
  usersDB: {
    HOST: process.env.DB_HOST,
    USER: "postgres",
    PASSWORD: process.env.DB_PASSWORD,
    DB: process.env.DB_NAME_USERS,
    dialect: "postgres",
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  },
  servicesDB: {
    HOST: process.env.DB_HOST,
    USER: "postgres",
    PASSWORD: process.env.DB_PASSWORD,
    DB: process.env.DB_NAME_SERVICES,
    dialect: "postgres",
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  },
};
