const Listing = require("../models/listing");

const mbxGeocoding = require("@mapbox/mapbox-sdk/services/geocoding");
const mapToken = process.env.MAP_TOKEN;
const geoCodingClient = mbxGeocoding({ accessToken: mapToken });

module.exports.index = async (req, res) => {
  const allListings = await Listing.find({});
  res.render("listings/index", { allListings });
};

module.exports.renderNewForm = (req, res) => {
  res.render("listings/new");
};

module.exports.showListing = async (req, res) => {
  const { id } = req.params;
  const listing = await Listing.findById(id)
    .populate({ path: "reviews", populate: { path: "author" } })
    .populate("owner");
  if (!listing) {
    req.flash("error", "Listing not found");
    return res.redirect("/listings");
  }

  res.render("listings/show", { listing, mapToken: process.env.MAP_TOKEN });
};

module.exports.createListing = async (req, res, next) => {
  let response = await geoCodingClient
    .forwardGeocode({
      query: req.body.listing.location,
      limit: 1,
    })
    .send();

  let url = req.file.path;
  let filename = req.file.filename;
  const newListing = new Listing(req.body.listing);
  newListing.owner = req.user._id; // Set the owner to the currently logged-in user
  newListing.image = { url, filename }; // Set the image URL and filename
  newListing.geometry = response.body.features[0].geometry;
  let savedListing = await newListing.save();
  console.log(savedListing);
  req.flash("success", "New listing created successfully!");
  res.redirect("/listings");
};

module.exports.renderEditForm = async (req, res) => {
  let { id } = req.params;
  const listing = await Listing.findById(id);
  if (!listing) {
    req.flash("error", "Listing not found");
    return res.redirect("/listings");
  }

  originalImageUrl = listing.image.url; // Store the original image URL
  originalImageUrl = originalImageUrl.replace("/upload", "/upload/h_200"); // Adjust the URL for the original image size

  res.render("listings/edit", { listing, originalImageUrl });
};

module.exports.updateListing = async (req, res, next) => {
  const { id } = req.params;
  let listing = await Listing.findByIdAndUpdate(id, { ...req.body.listing });

  if (typeof req.file !== "undefined" && req.file !== null) {
    // If a new file is uploaded, update the image URL and filename
    let url = req.file.path;
    let filename = req.file.filename;
    listing.image = { url, filename }; // Update the image URL and filename
    await listing.save();
  }
  req.flash("success", "Listing updated successfully!");
  res.redirect(`/listings/${id}`);
};

module.exports.filter = async (req, res, next) => {
  let { id } = req.params;
  let allListings = await Listing.find({ category: { $all: [id] } });
  if (allListings.length != 0) {
    res.locals.success = `Listings Filtered by ${id}!`;
    res.render("listings/index.ejs", { allListings });
  } else {
    req.flash("error", `There is no any Listing for ${id}!`);
    res.redirect("/listings");
  }
};

// module.exports.search = async (req, res) => {
//   let input = req.query.q.trim().replace(/\s+/g, " ");
//   if (input == "" || input == " ") {
//     req.flash("error", "Please enter search query!");
//     res.redirect("/listings");
//   }

//   let data = input.split("");
//   let element = "";
//   let flag = false;
//   for (let index = 0; index < data.length; index++) {
//     if (index == 0 || flag) {
//       element = element + data[index].toUpperCase();
//     } else {
//       element = element + data[index].toLowerCase();
//     }
//     flag = data[index] == " ";
//   }

//   let allListings = await Listing.find({
//     title: { $regex: element, $options: "i" },
//   });
//   if (allListings.length != 0) {
//     res.locals.success = "Listings searched by Title!";
//     res.render("listings/index.ejs", { allListings });
//     return;
//   }

//   if (allListings.length == 0) {
//     allListings = await Listing.find({
//       category: { $regex: element, $options: "i" },
//     }).sort({ _id: -1 });
//     if (allListings.length != 0) {
//       res.locals.success = "Listings searched by Category!";
//       res.render("listings/index.ejs", { allListings });
//       return;
//     }
//   }
//   if (allListings.length == 0) {
//     allListings = await Listing.find({
//       country: { $regex: element, $options: "i" },
//     }).sort({ _id: -1 });
//     if (allListings.length != 0) {
//       res.locals.success = "Listings searched by Country!";
//       res.render("listings/index.ejs", { allListings });
//       return;
//     }
//   }

//   if (allListings.length == 0) {
//     allListings = await Listing.find({
//       location: { $regex: element, $options: "i" },
//     }).sort({ _id: -1 });
//     if (allListings.length != 0) {
//       res.locals.success = "Listings searched by Location!";
//       res.render("listings/index.ejs", { allListings });
//       return;
//     }
//   }

//   const intValue = parseInt(element, 10);
//   const intDec = Number.isInteger(intValue);

//   if (allListings.length == 0 && intDec) {
//     allListings = await Listing.find({ price: { $lte: element } }).sort({
//       price: 1,
//     });
//     if (allListings.length != 0) {
//       res.locals.success = `Listings searched by price less than Rs ${element}!`;
//       res.render("listings/index.ejs", { allListings });
//       return;
//     }
//   }
//   if (allListings.length == 0) {
//     req.flash("error", "No listings found based on your search!");
//     res.redirect("/listings");
//   }
// };

module.exports.search = async (req, res) => {
  let query = req.query.q; // The search term from the input field
  if (!query || query.trim() === "") {
    req.flash("error", "Please enter a search query!");
    return res.redirect("/listings");
  }

  const searchTerm = query.trim();
  const searchRegex = new RegExp(
    searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    "i"
  ); // Escape special regex characters and use case-insensitive

  let allListings = [];
  let searchMessage = "";

  // Try to parse as a number for price search
  const priceQuery = parseInt(searchTerm, 10);

  if (!isNaN(priceQuery)) {
    // If it's a number, prioritize search by price (less than or equal to)
    allListings = await Listing.find({ price: { $lte: priceQuery } }).sort({
      price: 1,
    });
    if (allListings.length > 0) {
      searchMessage = `Listings found with price less than or equal to Rs ${priceQuery}`;
    }
  }

  // If no results by price or if the query wasn't a number, search other fields
  if (allListings.length === 0) {
    allListings = await Listing.find({
      $or: [
        { title: searchRegex },
        { category: searchRegex },
        { country: searchRegex },
        { location: searchRegex },
      ],
    }).sort({ _id: -1 }); // Or any other sorting you prefer

    if (allListings.length > 0) {
      searchMessage = `Listings found matching "${searchTerm}"`;
    }
  }

  if (allListings.length === 0) {
    req.flash("error", `No listings found matching "${searchTerm}"`);
    return res.redirect("/listings");
  }

  res.locals.success = searchMessage || "Search results:"; // Provide a default message if needed
  res.render("listings/index.ejs", { allListings });
};

module.exports.destroyListing = async (req, res) => {
  const { id } = req.params;
  await Listing.findByIdAndDelete(id);
  req.flash("success", "Listing deleted successfully!");
  res.redirect("/listings");
};
