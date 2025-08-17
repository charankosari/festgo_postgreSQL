const { usersSequelize } = require("../../db");
const review = require("./review.model")(usersSequelize);
const User = require("./user.model")(usersSequelize);
const Wishlist = require("./wishlist.model")(usersSequelize);
const FestGoCoinHistory = require("./festgocoins_history.model")(
  usersSequelize
);
const LoginHistory = require("./Login_history.model")(usersSequelize);

const ReferralHistory = require("./referral_history.model")(usersSequelize);
const FestgoCoinTransaction = require("./festgo_coin_transaction.model")(
  usersSequelize
);
const FestgoCoinToIssue = require("./festgo_coin_to_issue.model")(
  usersSequelize
);
const UserGstDetails = require("./user_gst_details.model")(usersSequelize);
const db = {
  usersequel: usersSequelize,
  Sequelize: usersSequelize,
  User,
  review,
  Wishlist,
  LoginHistory,
  FestgoCoinTransaction,
  FestGoCoinHistory,
  ReferralHistory,
  FestgoCoinToIssue,
  UserGstDetails,
};
review.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
  onDelete: "CASCADE",
});

User.hasMany(review, {
  foreignKey: "userId",
  as: "reviews",
  onDelete: "CASCADE",
});
Wishlist.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
  onDelete: "CASCADE",
});

User.hasMany(Wishlist, {
  foreignKey: "user_id",
  as: "wishlists",
  onDelete: "CASCADE",
});
FestGoCoinHistory.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
  onDelete: "CASCADE",
});

User.hasMany(FestGoCoinHistory, {
  foreignKey: "userId",
  as: "coinHistories",
});
User.hasMany(ReferralHistory, {
  foreignKey: "referrerId",
  as: "sentReferrals",
  onDelete: "CASCADE",
});

User.hasMany(ReferralHistory, {
  foreignKey: "referredId",
  as: "receivedReferrals",
  onDelete: "CASCADE",
});

ReferralHistory.belongsTo(User, {
  foreignKey: "referrerId",
  as: "referrer",
});

ReferralHistory.belongsTo(User, {
  foreignKey: "referredId",
  as: "referred",
});
LoginHistory.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
  onDelete: "CASCADE",
});
//Cascade delete for FestgoCoinTransaction
FestgoCoinTransaction.belongsTo(User, { foreignKey: "userId", as: "user", onDelete: "CASCADE" });
User.hasMany(FestgoCoinTransaction, { foreignKey: "userId", as: "coinTransactions", onDelete: "CASCADE" });

// Cascade delete for FestgoCoinToIssue
FestgoCoinToIssue.belongsTo(User, { foreignKey: "userId", as: "user", onDelete: "CASCADE" });
User.hasMany(FestgoCoinToIssue, { foreignKey: "userId", as: "coinsToIssue", onDelete: "CASCADE" });

// Cascade delete for UserGstDetails
UserGstDetails.belongsTo(User, { foreignKey: "userId", as: "user", onDelete: "CASCADE" });
User.hasOne(UserGstDetails, { foreignKey: "userId", as: "gstDetails", onDelete: "CASCADE" });
User.hasMany(LoginHistory, {
  foreignKey: "userId",
  as: "loginHistories",
  onDelete: "CASCADE",
});

db.Sequelize.sync({ alter: true })
  .then(() => console.log("✅ Users DB models synced."))
  .catch((err) => console.error("❌ Users DB sync error:", err.message));

module.exports = db;
