const { DataTypes, Model } = require("sequelize");

module.exports = (sequelize) => {
  class BeachFestBooking extends Model {}

  BeachFestBooking.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },

      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      beachfest_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      type: {
        type: DataTypes.STRING, // example: 'regular', 'vip', 'group'
        allowNull: false,
      },

      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      phone: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      email: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      payment_method: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      passes: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
      },

      event_start: {
        type: DataTypes.DATE,
        allowNull: false,
      },

      event_end: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      festgo_coins_used: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },

      festgo_coin_discount: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
      },
      offer_discount: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
        allowNull: true,
      },
      coupon_code: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      service_fee: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
      },
      base_price: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
      },

      gst_fee: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
      },

      gst_percentage: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
      },

      amount_paid: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },

      transaction_id: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      payment_status: {
        type: DataTypes.ENUM(
          "pending",
          "paid",
          "failed",
          "refunded",
          "norefund"
        ),
        defaultValue: "pending",
      },

      booking_status: {
        type: DataTypes.ENUM(
          "pending",
          "confirmed",
          "cancelled",
          "completed",
          "no-show"
        ),
        defaultValue: "pending",
      },

      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "BeachFestBooking",
      tableName: "beachfests_bookings",
      timestamps: true,
    }
  );

  return BeachFestBooking;
};
