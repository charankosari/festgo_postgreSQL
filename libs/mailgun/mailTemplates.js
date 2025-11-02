exports.otpTemplate = (username, otp) => {
  return `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8" />
      <title>Your OTP Code</title>
    </head>
    <body style="margin:0; padding:0; background-color:#f4f4f4;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f4f4f4">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="margin:20px 0; padding:20px; border-radius:8px;">
              <tr>
                <td align="center" style="padding: 20px 0;">
                  <h1 style="font-family:Arial, sans-serif; color:#333333; margin:0;">Festgo</h1>
                </td>
              </tr>

              <tr>
                <td style="padding: 20px; font-family:Arial, sans-serif; color:#333333; font-size:16px;">
                  <p>Hi <strong>${username}</strong>,</p>
                  <p>Your One Time Password (OTP) is:</p>

                  <table cellpadding="0" cellspacing="0" border="0" align="center" style="margin:20px auto;">
                    <tr>
                      <td bgcolor="#4CAF50" style="color:#ffffff; padding:15px 30px; font-size:24px; font-family:Arial, sans-serif; border-radius:4px; text-align:center;">
                        ${otp}
                      </td>
                    </tr>
                  </table>

                  <p>This OTP is valid for the next 10 minutes. Please do not share it with anyone.</p>

                  <p style="margin-top:30px;">Thank you,<br/><strong>Festgo Team</strong></p>
                </td>
              </tr>

              <tr>
                <td align="center" style="padding: 20px; font-family:Arial, sans-serif; color:#aaaaaa; font-size:12px;">
                  © 2025 Festgo. All rights reserved.
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>`;
};

exports.changePasswordTemplate = (username, link) => {
  return `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8" />
      <title>Reset Your Password</title>
    </head>
    <body style="margin:0; padding:0; background-color:#f4f4f4;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f4f4f4">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="margin:20px 0; padding:20px; border-radius:8px;">
              <tr>
                <td align="center" style="padding: 20px 0;">
                  <h1 style="font-family:Arial, sans-serif; color:#333333; margin:0;">Festgo</h1>
                </td>
              </tr>

              <tr>
                <td style="padding: 20px; font-family:Arial, sans-serif; color:#333333; font-size:16px;">
                  <p>Hi <strong>${username}</strong>,</p>
                  <p>We received a request to reset your password. Click the button below to set a new password:</p>

                  <table cellpadding="0" cellspacing="0" border="0" align="center" style="margin:30px auto;">
                    <tr>
                      <td bgcolor="#4CAF50" style="padding:15px 30px; border-radius:4px; text-align:center;">
                        <a href="${link}" target="_blank" style="color:#ffffff; text-decoration:none; font-size:18px; font-family:Arial, sans-serif;">Reset Password</a>
                      </td>
                    </tr>
                  </table>

                  <p>If you did not request a password reset, please ignore this email. This link will expire in 10 minutes for your security.</p>

                  <p style="margin-top:30px;">Thank you,<br/><strong>Festgo Team</strong></p>
                </td>
              </tr>

              <tr>
                <td align="center" style="padding: 20px; font-family:Arial, sans-serif; color:#aaaaaa; font-size:12px;">
                  © 2025 Festgo. All rights reserved.
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>`;
};
exports.SignupEmail = (verificationLink) => {
  return `
    <div style="font-family: 'Segoe UI', sans-serif; padding: 24px; background-color: #f4f4f4;">
      <div style="max-width: 600px; margin: auto; background: #ffffff; padding: 32px; border-radius: 10px; box-shadow: 0 2px 6px rgba(0,0,0,0.08);">
        <h2 style="color: #222; text-align: center; margin-bottom: 20px;">FestGo Login Verification 🔐</h2>
        <p style="font-size: 16px; color: #555; line-height: 1.6; text-align: center;">
          You requested to log in to your FestGo account. Click the button below to verify and login:
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationLink}"
             style="background-color: #ff4500; color: #ffffff; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-size: 16px; display: inline-block;">
            Verify and Login
          </a>
        </div>
        <p style="font-size: 14px; color: #888; text-align: center;">
          This link is valid for the next 10 minutes. If you didn't initiate this login, you can safely ignore this email.
        </p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 32px 0;" />
        <p style="font-size: 12px; color: #aaa; text-align: center;">
          &copy; ${new Date().getFullYear()} FestGo. All rights reserved.
        </p>
      </div>
    </div>
  `;
};

