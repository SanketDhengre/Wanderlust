const express = require("express");
const wrapAsync = require("../utils/wrapAsync");
const router = express.Router();

const Listing = require("../models/listing.js");
const { isLoggedIn, isOwner, validateListing } = require("../middleware.js");

//Index Route
router.get("/", async (req, res) => {
  const allListings = await Listing.find({});
  res.render("listings/index", { allListings });
});

// New Route
router.get("/new", isLoggedIn, (req, res) => {
  res.render("listings/new");
});

//Show Route
router.get("/:id", async (req, res) => {
  const { id } = req.params;
  const listing = await Listing.findById(id)
    .populate({ path: "reviews", populate: { path: "author" } })
    .populate("owner");
  if (!listing) {
    req.flash("error", "Listing not found");
    return res.redirect("/listings");
  }

  console.log(listing);
  res.render("listings/show", { listing });
});

//Create Route
router.post(
  "/",
  validateListing,
  wrapAsync(async (req, res, next) => {
    const newListing = new Listing(req.body.listing);

    newListing.owner = req.user._id; // Set the owner to the currently logged-in user
    await newListing.save();
    req.flash("success", "New listing created successfully!");
    res.redirect("/listings");
  })
);

//Edit Route
router.get(
  "/:id/edit",
  isOwner, // Ensure the user is the owner of the listing
  isLoggedIn,
  wrapAsync(async (req, res) => {
    let { id } = req.params;
    const listing = await Listing.findById(id);
    if (!listing) {
      req.flash("error", "Listing not found");
      return res.redirect("/listings");
    }
    res.render("listings/edit", { listing });
  })
);

//Update Route
router.put(
  "/:id",
  isLoggedIn,
  isOwner, // Ensure the user is the owner of the listing
  validateListing,
  wrapAsync(async (req, res, next) => {
    const { id } = req.params;
    await Listing.findByIdAndUpdate(id, { ...req.body.listing });
    req.flash("success", "Listing updated successfully!");
    res.redirect(`/listings/${id}`);
  })
);

//Delete Route
router.delete(
  "/:id",
  isLoggedIn,
  isOwner, // Ensure the user is the owner of the listing
  wrapAsync(async (req, res) => {
    const { id } = req.params;
    await Listing.findByIdAndDelete(id);
    req.flash("success", "Listing deleted successfully!");
    res.redirect("/listings");
  })
);

module.exports = router;
