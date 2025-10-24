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
const TripRoutes = require("./routes/trip.routes");
const tripsBookingRoutes = require("./routes/trips_booking.routes");
const offerRoutes = require("./routes/offers.routes");
const hotelRoutes = require("./routes/hotel.routes");
const homescreenBannerRoutes = require("./routes/homescreenbanner.routes");
const errorMiddleware = require("./middlewares/error");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const accessLogStream = fs.createWriteStream(
  path.join(__dirname, "logs", "access.log"), // logs/access.log
  { flags: "a" } // 'a' means append mode
);

require("./cron");
app.use(cors({ credentials: true, origin: true }));
app.use(cookieParser());
app.use(logger("tiny", { stream: accessLogStream })); // Save to file
app.use(logger("tiny")); // Optional: also log to console
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
app.use("/api/trips", TripRoutes);
app.use("/api/trips-booking", tripsBookingRoutes);
app.use("/api/offers", offerRoutes);
app.use("/api/property", hotelRoutes);
app.use("/api/upload", upload);
app.use("/api/property-booking", propertyBookingRoutes);
app.use("/api/beachfest-booking", beachfestBookingRoutes);
app.use("/api/cityfest-booking", cityfestBookingRoutes);
app.use("/api/homescreen-banner", homescreenBannerRoutes);
app.post("/api/payment/hook", captureHook);
app.use(errorMiddleware);

module.exports = app;