// Booking Confirmation Email for User
exports.bookingConfirmationUser = (
  userName,
  userEmail,
  userNumber,
  propertyName,
  propertyLocation,
  checkInDate,
  checkOutDate
) => {
  return `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8" />
      <title>Booking Confirmation</title>
    </head>
    <body style="margin:0; padding:0; background-color:#f4f4f4;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f4f4f4">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="margin:20px 0; padding:20px; border-radius:8px;">
              <tr>
                <td align="center" style="padding: 20px 0;">
                  <h1 style="font-family:Arial, sans-serif; color:#333333; margin:0;">Festgo</h1>
                </td>
              </tr>

              <tr>
                <td style="padding: 20px; font-family:Arial, sans-serif; color:#333333; font-size:16px;">
                  <p>Hi <strong>${userName}</strong>,</p>
                  <p>Your booking has been confirmed! Here are the details:</p>

                  <table cellpadding="0" cellspacing="0" border="0" style="margin:20px 0; width:100%;">
                    <tr>
                      <td style="padding:10px; background-color:#f8f9fa; border-left:4px solid #4CAF50; font-weight:bold;">Property</td>
                      <td style="padding:10px; background-color:#f8f9fa;">${propertyName}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px; background-color:#ffffff; border-left:4px solid #4CAF50; font-weight:bold;">Location</td>
                      <td style="padding:10px; background-color:#ffffff;">${propertyLocation}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px; background-color:#f8f9fa; border-left:4px solid #4CAF50; font-weight:bold;">Check-in Date</td>
                      <td style="padding:10px; background-color:#f8f9fa;">${checkInDate}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px; background-color:#ffffff; border-left:4px solid #4CAF50; font-weight:bold;">Check-out Date</td>
                      <td style="padding:10px; background-color:#ffffff;">${checkOutDate}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px; background-color:#f8f9fa; border-left:4px solid #4CAF50; font-weight:bold;">Email</td>
                      <td style="padding:10px; background-color:#f8f9fa;">${userEmail}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px; background-color:#ffffff; border-left:4px solid #4CAF50; font-weight:bold;">Phone</td>
                      <td style="padding:10px; background-color:#ffffff;">${userNumber}</td>
                    </tr>
                  </table>

                  <p style="margin-top:30px;">Thank you for choosing Festgo!</p>
                  <p><strong>Festgo Team</strong></p>
                </td>
              </tr>

              <tr>
                <td align="center" style="padding: 20px; font-family:Arial, sans-serif; color:#aaaaaa; font-size:12px;">
                  © 2025 Festgo. All rights reserved.
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>`;
};

