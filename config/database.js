const mongoose = require("mongoose");

const connectDatabase = () => {
  mongoose
    .connect("mongodb://localhost:27017")
    .then((data) =>
      console.log(`database is connected at server:${data.connection.host}`)
    )
    .catch((err) => console.log("error while connecting to database"));
};

module.exports = connectDatabase;
