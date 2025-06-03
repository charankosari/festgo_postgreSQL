const jwt = require("jsonwebtoken");
const Merchant = require("../models/merchantModel");
const errorHandler = require("../utils/errorHandler");
const asyncHandler = require("../middlewares/asynchandler");

exports.isAuthorized = asyncHandler(async (req, res, next) => {
  const headers = req.headers["authorization"];
  if (!headers) {
    return next(new errorHandler("no jwtToken provided unauthorised ", 401));
  }
  const jwtToken = headers.split(" ")[1];
  if (!jwtToken) {
    return next(new errorHandler("login to access this resource", 401));
  }
  const { id } = jwt.verify(jwtToken, process.env.jwt_secret);
  const merchant = await Merchant.findById(id);
  req.merchant = merchant;
  next();
});
exports.roleAuthorize = (...roles) => {
  return (req, res, next) => {
    const userRole = req.merchant.role;
    if (!roles.includes(userRole)) {
      return next(
        new errorHandler(
          `Role '${userRole}' is not authorized to access this resource`,
          403
        )
      );
    }
    next();
  };
};