// Booking Notification Email for Vendor
exports.bookingNotificationVendor = (
  userName,
  userEmail,
  userNumber,
  checkInDate,
  checkOutDate,
  propertyName,
  propertyLocation
) => {
  return `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8" />
      <title>New Booking Notification</title>
    </head>
    <body style="margin:0; padding:0; background-color:#f4f4f4;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f4f4f4">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="margin:20px 0; padding:20px; border-radius:8px;">
              <tr>
                <td align="center" style="padding: 20px 0;">
                  <h1 style="font-family:Arial, sans-serif; color:#333333; margin:0;">Festgo Vendor</h1>
                </td>
              </tr>

              <tr>
                <td style="padding: 20px; font-family:Arial, sans-serif; color:#333333; font-size:16px;">
                  <p>A new booking has been made for your property. Here are the details:</p>

                  <table cellpadding="0" cellspacing="0" border="0" style="margin:20px 0; width:100%;">
                    <tr>
                      <td style="padding:10px; background-color:#f8f9fa; border-left:4px solid #4CAF50; font-weight:bold;">Property Name</td>
                      <td style="padding:10px; background-color:#f8f9fa;">${propertyName}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px; background-color:#ffffff; border-left:4px solid #4CAF50; font-weight:bold;">Property Location</td>
                      <td style="padding:10px; background-color:#ffffff;">${propertyLocation}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px; background-color:#f8f9fa; border-left:4px solid #4CAF50; font-weight:bold;">Customer Name</td>
                      <td style="padding:10px; background-color:#f8f9fa;">${userName}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px; background-color:#ffffff; border-left:4px solid #4CAF50; font-weight:bold;">Email</td>
                      <td style="padding:10px; background-color:#ffffff;">${userEmail}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px; background-color:#f8f9fa; border-left:4px solid #4CAF50; font-weight:bold;">Phone</td>
                      <td style="padding:10px; background-color:#f8f9fa;">${userNumber}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px; background-color:#ffffff; border-left:4px solid #4CAF50; font-weight:bold;">Check-in Date</td>
                      <td style="padding:10px; background-color:#ffffff;">${checkInDate}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px; background-color:#f8f9fa; border-left:4px solid #4CAF50; font-weight:bold;">Check-out Date</td>
                      <td style="padding:10px; background-color:#f8f9fa;">${checkOutDate}</td>
                    </tr>
                  </table>

                  <p style="margin-top:30px;">Please prepare your property for the guest's arrival.</p>
                  <p><strong>Festgo Team</strong></p>
                </td>
              </tr>

              <tr>
                <td align="center" style="padding: 20px; font-family:Arial, sans-serif; color:#aaaaaa; font-size:12px;">
                  © 2025 Festgo. All rights reserved.
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>`;
};

// Checkout Email for User
exports.checkoutUser = (
  userName,
  checkInDate,
  checkOutDate,
  userEmail,
  propertyName,
  propertyLocation
) => {
  return `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8" />
      <title>Checkout Confirmation</title>
    </head>
    <body style="margin:0; padding:0; background-color:#f4f4f4;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f4f4f4">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="margin:20px 0; padding:20px; border-radius:8px;">
              <tr>
                <td align="center" style="padding: 20px 0;">
                  <h1 style="font-family:Arial, sans-serif; color:#333333; margin:0;">Festgo</h1>
                </td>
              </tr>

              <tr>
                <td style="padding: 20px; font-family:Arial, sans-serif; color:#333333; font-size:16px;">
                  <p>Hi <strong>${userName}</strong>,</p>
                  <p>Thank you for staying with us! Your checkout has been confirmed.</p>

                  <table cellpadding="0" cellspacing="0" border="0" style="margin:20px 0; width:100%;">
                    <tr>
                      <td style="padding:10px; background-color:#f8f9fa; border-left:4px solid #4CAF50; font-weight:bold;">Property</td>
                      <td style="padding:10px; background-color:#f8f9fa;">${propertyName}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px; background-color:#ffffff; border-left:4px solid #4CAF50; font-weight:bold;">Location</td>
                      <td style="padding:10px; background-color:#ffffff;">${propertyLocation}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px; background-color:#f8f9fa; border-left:4px solid #4CAF50; font-weight:bold;">Check-in Date</td>
                      <td style="padding:10px; background-color:#f8f9fa;">${checkInDate}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px; background-color:#ffffff; border-left:4px solid #4CAF50; font-weight:bold;">Check-out Date</td>
                      <td style="padding:10px; background-color:#ffffff;">${checkOutDate}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px; background-color:#f8f9fa; border-left:4px solid #4CAF50; font-weight:bold;">Email</td>
                      <td style="padding:10px; background-color:#f8f9fa;">${userEmail}</td>
                    </tr>
                  </table>

                  <p style="margin-top:30px;">We hope you had a wonderful stay! We look forward to welcoming you back soon.</p>
                  <p><strong>Festgo Team</strong></p>
                </td>
              </tr>

              <tr>
                <td align="center" style="padding: 20px; font-family:Arial, sans-serif; color:#aaaaaa; font-size:12px;">
                  © 2025 Festgo. All rights reserved.
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>`;
};

