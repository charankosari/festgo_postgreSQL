const mongoose = require("mongoose");
const app = require("./app");
const { config } = require("dotenv");

process.on("uncaughtException", (err) => {
  console.error(`Error: ${err.message}`);
  console.error("Shutting down the server due to uncaught exception...");
  process.exit(1);
});

config({ path: "config/config.env" });

const connectDatabase = async () => {
  try {
    const data = await mongoose.connect(process.env.DB_URI);
    console.log(`Database is connected at server: ${data.connection.host}`);
  } catch (err) {
    console.error("Error while connecting to database:", err.message);
    process.exit(1); // Exit the process if the database connection fails
  }
};

const startServer = () => {
  const server = app.listen(process.env.PORT, () =>
    console.log(`App is running at port ${process.env.PORT}`)
  );

  process.on("unhandledRejection", (err) => {
    console.error(`Error: ${err.message}`);
    console.error(
      "Shutting down the server due to unhandled promise rejection..."
    );
    server.close(() => {
      process.exit(1);
    });
  });
};

const init = async () => {
  await connectDatabase();
  startServer();
};

init();
