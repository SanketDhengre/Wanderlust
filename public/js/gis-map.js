document.addEventListener("DOMContentLoaded", () => {
  const btnNearMe = document.getElementById("btnNearMe");
  const selectRadius = document.getElementById("selectRadius");
  const btnToggleMap = document.getElementById("btnToggleMap");
  const mapBtnText = document.getElementById("mapBtnText");
  const gisMapWrapper = document.getElementById("gisMapWrapper");
  const checkSearchOnMove = document.getElementById("checkSearchOnMove");
  const mapLoadingSpinner = document.getElementById("mapLoadingSpinner");
  const mapStatsBadge = document.getElementById("mapStatsBadge");
  const listingsContainer = document.getElementById("listingsContainer");

  let map = null;
  let markers = [];
  let isMapInitialized = false;

  // 1. FEATURE A: STAYS NEAR ME (HTML5 Geolocation + MongoDB $geoNear)
  if (btnNearMe) {
    btnNearMe.addEventListener("click", () => {
      if (!navigator.geolocation) {
        alert("Geolocation is not supported by your browser.");
        return;
      }

      const originalBtnHtml = btnNearMe.innerHTML;
      btnNearMe.innerHTML = `<span class="spinner-border spinner-border-sm me-1" role="status"></span> Locating...`;
      btnNearMe.disabled = true;

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const radius = selectRadius ? selectRadius.value : 50;

          // Redirect to spatial nearby endpoint
          window.location.href = `/listings/nearby?lat=${lat}&lng=${lng}&radius=${radius}`;
        },
        (error) => {
          console.warn("Geolocation error:", error);
          btnNearMe.innerHTML = originalBtnHtml;
          btnNearMe.disabled = false;
          let msg = "Could not access your location.";
          if (error.code === 1) msg = "Location permission denied. Please allow location access in your browser.";
          else if (error.code === 2) msg = "Location unavailable. Please check your network/GPS.";
          else if (error.code === 3) msg = "Location request timed out. Please try again.";
          alert(msg);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    });
  }

  // Auto reload when radius changes if already in nearby mode
  if (selectRadius) {
    selectRadius.addEventListener("change", () => {
      const urlParams = new URLSearchParams(window.location.search);
      if (window.location.pathname.includes("/nearby") || urlParams.has("lat")) {
        const lat = urlParams.get("lat");
        const lng = urlParams.get("lng");
        if (lat && lng) {
          window.location.href = `/listings/nearby?lat=${lat}&lng=${lng}&radius=${selectRadius.value}`;
        }
      }
    });
  }

  // 2. FEATURE B: INTERACTIVE MAP & "SEARCH AS I MOVE THE MAP" ($geoWithin BBox)
  if (btnToggleMap && gisMapWrapper) {
    btnToggleMap.addEventListener("click", () => {
      const isHidden = gisMapWrapper.style.display === "none";
      if (isHidden) {
        gisMapWrapper.style.display = "block";
        mapBtnText.innerText = "Hide Map";
        btnToggleMap.classList.replace("btn-dark", "btn-outline-dark");

        if (!isMapInitialized) {
          initInteractiveMap();
        } else if (map) {
          map.resize();
        }

        gisMapWrapper.scrollIntoView({ behavior: "smooth", block: "nearest" });
      } else {
        gisMapWrapper.style.display = "none";
        mapBtnText.innerText = "Show Map";
        btnToggleMap.classList.replace("btn-outline-dark", "btn-dark");
      }
    });
  }

  async function initInteractiveMap() {
    if (!window.mapboxgl) {
      console.error("Mapbox GL JS is not loaded.");
      return;
    }

    const token = typeof mapToken !== "undefined" ? mapToken : (window.mapToken || "");
    if (!token) {
      console.warn("No Mapbox token available for interactive map.");
      return;
    }

    mapboxgl.accessToken = token;

    // Center map around first listing, user location, or default
    let defaultCenter = [77.209, 28.6139]; // New Delhi
    if (typeof userCenterCoords !== "undefined" && Array.isArray(userCenterCoords)) {
      defaultCenter = userCenterCoords;
    }

    map = new mapboxgl.Map({
      container: "interactiveMap",
      style: "mapbox://styles/mapbox/streets-v12",
      center: defaultCenter,
      zoom: 3,
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    map.addControl(new mapboxgl.FullscreenControl(), "top-right");

    map.on("load", async () => {
      isMapInitialized = true;
      await loadMapMarkers();

      // Listen for pan and zoom to execute $geoWithin
      map.on("moveend", () => {
        if (checkSearchOnMove && checkSearchOnMove.checked) {
          handleMapMoveEnd();
        }
      });
    });
  }

  async function loadMapMarkers() {
    try {
      const res = await fetch("/listings/api/geojson");
      if (!res.ok) throw new Error("Failed to load listings GeoJSON");
      const data = await res.json();

      clearMarkers();

      const bounds = new mapboxgl.LngLatBounds();
      let hasValidCoords = false;

      data.features.forEach((feature) => {
        const coords = feature.geometry.coordinates;
        if (coords && coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
          bounds.extend(coords);
          hasValidCoords = true;

          // Custom price pill marker (Airbnb style)
          const el = document.createElement("div");
          el.className = "gis-map-marker";
          el.innerText = `₹${feature.properties.price ? feature.properties.price.toLocaleString("en-IN") : ""}`;
          el.dataset.id = feature.properties.id;

          const popupHtml = `
            <div class="gis-popup-card">
              <img src="${feature.properties.image}" class="gis-popup-img" alt="${feature.properties.title}">
              <div class="gis-popup-body">
                <h6 class="fw-bold mb-1 text-truncate">${feature.properties.title}</h6>
                <p class="text-muted small mb-2">${feature.properties.location}, ${feature.properties.country}</p>
                <div class="d-flex justify-content-between align-items-center">
                  <span class="fw-bold text-dark">₹${feature.properties.price.toLocaleString("en-IN")} <small class="text-muted">/night</small></span>
                  <a href="/listings/${feature.properties.id}" class="btn btn-sm btn-dark px-2 py-1" style="font-size: 0.75rem;">View</a>
                </div>
              </div>
            </div>
          `;

          const popup = new mapboxgl.Popup({ offset: 15 }).setHTML(popupHtml);

          const marker = new mapboxgl.Marker({ element: el })
            .setLngLat(coords)
            .setPopup(popup)
            .addTo(map);

          markers.push({ id: feature.properties.id, marker });
        }
      });

      if (hasValidCoords && !window.location.search.includes("lat")) {
        map.fitBounds(bounds, { padding: 50, maxZoom: 12 });
      }

      if (mapStatsBadge) {
        mapStatsBadge.innerText = `Showing ${markers.length} properties on map`;
      }
    } catch (err) {
      console.error("Error loading map markers:", err);
    }
  }

  function clearMarkers() {
    markers.forEach(({ marker }) => marker.remove());
    markers = [];
  }

  let moveTimeout = null;
  function handleMapMoveEnd() {
    if (moveTimeout) clearTimeout(moveTimeout);

    moveTimeout = setTimeout(async () => {
      if (!map) return;
      const b = map.getBounds();
      const sw = b.getSouthWest();
      const ne = b.getNorthEast();

      if (mapLoadingSpinner) mapLoadingSpinner.classList.remove("d-none");

      try {
        const url = `/listings/api/bbox?swLng=${sw.lng}&swLat=${sw.lat}&neLng=${ne.lng}&neLat=${ne.lat}&format=json`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Bbox query failed");
        const json = await res.json();

        if (mapStatsBadge) {
          mapStatsBadge.innerText = `${json.count} stays in this area`;
        }

        renderListingCards(json.listings);
      } catch (err) {
        console.error("Error updating listings for viewport:", err);
      } finally {
        if (mapLoadingSpinner) mapLoadingSpinner.classList.add("d-none");
      }
    }, 400); // Debounce by 400ms
  }

  function renderListingCards(listings) {
    if (!listingsContainer) return;

    if (listings.length === 0) {
      listingsContainer.innerHTML = `
        <div class="col-12 text-center py-5">
          <i class="fa-solid fa-map-location-dot text-muted mb-3" style="font-size: 3rem;"></i>
          <h5>No stays found in this map area</h5>
          <p class="text-muted">Try panning or zooming out to see more listings.</p>
        </div>
      `;
      return;
    }

    const cardsHtml = listings
      .map((listing) => {
        const imgSrc = listing.image && listing.image.url ? listing.image.url : listing.image;
        const formattedPrice = listing.price ? listing.price.toLocaleString("en-IN") : "";
        const badgeHtml =
          listing.status && listing.status !== "Regular"
            ? `<span class="badge listing-badge badge-${listing.status.toLowerCase()}">${listing.status}</span>`
            : "";
        const distanceHtml =
          typeof listing.distance !== "undefined" && listing.distance !== null
            ? `<span class="distance-badge position-absolute" style="bottom: 10px; left: 10px; z-index: 2;">
                 <i class="fa-solid fa-location-dot text-danger"></i> ${
                   listing.distance < 1
                     ? Math.round(listing.distance * 1000) + " m away"
                     : listing.distance.toFixed(1) + " km away"
                 }
               </span>`
            : "";

        return `
        <div class="card listing-card col fade-in-up" data-id="${listing._id}">
          ${badgeHtml}
          <div class="card-img-wrapper" style="position: relative; overflow: hidden; border-top-left-radius: 1rem; border-top-right-radius: 1rem;">
            ${distanceHtml}
            <div class="fav-icon-container">
              <div class="fav-btn" data-id="${listing._id}">
                <i class="fa-regular fa-heart"></i>
              </div>
            </div>
            <img src="${imgSrc}" class="card-img-top" alt="listing_image" style="height: 20rem; object-fit: cover;" />
            <div class="card-image-overlay">
              <div class="overlay-content">
                <h6 class="overlay-title">${listing.title}</h6>
                <p class="overlay-price">&#8377;${formattedPrice} /night</p>
                <button class="btn btn-light btn-sm quick-view-btn"
                  data-id="${listing._id}"
                  data-title="${listing.title}"
                  data-price="${listing.price}"
                  data-image="${imgSrc}"
                  data-location="${listing.location}, ${listing.country}">
                  <i class="fa-solid fa-eye"></i> Quick View
                </button>
              </div>
            </div>
          </div>
          <div class="card-body">
            <p class="card-text">
              <b>
                <a href="/listings/${listing._id}" class="stretched-link text-decoration-none text-dark">
                  ${listing.title}
                </a>
              </b><br />
              &#8377;${formattedPrice} /night
              <i class="tax-info">&nbsp;&nbsp; +18% GST</i>
            </p>
          </div>
        </div>
      `;
      })
      .join("");

    listingsContainer.innerHTML = cardsHtml;
  }
});
