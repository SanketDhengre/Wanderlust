const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync");
const { isLoggedIn } = require("../middleware.js");
const favoritesController = require("../controllers/favorites.js");

// Toggle favorite - POST /listings/:id/toggle-favorite
router.post(
  "/listings/:id/toggle-favorite",
  isLoggedIn,
  wrapAsync(favoritesController.toggleFavorite)
);

// Get user favorites - GET /favorites
router.get(
  "/favorites",
  isLoggedIn,
  wrapAsync(favoritesController.getFavorites)
);

module.exports = router;
