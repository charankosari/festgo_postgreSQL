const { DataTypes, Model } = require("sequelize");

module.exports = (sequelize) => {
  class TripsBooking extends Model {}

  TripsBooking.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      number: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      tripId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      startDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      endDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      numberOfPersons: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
      },

      festgo_coins_used: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
      },
      coins_discount_value: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
      },
      //   offer_discount: {
      //     type: DataTypes.FLOAT,
      //     defaultValue: 0,
      //     allowNull: true,
      //   },
      //   coupon_code: {
      //     type: DataTypes.STRING,
      //     allowNull: true,
      //   },
      reciept: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      gst_amount: {
        type: DataTypes.FLOAT,
        defaultValue: 0.0,
      },
      gst_rate: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
      },
      total_amount: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },

      service_fee: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
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
    },
    {
      sequelize,
      modelName: "TripsBooking",
      tableName: "TripsBookings",
      timestamps: true,
    }
  );

  return TripsBooking;
};
