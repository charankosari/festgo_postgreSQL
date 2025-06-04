// creating token and saving cookie

const sendJwt = async (user, statusCode, message, res) => {
  const jwtToken = user.getSignedJwtToken();
  // options for cookie
  const options = {
    httpOnly: true, // Prevents client-side scripts from accessing the cookie
    secure: true, // Ensures the cookie is only sent over HTTPS in production
    expires: new Date(
      Date.now() + process.env.COOKIE_EXPIRES * 24 * 60 * 60 * 1000
    ), // Expiry date for the cookie
  };

  res
    .status(statusCode)
    .cookie("jwtToken", jwtToken, options)
    .json({ success: true, message, jwtToken, user });
};

module.exports = sendJwt;
