const { DataTypes, Model } = require("sequelize");

module.exports = (sequelize) => {
  class Booking extends Model {}

  Booking.init(
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
      property_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      room_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      check_in_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      check_out_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      num_adults: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
      },
      num_children: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },
      num_rooms: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
      },

      festgo_coins_used: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
      },
      coins_discount_value: {
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
      reciept: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      gst_amount: {
        type: DataTypes.DOUBLE,
        defaultValue: 0,
      },
      gst_rate: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
      },
      total_amount: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      child_charges: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
      },
      extra_child_charges: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
      },
      service_fee: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
      },
      zero_booking: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      amount_paid: {
        type: DataTypes.FLOAT,
        allowNull: false,
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
      payment_method: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      transaction_id: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      gst_number: {
        type: DataTypes.STRING(15),
        allowNull: true,
      },
      gst_company_name: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      gst_company_address: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: "Booking",
      tableName: "bookings",
      timestamps: true,
    }
  );

  return Booking;
};