// Checkout Notification Email for Vendor
exports.checkoutNotificationVendor = (
  userName,
  checkInDate,
  checkOutDate,
  userEmail,
  userNumber,
  propertyName,
  propertyLocation
) => {
  return `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8" />
      <title>Checkout Notification</title>
    </head>
    <body style="margin:0; padding:0; background-color:#f4f4f4;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f4f4f4">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="margin:20px 0; padding:20px; border-radius:8px;">
              <tr>
                <td align="center" style="padding: 20px 0;">
                  <h1 style="font-family:Arial, sans-serif; color:#333333; margin:0;">Festgo Vendor</h1>
                </td>
              </tr>

              <tr>
                <td style="padding: 20px; font-family:Arial, sans-serif; color:#333333; font-size:16px;">
                  <p>A customer has checked out from your property. Here are the details:</p>

                  <table cellpadding="0" cellspacing="0" border="0" style="margin:20px 0; width:100%;">
                    <tr>
                      <td style="padding:10px; background-color:#f8f9fa; border-left:4px solid #FF6B35; font-weight:bold;">Property Name</td>
                      <td style="padding:10px; background-color:#f8f9fa;">${propertyName}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px; background-color:#ffffff; border-left:4px solid #FF6B35; font-weight:bold;">Property Location</td>
                      <td style="padding:10px; background-color:#ffffff;">${propertyLocation}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px; background-color:#f8f9fa; border-left:4px solid #FF6B35; font-weight:bold;">Customer Name</td>
                      <td style="padding:10px; background-color:#f8f9fa;">${userName}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px; background-color:#ffffff; border-left:4px solid #FF6B35; font-weight:bold;">Email</td>
                      <td style="padding:10px; background-color:#ffffff;">${userEmail}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px; background-color:#f8f9fa; border-left:4px solid #FF6B35; font-weight:bold;">Phone</td>
                      <td style="padding:10px; background-color:#f8f9fa;">${userNumber}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px; background-color:#ffffff; border-left:4px solid #FF6B35; font-weight:bold;">Check-in Date</td>
                      <td style="padding:10px; background-color:#ffffff;">${checkInDate}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px; background-color:#f8f9fa; border-left:4px solid #FF6B35; font-weight:bold;">Check-out Date</td>
                      <td style="padding:10px; background-color:#f8f9fa;">${checkOutDate}</td>
                    </tr>
                  </table>

                  <p style="margin-top:30px;">Please prepare for settlement processing.</p>
                  <p><strong>Festgo Team</strong></p>
                </td>
              </tr>

              <tr>
                <td align="center" style="padding: 20px; font-family:Arial, sans-serif; color:#aaaaaa; font-size:12px;">
                  © 2025 Festgo. All rights reserved.
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>`;
};

