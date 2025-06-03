const express = require("express");
const app = express();
const merchant = require("./routes/merchantRouter");
const errorMiddleware = require("./middlewares/error");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const cors = require("cors");
const admin = require('./routes/adminRouter');
app.use(cors({ credentials: true, origin: true }));
app.use(cookieParser());
app.use(logger("tiny"));
app.use(express.json());
app.use("/api/merchant", merchant);
app.use('/api/v1', admin);

app.use(errorMiddleware);

module.exports = app;
