const FormData = require("form-data");
const Mailgun = require("mailgun.js");
const dotenv = require("dotenv");
const path = require("path");

// Load environment variables
dotenv.config({ path: path.resolve("./config/config.env") });

// Initialize Mailgun client once
const mailgun = new Mailgun(FormData);
const mg = mailgun.client({
  username: "api",
  key: process.env.MAIL_GUN_API,
});

/**
 * Sends an email using Mailgun.
 *
 * @param {string} toEmail - Recipient email address.
 * @param {string} subject - Email subject.
 * @param {string} htmlBody - HTML content of the email.
 */
const SendEmail = async (toEmail, subject, htmlBody) => {
  try {
    console.log(toEmail);
    const data = await mg.messages.create("festgo.in", {
      from: "Festgo <info@festgo.in>",
      to: [toEmail],
      subject: subject,
      html: htmlBody,
    });

    console.log("✅ Email sent successfully:", data);
    return data;
  } catch (error) {
    console.error("❌ Error sending email:", error);
    throw error;
  }
};

module.exports = SendEmail;
