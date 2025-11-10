const express = require("express");
const router = express.Router();
const adminController = require("../controllers/admin.controller");
const propertyController = require("../controllers/property.controller");
const beachfestController = require("../controllers/beachfest.controller");
const { isAuthorized, authorizedRoles } = require("../middlewares/auth");
// ✅ Get all vendors
router.get(
  "/vendors",
  isAuthorized,
  authorizedRoles("admin"),
  adminController.getAllVendors
);

// ✅ Get vendor by ID
router.get(
  "/vendors/:id",
  isAuthorized,
  authorizedRoles("admin"),
  adminController.getVendorById
);

// ✅ Authorize vendor
router.put(
  "/property/:id/authorize",
  isAuthorized,
  authorizedRoles("admin"),
  adminController.authorizeProperty
);
// ✅ De-authorize vendor
router.put(
  "/property/:id/deauthorize",
  isAuthorized,
  authorizedRoles("admin"),
  adminController.deauthorizeProperty
);
router.get(
  "/property/:vendorId/",
  isAuthorized,
  authorizedRoles("admin"),
  propertyController.getPropertiesByVendor
);

// ✅ Edit Property Direct (PUT /property/:id/edit)
router.get(
  "/property/:id/get-plain",
  isAuthorized,
  authorizedRoles("admin"),
  propertyController.getPlainProperty
);
router.put(
  "/property/:id/edit",
  isAuthorized,
  authorizedRoles("admin"),
  propertyController.editPropertyDirect
);

// ✅ Get All Plain Rooms by Property ID
router.get(
  "/rooms/:propertyId/plain",
  isAuthorized,
  authorizedRoles("admin"),
  propertyController.getAPlainRoomData
);

// ✅ Edit Room Direct (PUT /room/:id/edit)
router.put(
  "/rooms/:id/edit",
  isAuthorized,
  authorizedRoles("admin"),
  propertyController.editRoomDirect
);

// ✅ Delete vendor
router.delete(
  "/vendors/:id",
  isAuthorized,
  authorizedRoles("admin"),
  adminController.deleteVendor
);

router.post(
  "/coin-setting",
  isAuthorized,
  authorizedRoles("admin"),
  adminController.createFestgoCoinSettings
);
router.get(
  "/coin-setting",
  isAuthorized,
  authorizedRoles("admin"),
  adminController.getAllCoinSettings
);

router.post(
  "/usage-limits",
  isAuthorized,
  authorizedRoles("admin"),
  adminController.upsertCoinUsageLimit
);
router.get(
  "/usage-limits",
  isAuthorized,
  authorizedRoles("admin"),
  adminController.getCoinUsageLimit
);
router.post(
  "/events/:eventId",
  isAuthorized,
  authorizedRoles("admin"),
  adminController.updateEventStatus
);
router.post(
  "/festbite/:festbiteId",
  isAuthorized,
  authorizedRoles("admin"),
  adminController.updateFestbiteStatus
);
router.get(
  "/beach-fests",
  isAuthorized,
  authorizedRoles("admin"),
  beachfestController.getAllBeachFestsForAdmin
);
router.post(
  "/planmytrips/:tripId",
  isAuthorized,
  authorizedRoles("admin"),
  adminController.updateTripStatus
);
router.post(
  "/commission",
  isAuthorized,
  authorizedRoles("admin"),
  adminController.upsertCommission
);
router.get(
  "/commission",
  isAuthorized,
  authorizedRoles("admin"),
  adminController.getCommission
);

// ✅ Hotel Payment Routes
router.get(
  "/property-payments/unpaid",
  isAuthorized,
  authorizedRoles("admin"),
  adminController.getUnpaidHotelPayments
);
router.get(
  "/property-payments/paid",
  isAuthorized,
  authorizedRoles("admin"),
  adminController.getPaidHotelPayments
);
router.get(
  "/property-payments/export/unpaid",
  isAuthorized,
  authorizedRoles("admin"),
  adminController.exportUnpaidHotelPayments
);
router.get(
  "/property-payments/export/paid",
  isAuthorized,
  authorizedRoles("admin"),
  adminController.exportPaidHotelPayments
);
router.post(
  "/property-payments/mark-paid",
  isAuthorized,
  authorizedRoles("admin"),
  adminController.markBookingsAsPaid
);
router.get(
  "/merchant/property-bookings/:id",
  isAuthorized,
  authorizedRoles("admin"),
  adminController.getMerchantPropertyBookingsForAdmin
);

// ✅ User Management Routes
router.get(
  "/users",
  isAuthorized,
  authorizedRoles("admin"),
  adminController.getAllUsers
);
router.get(
  "/users/:userId/coins",
  isAuthorized,
  authorizedRoles("admin"),
  adminController.getUserCoinsAndHistory
);

module.exports = router;
