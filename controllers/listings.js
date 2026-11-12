const Listing = require("../models/listing");
const { estimateListingPrice } = require("../utils/priceEstimator");

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
  newListing.geometry =
    response.body.features && response.body.features.length > 0
      ? response.body.features[0].geometry
      : { type: "Point", coordinates: [0, 0] };
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

  let originalImageUrl = listing.image ? listing.image.url : "";
  if (originalImageUrl && originalImageUrl.includes("/upload")) {
    originalImageUrl = originalImageUrl.replace("/upload", "/upload/h_200");
  }

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

module.exports.reserveListing = async (req, res) => {
  let { id } = req.params;
  req.flash("success", "Reservation Details sent to your Email!");
  res.redirect(`/listings/${id}`);
};

module.exports.quickView = async (req, res) => {
  const { id } = req.params;
  const listing = await Listing.findById(id).populate("owner");
  if (!listing) {
    return res.status(404).json({ error: "Listing not found" });
  }
  res.json(listing);
};

// GIS Feature A & C: Nearby Search with distance calculation ($geoNear)
module.exports.nearby = async (req, res) => {
  const { lat, lng, radius = 50, format } = req.query;

  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);
  const radiusKm = parseFloat(radius) || 50;

  if (isNaN(latitude) || isNaN(longitude)) {
    if (format === "json" || req.xhr || req.headers.accept?.includes("application/json")) {
      return res.status(400).json({ error: "Invalid coordinates provided" });
    }
    req.flash("error", "Invalid location coordinates provided!");
    return res.redirect("/listings");
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    if (format === "json" || req.xhr || req.headers.accept?.includes("application/json")) {
      return res.status(400).json({ error: "Coordinates out of bounds (-90 to 90 lat, -180 to 180 lng)" });
    }
    req.flash("error", "Coordinates out of valid geographical bounds!");
    return res.redirect("/listings");
  }

  const allListings = await Listing.aggregate([
    {
      $geoNear: {
        near: { type: "Point", coordinates: [longitude, latitude] },
        distanceField: "distance",
        distanceMultiplier: 0.001, // Convert meters to km
        maxDistance: radiusKm * 1000, // Maximum distance in meters
        spherical: true,
      },
    },
    { $sort: { distance: 1 } },
  ]);

  if (format === "json" || req.xhr || req.headers.accept?.includes("application/json")) {
    return res.json({
      listings: allListings,
      count: allListings.length,
      center: { lat: latitude, lng: longitude },
      radius: radiusKm,
    });
  }

  if (allListings.length === 0) {
    req.flash("error", `No listings found within ${radiusKm} km of your location.`);
    return res.redirect("/listings");
  }

  res.locals.success = `Found ${allListings.length} stay${allListings.length === 1 ? "" : "s"} within ${radiusKm} km!`;
  res.render("listings/index.ejs", {
    allListings,
    userLocation: { lat: latitude, lng: longitude, radius: radiusKm },
  });
};

// GIS Feature B: "Search as I move the map" (Bounding Box Viewport GIS $geoWithin)
module.exports.bbox = async (req, res) => {
  const { swLng, swLat, neLng, neLat, format } = req.query;

  const swLngNum = parseFloat(swLng);
  const swLatNum = parseFloat(swLat);
  const neLngNum = parseFloat(neLng);
  const neLatNum = parseFloat(neLat);

  if (isNaN(swLngNum) || isNaN(swLatNum) || isNaN(neLngNum) || isNaN(neLatNum)) {
    if (format === "json" || req.xhr || req.headers.accept?.includes("application/json")) {
      return res.status(400).json({ error: "Invalid bounding box coordinates" });
    }
    req.flash("error", "Invalid bounding box coordinates!");
    return res.redirect("/listings");
  }

  const allListings = await Listing.find({
    geometry: {
      $geoWithin: {
        $box: [
          [swLngNum, swLatNum],
          [neLngNum, neLatNum],
        ],
      },
    },
  });

  if (format === "json" || req.xhr || req.headers.accept?.includes("application/json")) {
    return res.json({
      listings: allListings,
      count: allListings.length,
      bbox: { swLng: swLngNum, swLat: swLatNum, neLng: neLngNum, neLat: neLatNum },
    });
  }

  res.render("listings/index.ejs", { allListings });
};

// GeoJSON API for Mapbox FeatureCollection
module.exports.getGeoJSON = async (req, res) => {
  const listings = await Listing.find({});
  const featureCollection = {
    type: "FeatureCollection",
    features: listings.map((l) => ({
      type: "Feature",
      geometry: l.geometry,
      properties: {
        id: l._id,
        title: l.title,
        price: l.price,
        location: l.location,
        country: l.country,
        image: l.image && l.image.url ? l.image.url : l.image,
        category: l.category,
        status: l.status,
      },
    })),
  };
  res.json(featureCollection);
};

// Smart Price Estimator API (Hybrid Random Forest + Spatial Neighborhood)
module.exports.estimatePrice = async (req, res) => {
  try {
    const { country, location, category, coordinates } = req.body || {};

    let resolvedCoords = null;
    if (
      Array.isArray(coordinates) &&
      coordinates.length === 2 &&
      !isNaN(coordinates[0]) &&
      !isNaN(coordinates[1]) &&
      (coordinates[0] !== 0 || coordinates[1] !== 0)
    ) {
      resolvedCoords = [parseFloat(coordinates[0]), parseFloat(coordinates[1])];
    } else if (location || country) {
      try {
        const geoQuery = [location, country].filter(Boolean).join(", ");
        const geoRes = await geoCodingClient
          .forwardGeocode({
            query: geoQuery,
            limit: 1,
          })
          .send();
        if (geoRes.body.features && geoRes.body.features.length > 0) {
          resolvedCoords = geoRes.body.features[0].geometry.coordinates;
        }
      } catch (err) {
        console.warn("Geocoding failed for price estimate:", err.message);
      }
    }

    const result = await estimateListingPrice({
      country,
      location,
      category,
      coordinates: resolvedCoords,
      ListingModel: Listing,
    });

    result.resolvedCoordinates = resolvedCoords;
    res.json(result);
  } catch (err) {
    console.error("ESTIMATE ERROR STACK:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};
