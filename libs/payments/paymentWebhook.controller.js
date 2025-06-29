const { validateSignature } = require("./razorpay");
const dotenv = require("dotenv");
const path = require("path");

const {
  handlePaymentSuccess,
  handlePaymentFailure,
} = require("../../controllers/property_booking.controller"); // import your handlers here
const {
  handleBeachfestPaymentFailure,
  handleBeachfestPaymentSuccess,
} = require("../../controllers/beachfests_booking.controller");
dotenv.config({ path: path.resolve("./config/config.env") });

const captureHook = async (req, res) => {
  try {
    const webhook_headers = req.headers;
    const rawPayload = JSON.stringify(req.body);
    const signature = webhook_headers["x-razorpay-signature"];

    const is_valid = validateSignature({
      webhook_signature: signature,
      webhook_secret: process.env.RAZORPAY_HOOK_SECRET,
      payload: rawPayload,
    });

    if (!is_valid) {
      return res.status(400).json({ message: "Invalid signature" });
    }

    const webhook_payload = req.body;
    const event = webhook_payload.event;

    const paymentEntity = webhook_payload.payload?.payment?.entity;

    // Extract data safely
    const paymentFor = paymentEntity?.notes?.payment_for;
    const bookingId = paymentEntity?.notes?.booking_id;
    const transactionId = paymentEntity?.id;

    console.log("Webhook Received:", { event, paymentFor, bookingId });

    // Route based on payment type
    switch (paymentFor) {
      case "property_booking":
        switch (event) {
          case "payment.captured":
            if (bookingId) {
              await handlePaymentSuccess(bookingId, transactionId);
            }
            break;

          case "payment.failed":
            if (bookingId) {
              await handlePaymentFailure(bookingId);
            }
            break;

          default:
            console.log("Unhandled event for property_booking:", event);
            break;
        }
        break;
      case "beachfest_booking":
        switch (event) {
          case "payment.captured":
            if (bookingId) {
              await handleBeachfestPaymentSuccess(bookingId, transactionId);
            }
            break;
          case "payment.failed":
            if (bookingId) {
              await handleBeachfestPaymentFailure(bookingId);
            }
            break;
          default:
            console.log("Unhandled event for beachfest_booking:", event);
            break;
        }
        break;
      default:
        console.log("Unhandled payment_for type:", paymentFor);
        break;
    }

    res.status(200).json({ message: "Webhook processed successfully" });
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = captureHook;
