const jwt = require("jsonwebtoken");

const sendJwt = async (user, statusCode, message, res) => {
  const jwtToken = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // only HTTPS in production
    expires: new Date(
      Date.now() + Number(process.env.COOKIE_EXPIRES) * 24 * 60 * 60 * 1000
    ),
  };

  res
    .status(statusCode)
    .cookie("jwtToken", jwtToken, options)
    .json({ success: true, message, jwtToken, user });
};

module.exports = sendJwt;