// Settlement Email for Admin
exports.settlementAdmin = (
  vendorName,
  vendorEmail,
  vendorNumber,
  settlementDate,
  totalAmount,
  tdsPercentage,
  tdsValue,
  gstPercentage,
  gstValue,
  amountPaid,
  totalBookings
) => {
  return `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8" />
      <title>Vendor Settlement Details</title>
    </head>
    <body style="margin:0; padding:0; background-color:#f4f4f4;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f4f4f4">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="margin:20px 0; padding:20px; border-radius:8px;">
              <tr>
                <td align="center" style="padding: 20px 0;">
                  <h1 style="font-family:Arial, sans-serif; color:#333333; margin:0;">Festgo Admin</h1>
                </td>
              </tr>

              <tr>
                <td style="padding: 20px; font-family:Arial, sans-serif; color:#333333; font-size:16px;">
                  <p>Vendor settlement details for processing:</p>

                  <table cellpadding="0" cellspacing="0" border="0" style="margin:20px 0; width:100%;">
                    <tr>
                      <td style="padding:10px; background-color:#f8f9fa; border-left:4px solid #FF6B35; font-weight:bold;">Vendor Name</td>
                      <td style="padding:10px; background-color:#f8f9fa;">${vendorName}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px; background-color:#ffffff; border-left:4px solid #FF6B35; font-weight:bold;">Vendor Email</td>
                      <td style="padding:10px; background-color:#ffffff;">${vendorEmail}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px; background-color:#f8f9fa; border-left:4px solid #FF6B35; font-weight:bold;">Vendor Phone</td>
                      <td style="padding:10px; background-color:#f8f9fa;">${vendorNumber}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px; background-color:#f8f9fa; border-left:4px solid #FF6B35; font-weight:bold;">Settlement Date</td>
                      <td style="padding:10px; background-color:#f8f9fa;">${settlementDate}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px; background-color:#ffffff; border-left:4px solid #FF6B35; font-weight:bold;">Total Bookings</td>
                      <td style="padding:10px; background-color:#ffffff;">${totalBookings}</td>
                    </tr>
                  </table>

                  <h3 style="color:#333333; margin:30px 0 15px 0; font-size:18px;">Payment Breakdown</h3>
                  <table cellpadding="0" cellspacing="0" border="0" style="margin:20px 0; width:100%;">
                    <tr>
                      <td style="padding:10px; background-color:#f8f9fa; border-left:4px solid #4CAF50; font-weight:bold;">Total Amount</td>
                      <td style="padding:10px; background-color:#f8f9fa; text-align:right; font-weight:bold;">₹${totalAmount}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px; background-color:#ffffff; border-left:4px solid #FF9800; font-weight:bold;">TDS (${tdsPercentage}%)</td>
                      <td style="padding:10px; background-color:#ffffff; text-align:right; font-weight:bold;">₹${tdsValue}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px; background-color:#f8f9fa; border-left:4px solid #2196F3; font-weight:bold;">GST (${gstPercentage}%)</td>
                      <td style="padding:10px; background-color:#f8f9fa; text-align:right; font-weight:bold;">₹${gstValue}</td>
                    </tr>
                    <tr style="border-top:2px solid #333;">
                      <td style="padding:15px; background-color:#e8f5e8; border-left:4px solid #4CAF50; font-weight:bold; font-size:18px;">Amount Paid</td>
                      <td style="padding:15px; background-color:#e8f5e8; text-align:right; font-weight:bold; font-size:18px;">₹${amountPaid}</td>
                    </tr>
                  </table>

                  <p style="margin-top:30px;">Please process the settlement payment accordingly.</p>
                  <p><strong>Festgo Admin Team</strong></p>
                </td>
              </tr>

              <tr>
                <td align="center" style="padding: 20px; font-family:Arial, sans-serif; color:#aaaaaa; font-size:12px;">
                  © 2025 Festgo. All rights reserved.
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>`;
};

