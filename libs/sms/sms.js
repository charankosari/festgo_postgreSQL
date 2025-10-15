import axios from "axios";
import querystring from "querystring";
import dotenv from "dotenv";
import path from "path";
// const loginOtp = require("./messageTemplates");
import { festGoLoginOtp } from "./messageTemplates.js";
dotenv.config({ path: path.resolve("./config/config.env") });

/**
 * Send an SMS via Distributor Bulk HTTP API
 * @param {string} to - Destination mobile number (with or without +91)
 * @param {string} message - Message text
 * @param {number} type - Message type (0=Text, 1=Flash, 2=Unicode, etc.)
 * @param {number} dlr - Delivery report required (1 or 0)
 * @returns {Promise<object>} - Response with status and API reply
 */
// export async function sendSMS(to, message, type = 0, dlr = 1) {
//   try {
//     const encodedMessage = encodeURIComponent(message);

//     const url = `http://${process.env.SMS_HOST}:${process.env.SMS_PORT}/sendsms/bulksms?username=${process.env.SMS_USERNAME}&password=${process.env.SMS_PASSWORD}&type=0&dlr=1&destination=${to}&source=${process.env.SMS_SENDER}&message=${encodedMessage}&entityid=${process.env.SMS_ENTITY_ID}&tempid=${process.env.SMS_TEMPLATE_ID}&tmid=${process.env.SMS_TMID}`;

//     const response = await axios.get(url);
//     return {
//       status: "success",
//       response: response.data,
//     };
//   } catch (error) {
//     return {
//       status: "failed",
//       error: error.message,
//     };
//   }
// }
export async function sendSMS(to, otp) {
  try {
    // Get message template (example: messageTemplates.loginOtp)
    const message = festGoLoginOtp(otp);

    const encodedMessage = encodeURIComponent(message);

    const url = `https://smslogin.co/v3/api.php?username=${process.env.SMS_USERNAME}&apikey=${process.env.SMS_API_KEY}&senderid=${process.env.SMS_SENDER_ID}&mobile=${to}&message=${encodedMessage}&templateid=${process.env.SMS_TEMPLATE_ID}`;
    console.log("SMS URL:", url); // Debugging line to check the URL
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

export async function sendCustomSMS(to, message, templateId) {
  try {
    const encodedMessage = encodeURIComponent(message);
    const tplId = templateId || process.env.SMS_TEMPLATE_ID;
    const url = `https://smslogin.co/v3/api.php?username=${process.env.SMS_USERNAME}&apikey=${process.env.SMS_API_KEY}&senderid=${process.env.SMS_SENDER_ID}&mobile=${to}&message=${encodedMessage}&templateid=${tplId}`;
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
