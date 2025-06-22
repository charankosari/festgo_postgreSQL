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
      total_amount: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      festgo_coins_used: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
      },
      amount_paid: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      payment_status: {
        type: DataTypes.ENUM("pending", "paid", "failed", "refunded"),
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
