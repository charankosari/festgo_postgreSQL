const express = require("express");
const app = express();
const users = require("./routes/userRouter");
const amenities = require("./routes/amenity.routes");
const admin = require("./routes/admin.routes");
const room_amenity = require("./routes/room_amenity.routes");
const upload = require("./routes/uploadRouter");
const propertyRoutes = require("./routes/property.routes");
const eventRoutes = require("./routes/event.routes");
const festbiteRoutes = require("./routes/festbite.routes");
const reviewRoutes = require("./routes/review.route");
const beachfestRoutes = require("./routes/beachfest.routes");
const cityfestRoutes = require("./routes/city_fests.routes");
const captureHook = require("./libs/payments/paymentWebhook.controller");
const propertyBookingRoutes = require("./routes/property_booking.routes");
const beachfestBookingRoutes = require("./routes/beachfest_booking.routes");
const cityfestBookingRoutes = require("./routes/cityfest_booking.routes");
const ContactRoutes = require("./routes/contactMessage.routes");
const RoomRatesRoutes = require("./routes/room_rates.routes");
const offerRoutes = require("./routes/offers.routes");
const errorMiddleware = require("./middlewares/error");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const cors = require("cors");
require("./cron");
app.use(cors({ credentials: true, origin: true }));
app.use(cookieParser());
app.use(logger("tiny"));
app.use(express.json());
app.use("/api", users);
app.use("/api/update-rates", RoomRatesRoutes);
app.use("/api/contact", ContactRoutes);
app.use("/api/amenity", amenities);
app.use("/api/admin", admin);
app.use("/api/room-amenity", room_amenity);
app.use("/api/beach-fests", beachfestRoutes);
app.use("/api/city-fests", cityfestRoutes);
app.use("/api/properties", propertyRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/festbite", festbiteRoutes);
app.use("/api/offers", offerRoutes);
app.use("/api/upload", upload);
app.use("/api/property-booking", propertyBookingRoutes);
app.use("/api/beachfest-booking", beachfestBookingRoutes);
app.use("/api/cityfest-booking", cityfestBookingRoutes);
app.post("/api/payment/hook", captureHook);
app.use(errorMiddleware);

module.exports = app;
