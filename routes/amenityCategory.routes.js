const express = require("express");
const router = express.Router();
const categoryController = require("../controllers/amenityCategory.controller");
const { isAuthorized, authorizedRoles } = require("../middlewares/auth");
router.post(
  "/",
  isAuthorized,
  authorizedRoles("admin"),
  categoryController.createCategory
);
router.get("/", categoryController.getAllCategories);
router.get("/:id", categoryController.getCategoryById);
router.put(
  "/:id",
  isAuthorized,
  authorizedRoles("admin"),
  categoryController.updateCategory
);
router.delete(
  "/:id",
  isAuthorized,
  authorizedRoles("admin"),
  categoryController.deleteCategory
);

module.exports = router;
