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
    <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f7f7f7;">
      <div style="max-width: 600px; margin: auto; background: #fff; padding: 30px; border-radius: 8px;">
        <h2 style="color: #333;">Welcome to FestGo 🎉</h2>
        <p style="font-size: 16px; color: #555;">Thanks for signing up! Click the button below to activate your account:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationLink}" 
             style="background-color: #ff4500; color: #fff; padding: 12px 24px; border-radius: 5px; text-decoration: none; font-size: 16px;">
            Activate Your FestGo Account
          </a>
        </div>
        <p style="font-size: 14px; color: #999;">This link will expire in 10 minutes. If you didn't request this, you can safely ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;" />
        <p style="font-size: 12px; color: #aaa;">&copy; ${new Date().getFullYear()} FestGo. All rights reserved.</p>
      </div>
    </div>
  `;
};
