const express = require("express");
const router = express.Router();

const { isAuthorized, authorizedRoles } = require("../middlewares/auth");

// Controllers
const festbiteController = require("../controllers/festbite.controller");

// === Festbite Routes ===

// Public Create
router.post("/festbites", isAuthorized, festbiteController.createFestbite);

// Public Get All
router.get("/festbites", isAuthorized, festbiteController.getAllFestbites);

// Public Get by User
router.get(
  "/festbites/user",
  isAuthorized,
  festbiteController.getFestbitesByUser
);
router.get(
  "/get-users/:id",
  isAuthorized,
  authorizedRoles("admin"),
  festbiteController.getFestbitesForAdmin
);

// Public Get by ID
router.get("/festbites/:id", festbiteController.getFestbiteById);

// Public Update
router.put("/festbites/:id", isAuthorized, festbiteController.updateFestbite);

// admin Only Delete
router.delete(
  "/festbites/:id",
  isAuthorized,
  authorizedRoles("admin"),
  festbiteController.deleteFestbite
);

// === MenuType Routes === (admin Only)
router.post(
  "/menu-types",
  isAuthorized,
  authorizedRoles("admin"),
  festbiteController.createMenuType
);

router.get("/menu-types", festbiteController.getAllMenuTypes);

router.put(
  "/menu-types/:id",
  isAuthorized,
  authorizedRoles("admin"),
  festbiteController.updateMenuType
);

router.delete(
  "/menu-types/:id",
  isAuthorized,
  authorizedRoles("admin"),
  festbiteController.deleteMenuType
);

// === MenuItem Routes === (admin Only for Create, Update, Delete)
router.post(
  "/menu-items",
  isAuthorized,
  authorizedRoles("admin"),
  festbiteController.createMenuItem
);

router.get("/menu-items", festbiteController.getAllMenuItems);

router.get(
  "/menu-items/type/:menuTypeId",
  festbiteController.getMenuItemsByType
);

router.put(
  "/menu-items/:id",
  isAuthorized,
  authorizedRoles("admin"),
  festbiteController.updateMenuItem
);

router.delete(
  "/menu-items/:id",
  isAuthorized,
  authorizedRoles("admin"),
  festbiteController.deleteMenuItem
);

module.exports = router;
