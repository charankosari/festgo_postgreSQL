const { validateSignature } = require("./razorpay");
const dotenv = require("dotenv");
const path = require("path");

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

    console.log("Webhook Received", { event: req.body.event, is_valid });

    if (!is_valid) {
      return res.status(400).json({ message: "Invalid signature" });
    }

    const webhook_payload = req.body;

    switch (webhook_payload.event) {
      case "payment.authorized":
        console.log("✅ Payment Authorized");
        break;

      case "payment.failed":
        console.log("❌ Payment Failed");
        break;

      case "payment.captured":
        console.log("✅ Payment Captured");
        break;

      default:
        console.log("Unhandled event:", webhook_payload.event);
        break;
    }

    res.status(200).json({ message: "Webhook processed successfully" });
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = captureHook;
