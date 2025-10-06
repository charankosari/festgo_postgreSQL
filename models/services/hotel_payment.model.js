const { DataTypes, Model } = require("sequelize");

module.exports = (sequelize) => {
  class HotelPayment extends Model {}

  HotelPayment.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      bookingId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: "bookings",
          key: "id",
        },
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      propertyId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      checkInDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      checkOutDate: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      numAdults: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      numChildren: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      numRooms: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      amountPaid: {
        type: DataTypes.FLOAT,
        allowNull: false,
        comment: "Total amount paid by customer",
      },
      transactionId: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Payment transaction ID",
      },
      tds: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
        comment: "Tax Deducted at Source amount",
      },
      gst: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
        comment: "GST amount",
      },
      commission: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
        comment: "Commission amount to be deducted",
      },
      netAmount: {
        type: DataTypes.FLOAT,
        allowNull: false,
        comment:
          "Final amount to be paid to hotel (amountPaid - commission - tds - gst)",
      },
      status: {
        type: DataTypes.ENUM("paid", "unpaid"),
        allowNull: false,
        defaultValue: "unpaid",
      },
      paymentDate: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: "Date when payment was made to hotel",
      },
      paymentReference: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: "Reference number for hotel payment",
      },
    },
    {
      sequelize,
      modelName: "HotelPayment",
      tableName: "hotel_payments",
      timestamps: true,
    }
  );

  return HotelPayment;
};
