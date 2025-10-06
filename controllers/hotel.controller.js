const {
  Property,
  HotelPayment,
  property_booking,
} = require("../models/services");
const { Op } = require("sequelize");

// ✅ Get Unpaid Hotel Payments for specific hotel (vendor)
exports.getUnpaidHotelPayments = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const vendorId = req.user.id; // Get vendor ID from authenticated user

    // Build where clause for property_bookings
    let bookingWhereClause = {
      payment_status: "paid", // Only confirmed paid bookings
      booking_status: { [Op.in]: ["confirmed", "completed"] }, // Only confirmed/completed bookings
    };

    // Get all paid bookings from property_bookings for this vendor's properties
    const allPaidBookings = await property_booking.findAll({
      where: bookingWhereClause,
      include: [
        {
          model: Property,
          as: "property",
          where: { vendorId: vendorId }, // Filter by vendor's properties
          attributes: ["name", "email", "mobile_number"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    // Get all booking IDs that are already in hotel_payments (already paid to hotels)
    const paidBookingIds = await HotelPayment.findAll({
      attributes: ["bookingId"],
      raw: true,
    });
    const paidBookingIdSet = new Set(
      paidBookingIds.map((item) => item.bookingId)
    );

    // Filter out bookings that are already paid to hotels
    const unpaidBookings = allPaidBookings.filter(
      (booking) => !paidBookingIdSet.has(booking.id)
    );

    // Apply pagination
    const totalUnpaid = unpaidBookings.length;
    const paginatedUnpaid = unpaidBookings.slice(
      offset,
      offset + parseInt(limit)
    );

    // Transform data to match expected format
    const formattedUnpaid = paginatedUnpaid.map((booking) => ({
      id: booking.id,
      bookingId: booking.id,
      userId: booking.user_id,
      propertyId: booking.property_id,
      checkInDate: booking.check_in_date,
      checkOutDate: booking.check_out_date,
      numAdults: booking.num_adults,
      numChildren: booking.num_children,
      numRooms: booking.num_rooms,
      amountPaid: booking.amount_paid,
      transactionId: booking.transaction_id,
      property: booking.property,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
    }));

    return res.status(200).json({
      success: true,
      data: formattedUnpaid,
      pagination: {
        total: totalUnpaid,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalUnpaid / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching unpaid hotel payments:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// ✅ Get Paid Hotel Payments for specific hotel (vendor)
exports.getPaidHotelPayments = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const vendorId = req.user.id; // Get vendor ID from authenticated user

    const paidPayments = await HotelPayment.findAndCountAll({
      include: [
        {
          model: Property,
          as: "property",
          where: { vendorId: vendorId }, // Filter by vendor's properties
          attributes: ["name", "email", "mobile_number"],
        },
      ],
      order: [["paymentDate", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    return res.status(200).json({
      success: true,
      data: paidPayments.rows,
      pagination: {
        total: paidPayments.count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(paidPayments.count / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching paid hotel payments:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// ✅ Get Hotel Payment Summary
exports.getHotelPaymentSummary = async (req, res) => {
  try {
    const vendorId = req.user.id; // Get vendor ID from authenticated user

    // Get unpaid bookings count
    const allPaidBookings = await property_booking.findAll({
      where: {
        payment_status: "paid",
        booking_status: { [Op.in]: ["confirmed", "completed"] },
      },
      include: [
        {
          model: Property,
          as: "property",
          where: { vendorId: vendorId },
          attributes: ["id"],
        },
      ],
    });

    const paidBookingIds = await HotelPayment.findAll({
      attributes: ["bookingId"],
      raw: true,
    });
    const paidBookingIdSet = new Set(
      paidBookingIds.map((item) => item.bookingId)
    );

    const unpaidBookings = allPaidBookings.filter(
      (booking) => !paidBookingIdSet.has(booking.id)
    );

    // Get paid bookings count
    const paidBookings = await HotelPayment.findAndCountAll({
      include: [
        {
          model: Property,
          as: "property",
          where: { vendorId: vendorId },
          attributes: ["id"],
        },
      ],
    });

    // Calculate totals
    const unpaidTotal = unpaidBookings.reduce(
      (sum, booking) => sum + booking.amount_paid,
      0
    );
    const paidTotal = paidBookings.rows.reduce(
      (sum, payment) => sum + payment.netAmount,
      0
    );

    return res.status(200).json({
      success: true,
      data: {
        unpaid: {
          count: unpaidBookings.length,
          totalAmount: unpaidTotal,
        },
        paid: {
          count: paidBookings.count,
          totalAmount: paidTotal,
        },
        summary: {
          totalBookings: unpaidBookings.length + paidBookings.count,
          totalRevenue: unpaidTotal + paidTotal,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching hotel payment summary:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
