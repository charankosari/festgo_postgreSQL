const express = require('express');
const { isAuthorized, roleAuthorize } = require('../middlewares/auth');
const adminController = require('../controllers/adminController');

const router = express.Router();

// Amenity Routes
router.route('/amenity/new').post(isAuthorized, roleAuthorize('admin'), adminController.createAmenity);
router.route('/amenities').get(isAuthorized, roleAuthorize('admin'), adminController.getAllAmenities);
router.route('/amenity/:id')
    .put(isAuthorized, roleAuthorize('admin'), adminController.updateAmenity)
    .delete(isAuthorized, roleAuthorize('admin'), adminController.deleteAmenity);

// Policy Routes
router.route('/policy/new').post(isAuthorized, roleAuthorize('admin'), adminController.createPolicy);
router.route('/policies').get(isAuthorized, roleAuthorize('admin'), adminController.getAllPolicies);
router.route('/policy/:id')
    .put(isAuthorized, roleAuthorize('admin'), adminController.updatePolicy)
    .delete(isAuthorized, roleAuthorize('admin'), adminController.deletePolicy);

// Room Amenity Routes
router.route('/roomamenity/new').post(isAuthorized, roleAuthorize('admin'), adminController.createRoomAmenity);
router.route('/roomamenities').get(isAuthorized, roleAuthorize('admin'), adminController.getAllRoomAmenities);
router.route('/roomamenity/:id')
    .put(isAuthorized, roleAuthorize('admin'), adminController.updateRoomAmenity)
    .delete(isAuthorized, roleAuthorize('admin'), adminController.deleteRoomAmenity);
// merchant management routes
router.route('/merchants').get(isAuthorized, roleAuthorize('admin'), adminController.getAllMerchants);
router.route('/merchant/:id/authorize').put(isAuthorized, roleAuthorize('admin'), adminController.authorizeMerchant);
module.exports = router;