// Settlement Email for Vendor
exports.settlementVendor = (
  vendorName,
  vendorEmail,
  vendorNumber,
  settlementDate,
  totalAmount,
  tdsPercentage,
  tdsValue,
  gstPercentage,
  gstValue,
  amountPaid,
  totalBookings
) => {
  return `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8" />
      <title>Settlement Payment Details</title>
    </head>
    <body style="margin:0; padding:0; background-color:#f4f4f4;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f4f4f4">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="margin:20px 0; padding:20px; border-radius:8px;">
              <tr>
                <td align="center" style="padding: 20px 0;">
                  <h1 style="font-family:Arial, sans-serif; color:#333333; margin:0;">Festgo</h1>
                </td>
              </tr>

              <tr>
                <td style="padding: 20px; font-family:Arial, sans-serif; color:#333333; font-size:16px;">
                  <p>Hi <strong>${vendorName}</strong>,</p>
                  <p>Your settlement payment has been processed. Here are the details:</p>

                  <table cellpadding="0" cellspacing="0" border="0" style="margin:20px 0; width:100%;">
                    <tr>
                      <td style="padding:10px; background-color:#f8f9fa; border-left:4px solid #4CAF50; font-weight:bold;">Vendor Name</td>
                      <td style="padding:10px; background-color:#f8f9fa;">${vendorName}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px; background-color:#ffffff; border-left:4px solid #4CAF50; font-weight:bold;">Vendor Email</td>
                      <td style="padding:10px; background-color:#ffffff;">${vendorEmail}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px; background-color:#f8f9fa; border-left:4px solid #4CAF50; font-weight:bold;">Vendor Phone</td>
                      <td style="padding:10px; background-color:#f8f9fa;">${vendorNumber}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px; background-color:#ffffff; border-left:4px solid #4CAF50; font-weight:bold;">Settlement Date</td>
                      <td style="padding:10px; background-color:#ffffff;">${settlementDate}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px; background-color:#f8f9fa; border-left:4px solid #4CAF50; font-weight:bold;">Total Bookings</td>
                      <td style="padding:10px; background-color:#f8f9fa;">${totalBookings}</td>
                    </tr>
                  </table>

                  <h3 style="color:#333333; margin:30px 0 15px 0; font-size:18px;">Payment Breakdown</h3>
                  <table cellpadding="0" cellspacing="0" border="0" style="margin:20px 0; width:100%;">
                    <tr>
                      <td style="padding:10px; background-color:#f8f9fa; border-left:4px solid #4CAF50; font-weight:bold;">Total Amount</td>
                      <td style="padding:10px; background-color:#f8f9fa; text-align:right; font-weight:bold;">₹${totalAmount}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px; background-color:#ffffff; border-left:4px solid #FF9800; font-weight:bold;">TDS (${tdsPercentage}%)</td>
                      <td style="padding:10px; background-color:#ffffff; text-align:right; font-weight:bold;">₹${tdsValue}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px; background-color:#f8f9fa; border-left:4px solid #2196F3; font-weight:bold;">GST (${gstPercentage}%)</td>
                      <td style="padding:10px; background-color:#f8f9fa; text-align:right; font-weight:bold;">₹${gstValue}</td>
                    </tr>
                    <tr style="border-top:2px solid #333;">
                      <td style="padding:15px; background-color:#e8f5e8; border-left:4px solid #4CAF50; font-weight:bold; font-size:18px;">Amount Paid</td>
                      <td style="padding:15px; background-color:#e8f5e8; text-align:right; font-weight:bold; font-size:18px;">₹${amountPaid}</td>
                    </tr>
                  </table>

                  <p style="margin-top:30px;">Thank you for being a valued partner with Festgo!</p>
                  <p><strong>Festgo Team</strong></p>
                </td>
              </tr>

              <tr>
                <td align="center" style="padding: 20px; font-family:Arial, sans-serif; color:#aaaaaa; font-size:12px;">
                  © 2025 Festgo. All rights reserved.
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>`;
};

// Event Booking Cancellation - Customer Email
exports.eventBookingCancellationCustomer = ({
  customerName,
  eventName,
  venueName,
  date,
  bookingId,
  numberOfGuests,
}) => {
  return `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8" />
      <title>Event Booking Cancelled</title>
    </head>
    <body style="margin:0; padding:0; background-color:#f4f4f4;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f4f4f4">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="margin:20px 0; padding:20px; border-radius:8px;">
              <tr>
                <td align="center" style="padding: 20px 0;">
                  <h1 style="font-family:Arial, sans-serif; color:#333333; margin:0;">FestGo 🌴</h1>
                </td>
              </tr>

              <tr>
                <td style="padding: 20px; font-family:Arial, sans-serif; color:#333333; font-size:16px;">
                  <p>Dear <strong>${customerName}</strong>,</p>
                  <p>Your event booking for <strong>${eventName}</strong> at <strong>${venueName}</strong> scheduled on <strong>${date}</strong> has been successfully cancelled.</p>

                  <table cellpadding="0" cellspacing="0" border="0" style="margin:20px 0; width:100%;">
                    <tr>
                      <td style="padding:10px; background-color:#f8f9fa; border-left:4px solid #FF6B35; font-weight:bold;">Booking ID</td>
                      <td style="padding:10px; background-color:#f8f9fa;">${bookingId}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px; background-color:#ffffff; border-left:4px solid #FF6B35; font-weight:bold;">Tickets/Guests</td>
                      <td style="padding:10px; background-color:#ffffff;">${numberOfGuests}</td>
                    </tr>
                  </table>

                  <p>If you made a payment, your refund (if applicable) will be processed within 3–5 working days to your original payment method.</p>
                  <p>We hope to see you at another exciting FestGo event soon! 🎉</p>
                  <p>Thank you for using FestGo.</p>

                  <p style="margin-top:30px;">Warm regards,<br/><strong>Team FestGo 🌴</strong></p>
                  <p style="margin-top:10px;"><a href="http://www.festgo.in" style="color:#4CAF50; text-decoration:none;">www.festgo.in</a></p>
                </td>
              </tr>

              <tr>
                <td align="center" style="padding: 20px; font-family:Arial, sans-serif; color:#aaaaaa; font-size:12px;">
                  © 2025 FestGo. All rights reserved.
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>`;
};

