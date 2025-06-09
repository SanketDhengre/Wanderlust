const express = require("express");
const wrapAsync = require("../utils/wrapAsync");
const router = express.Router();

const Listing = require("../models/listing.js");
const { isLoggedIn, isOwner, validateListing } = require("../middleware.js");

const listingController = require("../controllers/listings.js");

//Index Route
router.get(
  "/",
  wrapAsync(listingController.index) // Use the index method from the controller
);

// New Route
router.get("/new", isLoggedIn, listingController.renderNewForm);

//Show Route
router.get("/:id", wrapAsync(listingController.showListing));

//Create Route
router.post("/", validateListing, wrapAsync(listingController.createListing));

//Edit Route
router.get(
  "/:id/edit",
  isOwner, // Ensure the user is the owner of the listing
  isLoggedIn, // Ensure the user is logged in before editing
  wrapAsync(listingController.renderEditForm)
);

//Update Route
router.put(
  "/:id",  
  isLoggedIn,// Ensure the user is logged in before updating
  isOwner, // Ensure the user is the owner of the listing
  validateListing, // Validate the listing data
  wrapAsync(listingController.updateListing)
);

//Delete Route
router.delete(
  "/:id",
  isLoggedIn, // Ensure the user is logged in before deleting
  isOwner, // Ensure the user is the owner of the listing
  wrapAsync(listingController.destroyListing)
);

module.exports = router;
