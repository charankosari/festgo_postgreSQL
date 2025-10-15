// CORRECT version for messageTemplates.js

// Template 1
export const festGoLoginOtp = (otp) =>
  `Dear User, Use OTP ${otp} to log in to your FestGo account. Hurry - it's valid for only 10 minutes!`;

// Template 2
export const loginOtpTemplate = (otp) => `Dear User,
Your OTP for Login is ${otp} This OTP is valid for 3 minutes.
Please do not share OTP with anyone.
INTECH`;

// Template 3 - Property Booking Confirmation (uses params)
export const propertyBookingTemplate = ({
  name,
  propertyName,
  checkIn,
  guests,
  bookingId,
  supportPhone,
}) => `Dear ${name}, your Room booking at ${propertyName} is confirmed!
Check-in: ${checkIn} | Guests: ${guests}
Booking ID: ${bookingId}
Thank you for choosing FestGo! For queries, call ${supportPhone} or visit www.festgo.in`;

// Template 4 - Vendor Booking Alert (uses params)
export const bookingAlertVendorTemplate = ({
  vendorName,
  userName,
  propertyName,
  checkIn,
  guests,
  bookingId,
}) => `Dear ${vendorName}!
Booking Alert: ${userName} has booked a room in ${propertyName} via FestGo. Check-in: ${checkIn} | Guests: ${guests} | Booking ID: ${bookingId}
Get ready to welcome them and make their stay memorable!`;
