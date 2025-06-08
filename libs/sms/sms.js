import axios from "axios";
import querystring from "querystring";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve("./config/config.env") });

/**
 * Send an SMS via Distributor Bulk HTTP API
 * @param {string} to - Destination mobile number (with or without +91)
 * @param {string} message - Message text
 * @param {number} type - Message type (0=Text, 1=Flash, 2=Unicode, etc.)
 * @param {number} dlr - Delivery report required (1 or 0)
 * @returns {Promise<object>} - Response with status and API reply
 */
export async function sendSMS(to, message, type = 0, dlr = 1) {
  try {
    const formattedNumber = to.startsWith("+91") ? to : `+91${to}`;
    const encodedMessage = encodeURIComponent(message);

    const queryParams = querystring.stringify({
      username: process.env.SMS_USERNAME,
      password: process.env.SMS_PASSWORD,
      type: type,
      dlr: dlr,
      destination: formattedNumber,
      source: process.env.SMS_SENDER,
      message: encodedMessage,
    });

    const url = `http://${process.env.SMS_HOST}:${process.env.SMS_PORT}/sendsms/bulksms?${queryParams}`;

    const response = await axios.get(url);
    return {
      status: "success",
      response: response.data,
    };
  } catch (error) {
    return {
      status: "failed",
      error: error.message,
    };
  }
}
