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
