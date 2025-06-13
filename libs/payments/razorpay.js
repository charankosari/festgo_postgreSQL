const Razorpay = require("razorpay");
const { config } = require("../config/env");
const crypto = require("crypto");

const razorpayInstance = new Razorpay({
  key_id: config.RAZORPAY_KEY_ID,
  key_secret: config.RAZORPAY_KEY_SECRET,
});

// ✅ Create Order
const createOrder = async ({ order_id, amount }) => {
  const order = await razorpayInstance.orders.create({
    amount: Math.round(amount * 100), // convert ₹ to paise
    currency: "INR",
    receipt: "ORDER #" + Date.now(),
    notes: {
      platform_order_id: order_id,
    },
  });
  return order;
};

// ✅ Capture Payment
const capturePayment = async ({ payment_id, amount }) => {
  const payment = await razorpayInstance.payments.capture(
    payment_id,
    Math.round(amount * 100),
    "INR"
  );
  return payment;
};

// ✅ Fetch Order Status
const orderStatus = async ({ order_id }) => {
  const order = await razorpayInstance.orders.fetch(order_id);
  return order;
};

// ✅ Validate Webhook Signature
const validateSignature = ({ webhook_signature, webhook_secret, payload }) => {
  const hmac = crypto.createHmac("sha256", webhook_secret);
  hmac.update(payload);
  const generated_signature = hmac.digest("hex");
  return webhook_signature === generated_signature;
};

module.exports = {
  createOrder,
  capturePayment,
  orderStatus,
  validateSignature,
};
