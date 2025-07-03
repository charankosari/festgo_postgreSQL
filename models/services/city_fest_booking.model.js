const { DataTypes, Model } = require("sequelize");

module.exports = (sequelize) => {
  class CityFestBooking extends Model {}

  CityFestBooking.init(
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

      cityfest_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },

      city_fest_category_id: {
        type: DataTypes.UUID,
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

      service_fee: {
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
      modelName: "CityFestBooking",
      tableName: "cityfest_bookings",
      timestamps: true,
    }
  );

  return CityFestBooking;
};
