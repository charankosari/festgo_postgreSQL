const jwt = require("jsonwebtoken");

exports.verifyJwtToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};
