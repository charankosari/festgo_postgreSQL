const { property_booking, Property, sequelize } = require("../models/services");
const { User, usersequel } = require("../models/users");
const { Op } = require("sequelize");
const moment = require("moment");
const sendEmail = require("../libs/mailgun/mailGun");
const {
  checkoutUser,
  checkoutNotificationVendor,
} = require("../libs/mailgun/mailTemplates");

/**
 * Sends checkout emails for bookings where checkout date is today
 */
const sendCheckoutEmails = async () => {
  console.log("🕒 Starting checkout email cron job...");

  try {
    // Get today's date in YYYY-MM-DD format
    const today = moment().format("YYYY-MM-DD");

    console.log(`📅 Checking for checkouts on: ${today}`);

    // Find all bookings where checkout date is today and status is confirmed
    const checkoutBookings = await property_booking.findAll({
      where: {
        check_out_date: today,
        booking_status: "confirmed",
        payment_status: "paid",
      },
      include: [
        {
          model: Property,
          as: "property",
          attributes: ["id", "name", "location", "vendorId"],
        },
      ],
    });

    console.log(
      `📋 Found ${checkoutBookings.length} bookings checking out today`
    );

    if (checkoutBookings.length === 0) {
      console.log("✅ No bookings to process for checkout emails");
      return;
    }

    // Process each booking
    for (const booking of checkoutBookings) {
      try {
        // Fetch user details
        const user = await User.findByPk(booking.user_id);
        const property = booking.property;

        if (!user || !property) {
          console.log(
            `⚠️ Skipping booking ${booking.id} - missing user or property data`
          );
          continue;
        }

        // Format dates for display
        const checkInDate = moment(booking.check_in_date).format("DD MMM YYYY");
        const checkOutDate = moment(booking.check_out_date).format(
          "DD MMM YYYY"
        );

        const userName =
          `${user.firstname || ""} ${user.lastname || ""}`.trim() ||
          user.username ||
          "User";

        // Send checkout email to user
        const userEmailHTML = checkoutUser(
          userName,
          checkInDate,
          checkOutDate,
          user.email || "",
          property.name || "Property",
          property.location.city || ""
        );

        await sendEmail(
          user.email,
          "Checkout Confirmation - Festgo",
          userEmailHTML
        );
        console.log(
          `📧 Checkout email sent to user: ${user.email} for booking ${booking.id}`
        );

        // Send checkout notification email to vendor
        const vendor = await User.findByPk(property.vendorId);

        if (vendor && vendor.email) {
          const vendorEmailHTML = checkoutNotificationVendor(
            userName,
            checkInDate,
            checkOutDate,
            user.email || "",
            user.number || "",
            property.name || "Property",
            property.location.city || ""
          );

          await sendEmail(
            vendor.email,
            "Customer Checkout Notification - Festgo",
            vendorEmailHTML
          );
          console.log(
            `📧 Checkout notification email sent to vendor: ${vendor.email} for booking ${booking.id}`
          );
        } else {
          console.log(
            `⚠️ Vendor not found or no email for property ${property.id}`
          );
        }
      } catch (bookingError) {
        console.error(
          `❌ Error processing booking ${booking.id}:`,
          bookingError
        );
        // Continue with next booking even if one fails
      }
    }

    console.log(
      `✅ Checkout email cron job completed. Processed ${checkoutBookings.length} bookings.`
    );
  } catch (error) {
    console.error("❌ Error in checkout email cron job:", error);
  }
};

module.exports = sendCheckoutEmails;