// Event Booking Cancellation - Organizer Email
exports.eventBookingCancellationOrganizer = ({
  organizerName,
  customerName,
  eventName,
  venueName,
  date,
  bookingId,
  numberOfGuests,
}) => {
  return `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8" />
      <title>Event Booking Cancelled - Notification</title>
    </head>
    <body style="margin:0; padding:0; background-color:#f4f4f4;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f4f4f4">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="margin:20px 0; padding:20px; border-radius:8px;">
              <tr>
                <td align="center" style="padding: 20px 0;">
                  <h1 style="font-family:Arial, sans-serif; color:#333333; margin:0;">FestGo Partner 🌴</h1>
                </td>
              </tr>

              <tr>
                <td style="padding: 20px; font-family:Arial, sans-serif; color:#333333; font-size:16px;">
                  <p>Dear <strong>${organizerName}</strong>,</p>
                  <p>Please note that <strong>${customerName}</strong> has cancelled their event booking for <strong>${eventName}</strong> at <strong>${venueName}</strong> through FestGo.</p>

                  <table cellpadding="0" cellspacing="0" border="0" style="margin:20px 0; width:100%;">
                    <tr>
                      <td style="padding:10px; background-color:#f8f9fa; border-left:4px solid #FF6B35; font-weight:bold;">📅 Date</td>
                      <td style="padding:10px; background-color:#f8f9fa;">${date}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px; background-color:#ffffff; border-left:4px solid #FF6B35; font-weight:bold;">🆔 Booking ID</td>
                      <td style="padding:10px; background-color:#ffffff;">${bookingId}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px; background-color:#f8f9fa; border-left:4px solid #FF6B35; font-weight:bold;">👥 Guests/Tickets</td>
                      <td style="padding:10px; background-color:#f8f9fa;">${numberOfGuests}</td>
                    </tr>
                  </table>

                  <p>The cancelled slots are now open for new reservations.</p>
                  <p>Please update your availability on the <strong>FestGo Partner Dashboard</strong> to receive new bookings.</p>
                  <p>Thank you for being a valued FestGo partner!</p>

                  <p style="margin-top:30px;">Best regards,<br/><strong>Team FestGo 🌴</strong></p>
                  <p style="margin-top:10px;">
                    <strong>Partner Support:</strong> <a href="mailto:support@festgo.in" style="color:#4CAF50; text-decoration:none;">support@festgo.in</a>
                  </p>
                  <p style="margin-top:5px;"><a href="http://www.festgo.in" style="color:#4CAF50; text-decoration:none;">www.festgo.in</a></p>
                </td>
              </tr>

              <tr>
                <td align="center" style="padding: 20px; font-family:Arial, sans-serif; color:#aaaaaa; font-size:12px;">
                  © 2025 FestGo. All rights reserved.
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>`;
};

