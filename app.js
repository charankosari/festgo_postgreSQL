const express = require("express");
const app = express();
const merchant = require("./routes/merchantRouter");
const upload = require("./routes/uploadRouter");
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
app.use('/api/admin', admin);
app.use("/api/upload", upload);
app.use(errorMiddleware);

module.exports = app;
