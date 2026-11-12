/**
 * Smart Price Estimator Widget (Frontend)
 * Communicates with /listings/api/estimate-price
 * Random Forest ML + Spatial Neighborhood Calibration
 */

document.addEventListener("DOMContentLoaded", () => {
  const priceInput = document.querySelector('input[name="listing[price]"]');
  const countryInput = document.querySelector('input[name="listing[country]"]');
  const locationInput = document.querySelector('input[name="listing[location]"]');

  if (!priceInput) return;

  // Find or create container above price input
  const priceContainer = priceInput.closest(".mb-3") || priceInput.parentElement;
  if (!priceContainer) return;

  // Build the Smart Price Assistant Card HTML
  const widgetHtml = `
    <div class="smart-price-card card border-0 shadow-sm rounded-4 mb-3 overflow-hidden">
      <div class="card-body p-3">
        <div class="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-2">
          <div class="d-flex align-items-center gap-2">
            <div class="smart-price-icon-box">
              <i class="fa-solid fa-wand-magic-sparkles text-danger"></i>
            </div>
            <div>
              <h6 class="mb-0 fw-bold">Smart Price Assistant</h6>
              <small class="text-muted" style="font-size: 0.78rem;">Random Forest ML &bull; Spatial Market Calibration</small>
            </div>
          </div>
          <button type="button" class="btn btn-outline-danger btn-sm rounded-pill px-3 fw-semibold" id="btnRunEstimator">
            <span class="btn-text"><i class="fa-solid fa-bolt me-1"></i> Estimate Price</span>
            <span class="spinner-border spinner-border-sm d-none" id="estimatorSpinner" role="status"></span>
          </button>
        </div>

        <!-- Result Box (Initially Hidden) -->
        <div id="estimatorResultBox" class="mt-2 d-none">
          <div class="p-3 bg-light rounded-3 border">
            <div class="d-flex align-items-baseline justify-content-between flex-wrap gap-2">
              <div>
                <span class="text-muted small d-block">Recommended Nightly Rate</span>
                <span class="fs-4 fw-bold text-dark" id="estimatedPriceVal">₹ 0</span>
                <span class="text-muted small">/ night</span>
              </div>
              <div class="text-end">
                <span class="badge" id="confidenceBadge">Confidence</span>
                <div class="small text-muted mt-1" id="priceRangeVal">Range: ₹0 - ₹0</div>
              </div>
            </div>

            <div class="small text-muted mt-2 border-top pt-2" id="confidenceReasonVal">
              Calibrated with global AI benchmarks.
            </div>

            <!-- Breakdown tags -->
            <div class="d-flex flex-wrap gap-1 mt-2" id="priceFactorPills"></div>

            <div class="mt-3 d-flex gap-2">
              <button type="button" class="btn btn-danger btn-sm rounded-pill px-3 fw-semibold" id="btnApplyPrice">
                <i class="fa-solid fa-check me-1"></i> Apply Suggested Price
              </button>
              <button type="button" class="btn btn-light btn-sm text-muted rounded-pill px-2" id="btnDismissEstimate" title="Close">
                Dismiss
              </button>
            </div>
          </div>
        </div>

        <!-- Message/Alert Box -->
        <div id="estimatorAlert" class="alert alert-warning py-2 px-3 small mt-2 d-none mb-0"></div>
      </div>
    </div>
  `;

  // Insert right before the Price input's row or container
  const parentRow = priceContainer.closest(".row") || priceContainer;
  parentRow.insertAdjacentHTML("beforebegin", widgetHtml);

  // Hook elements
  const btnEstimate = document.getElementById("btnRunEstimator");
  const spinner = document.getElementById("estimatorSpinner");
  const btnText = btnEstimate.querySelector(".btn-text");
  const resultBox = document.getElementById("estimatorResultBox");
  const alertBox = document.getElementById("estimatorAlert");
  const estimatedPriceVal = document.getElementById("estimatedPriceVal");
  const priceRangeVal = document.getElementById("priceRangeVal");
  const confidenceBadge = document.getElementById("confidenceBadge");
  const confidenceReasonVal = document.getElementById("confidenceReasonVal");
  const priceFactorPills = document.getElementById("priceFactorPills");
  const btnApplyPrice = document.getElementById("btnApplyPrice");
  const btnDismiss = document.getElementById("btnDismissEstimate");

  let lastRecommendedPrice = null;

  function showAlert(msg) {
    alertBox.textContent = msg;
    alertBox.classList.remove("d-none");
    resultBox.classList.add("d-none");
  }

  function hideAlert() {
    alertBox.classList.add("d-none");
  }

  function getSelectedCategories() {
    const checked = document.querySelectorAll('input[name="listing[category]"]:checked');
    const categories = [];
    checked.forEach((cb) => categories.push(cb.value));
    return categories;
  }

  // Calculate Price Handler
  btnEstimate.addEventListener("click", async () => {
    const country = countryInput ? countryInput.value.trim() : "";
    const location = locationInput ? locationInput.value.trim() : "";
    const categories = getSelectedCategories();

    if (!country && !location) {
      showAlert("Please enter a Location or Country below first so we can analyze the market.");
      return;
    }

    hideAlert();
    btnText.classList.add("d-none");
    spinner.classList.remove("d-none");
    btnEstimate.disabled = true;

    try {
      const response = await fetch("/listings/api/estimate-price", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          country,
          location,
          category: categories,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to calculate price estimate");
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Estimation error");
      }

      lastRecommendedPrice = data.recommendedPrice;

      // Populate Result UI
      estimatedPriceVal.textContent = `₹ ${data.recommendedPrice.toLocaleString("en-IN")}`;
      priceRangeVal.textContent = `Range: ₹ ${data.minPrice.toLocaleString("en-IN")} — ₹ ${data.maxPrice.toLocaleString("en-IN")}`;
      confidenceReasonVal.textContent = data.confidenceReason;

      // Badge Styling
      confidenceBadge.className = "badge";
      if (data.confidence === "High") {
        confidenceBadge.classList.add("bg-success");
        confidenceBadge.textContent = "High Confidence";
      } else if (data.confidence === "Good") {
        confidenceBadge.classList.add("bg-primary");
        confidenceBadge.textContent = "Good Market Match";
      } else {
        confidenceBadge.classList.add("bg-secondary");
        confidenceBadge.textContent = "Global Benchmark";
      }

      // Factor Pills
      priceFactorPills.innerHTML = "";
      if (data.breakdown) {
        // Country Tier Pill
        const tierPill = document.createElement("span");
        tierPill.className = "badge bg-dark-subtle text-dark border";
        tierPill.textContent = `${data.breakdown.countryTier} Market`;
        priceFactorPills.appendChild(tierPill);

        // Category adjustments
        if (Array.isArray(data.breakdown.categoryAdjustments)) {
          data.breakdown.categoryAdjustments.forEach((adj) => {
            const pill = document.createElement("span");
            pill.className = `badge ${adj.type === "bonus" ? "bg-success-subtle text-success border border-success-subtle" : "bg-warning-subtle text-warning border border-warning-subtle"}`;
            pill.textContent = `${adj.category} (${adj.impact})`;
            priceFactorPills.appendChild(pill);
          });
        }

        // Spatial calibration pill if nearby stays found
        if (data.nearbyCount > 0) {
          const spatialPill = document.createElement("span");
          spatialPill.className = "badge bg-info-subtle text-info border border-info-subtle";
          spatialPill.textContent = `${data.nearbyCount} nearby stays synced (${data.breakdown.blendWeight}% local weight)`;
          priceFactorPills.appendChild(spatialPill);
        }
      }

      resultBox.classList.remove("d-none");
    } catch (err) {
      console.error(err);
      showAlert("Could not estimate price right now. Please check your network and try again.");
    } finally {
      btnText.classList.remove("d-none");
      spinner.classList.add("d-none");
      btnEstimate.disabled = false;
    }
  });

  // Apply Price to Input Field
  btnApplyPrice.addEventListener("click", () => {
    if (lastRecommendedPrice !== null) {
      priceInput.value = lastRecommendedPrice;
      // Trigger native input & change events for validation frameworks
      priceInput.dispatchEvent(new Event("input", { bubbles: true }));
      priceInput.dispatchEvent(new Event("change", { bubbles: true }));

      // Add visual pulse effect
      priceInput.classList.add("price-applied-pulse");
      priceInput.focus();
      setTimeout(() => {
        priceInput.classList.remove("price-applied-pulse");
      }, 1800);
    }
  });

  // Dismiss button
  btnDismiss.addEventListener("click", () => {
    resultBox.classList.add("d-none");
  });
});