// Resort Booking Cancellation - Customer Email
exports.resortBookingCancellationCustomer = ({
  customerName,
  resortName,
  date,
  bookingId,
  numberOfGuests,
}) => {
  return `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8" />
      <title>Resort Booking Cancelled</title>
    </head>
    <body style="margin:0; padding:0; background-color:#f4f4f4;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f4f4f4">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="margin:20px 0; padding:20px; border-radius:8px;">
              <tr>
                <td align="center" style="padding: 20px 0;">
                  <h1 style="font-family:Arial, sans-serif; color:#333333; margin:0;">FestGo 🌴</h1>
                </td>
              </tr>

              <tr>
                <td style="padding: 20px; font-family:Arial, sans-serif; color:#333333; font-size:16px;">
                  <p>Dear <strong>${customerName}</strong>,</p>
                  <p>Your booking at <strong>${resortName}</strong> scheduled for <strong>${date}</strong> has been successfully cancelled.</p>

                  <table cellpadding="0" cellspacing="0" border="0" style="margin:20px 0; width:100%;">
                    <tr>
                      <td style="padding:10px; background-color:#f8f9fa; border-left:4px solid #FF6B35; font-weight:bold;">Booking ID</td>
                      <td style="padding:10px; background-color:#f8f9fa;">${bookingId}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px; background-color:#ffffff; border-left:4px solid #FF6B35; font-weight:bold;">Guests</td>
                      <td style="padding:10px; background-color:#ffffff;">${numberOfGuests}</td>
                    </tr>
                  </table>

                  <p>If a payment was made, your refund (if applicable) will be processed within 3–5 working days to your original payment method.</p>
                  <p>We're sorry to miss you this time, but we hope to host you soon at another great resort or event on FestGo!</p>

                  <p style="margin-top:30px;">Warm regards,<br/><strong>Team FestGo 🌴</strong></p>
                  <p style="margin-top:10px;"><a href="http://www.festgo.in" style="color:#4CAF50; text-decoration:none;">www.festgo.in</a></p>
                </td>
              </tr>

              <tr>
                <td align="center" style="padding: 20px; font-family:Arial, sans-serif; color:#aaaaaa; font-size:12px;">
                  © 2025 FestGo. All rights reserved.
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>`;
};

// Resort Booking Cancellation - Owner Email
exports.resortBookingCancellationOwner = ({
  ownerName,
  customerName,
  resortName,
  date,
  bookingId,
  numberOfGuests,
}) => {
  return `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8" />
      <title>Resort Booking Cancelled - Notification</title>
    </head>
    <body style="margin:0; padding:0; background-color:#f4f4f4;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f4f4f4">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="margin:20px 0; padding:20px; border-radius:8px;">
              <tr>
                <td align="center" style="padding: 20px 0;">
                  <h1 style="font-family:Arial, sans-serif; color:#333333; margin:0;">FestGo Partner 🌴</h1>
                </td>
              </tr>

              <tr>
                <td style="padding: 20px; font-family:Arial, sans-serif; color:#333333; font-size:16px;">
                  <p>Dear <strong>${ownerName}</strong>,</p>
                  <p>This is to inform you that <strong>${customerName}</strong> has cancelled their booking at <strong>${resortName}</strong> through FestGo.</p>

                  <h3 style="color:#333333; margin:20px 0 10px 0; font-size:18px;">Booking Details:</h3>
                  <table cellpadding="0" cellspacing="0" border="0" style="margin:20px 0; width:100%;">
                    <tr>
                      <td style="padding:10px; background-color:#f8f9fa; border-left:4px solid #FF6B35; font-weight:bold;">Booking ID</td>
                      <td style="padding:10px; background-color:#f8f9fa;">${bookingId}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px; background-color:#ffffff; border-left:4px solid #FF6B35; font-weight:bold;">Date</td>
                      <td style="padding:10px; background-color:#ffffff;">${date}</td>
                    </tr>
                    <tr>
                      <td style="padding:10px; background-color:#f8f9fa; border-left:4px solid #FF6B35; font-weight:bold;">Guests</td>
                      <td style="padding:10px; background-color:#f8f9fa;">${numberOfGuests}</td>
                    </tr>
                  </table>

                  <p>The booking slot is now open for new reservations.</p>
                  <p>Please update your availability on your <strong>FestGo Partner Dashboard</strong> to accept new bookings.</p>
                  <p>Thank you for your continued partnership with FestGo!</p>

                  <p style="margin-top:30px;">Best regards,<br/><strong>Team FestGo 🌴</strong></p>
                  <p style="margin-top:10px;">
                    <strong>Partner Support:</strong> <a href="mailto:support@festgo.in" style="color:#4CAF50; text-decoration:none;">support@festgo.in</a>
                  </p>
                  <p style="margin-top:5px;"><a href="http://www.festgo.in" style="color:#4CAF50; text-decoration:none;">www.festgo.in</a></p>
                </td>
              </tr>

              <tr>
                <td align="center" style="padding: 20px; font-family:Arial, sans-serif; color:#aaaaaa; font-size:12px;">
                  © 2025 FestGo. All rights reserved.
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>`;
};
