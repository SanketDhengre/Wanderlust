/**
 * Test Suite for Smart Price Estimator
 * Tests:
 * 1. Country tier encoder
 * 2. Feature extraction & weights
 * 3. Random Forest 12-tree regression ensemble
 * 4. Spatial neighborhood calibration & blending
 * 5. Price rounding and min/max range boundaries
 * 6. Edge cases (unknown countries, empty categories, null coordinates)
 */

const assert = require("assert");
const {
  estimateListingPrice,
  getCountryTier,
  extractFeatures,
  predictRandomForest,
  CATEGORY_WEIGHTS,
  COUNTRY_TIERS
} = require("./utils/priceEstimator");

let passed = 0;
let total = 0;

function runTest(name, fn) {
  total++;
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${name}:`, err.message);
  }
}

async function runAsyncTest(name, fn) {
  total++;
  try {
    await fn();
    console.log(`  [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${name}:`, err.message);
  }
}

async function main() {
  console.log("=== Running Smart Price Estimator Test Suite ===\n");

  // 1. Country Tier Encoding Tests
  runTest("Country Tier: Tier 1 countries (US, Switzerland, UK)", () => {
    assert.strictEqual(getCountryTier("United States"), 1);
    assert.strictEqual(getCountryTier("usa"), 1);
    assert.strictEqual(getCountryTier("Switzerland"), 1);
    assert.strictEqual(getCountryTier("United Kingdom"), 1);
  });

  runTest("Country Tier: Tier 2 countries (Italy, UAE, Spain)", () => {
    assert.strictEqual(getCountryTier("Italy"), 2);
    assert.strictEqual(getCountryTier("Spain"), 2);
    assert.strictEqual(getCountryTier("United Arab Emirates"), 2);
    assert.strictEqual(getCountryTier("Dubai"), 2);
  });

  runTest("Country Tier: Tier 3 countries (India, Thailand, Mexico)", () => {
    assert.strictEqual(getCountryTier("India"), 3);
    assert.strictEqual(getCountryTier("Thailand"), 3);
    assert.strictEqual(getCountryTier("Mexico"), 3);
  });

  runTest("Country Tier: Tier 4 countries (Vietnam, Nepal, Egypt)", () => {
    assert.strictEqual(getCountryTier("Vietnam"), 4);
    assert.strictEqual(getCountryTier("Nepal"), 4);
    assert.strictEqual(getCountryTier("Egypt"), 4);
  });

  runTest("Country Tier: Graceful fallback for unknown countries & nulls", () => {
    assert.strictEqual(getCountryTier("Wakanda"), 3);
    assert.strictEqual(getCountryTier("Narnia"), 3);
    assert.strictEqual(getCountryTier(null), 3);
    assert.strictEqual(getCountryTier(""), 3);
  });

  // 2. Feature Vector Extraction Tests
  runTest("Feature Vector: Extracts 8 numerical features", () => {
    const feat = extractFeatures("India", 15.29, 73.96, ["Beach", "Amazing-Pools"]);
    assert.strictEqual(feat.vector.length, 8);
    assert.strictEqual(feat.tier, 3);
    assert.strictEqual(feat.vector[0], 3); // tier
    assert.strictEqual(feat.vector[1], 15.29); // lat
    assert.strictEqual(feat.vector[2], 73.96); // lng
    assert.ok(feat.vector[3] > 0); // luxuryScore
    assert.ok(feat.vector[4] > 0); // scenicScore
    assert.strictEqual(feat.vector[7], 2); // 2 categories
  });

  runTest("Feature Vector: Handles single string category or empty categories", () => {
    const featSingle = extractFeatures("USA", 34.0, -118.0, "Rooms");
    assert.strictEqual(featSingle.vector.length, 8);
    assert.strictEqual(featSingle.vector[7], 1);

    const featEmpty = extractFeatures("USA", 34.0, -118.0, []);
    assert.strictEqual(featEmpty.vector.length, 8);
    assert.strictEqual(featEmpty.vector[7], 1); // Defaults to Rooms
  });

  // 3. Random Forest Regression Ensemble Tests
  runTest("Random Forest: Evaluates 12 trees and returns valid mean & bounds", () => {
    const feat = extractFeatures("United States", 34.0, -118.0, ["Castles", "Amazing-Pools"]);
    const res = predictRandomForest(feat.vector);
    assert.ok(typeof res.meanPrice === "number" && res.meanPrice > 0);
    assert.ok(typeof res.stdDev === "number" && res.stdDev >= 0);
    assert.ok(res.minTreePrice <= res.meanPrice);
    assert.ok(res.maxTreePrice >= res.meanPrice);
  });

  runTest("Random Forest: Luxury Castle in Tier 1 costs significantly more than Camping in Tier 4", () => {
    const castleFeat = extractFeatures("United States", 34.0, -118.0, ["Castles"]);
    const castleRes = predictRandomForest(castleFeat.vector);

    const campingFeat = extractFeatures("Vietnam", 16.0, 108.0, ["Camping"]);
    const campingRes = predictRandomForest(campingFeat.vector);

    assert.ok(
      castleRes.meanPrice > campingRes.meanPrice * 2.5,
      `Expected Castle (${castleRes.meanPrice}) > 2.5x Camping (${campingRes.meanPrice})`
    );
  });

  runTest("Random Forest: Adding luxury amenities increases price monotonically", () => {
    const baseFeat = extractFeatures("India", 15.0, 73.0, ["Rooms"]);
    const baseRes = predictRandomForest(baseFeat.vector);

    const upgradedFeat = extractFeatures("India", 15.0, 73.0, ["Rooms", "Amazing-Pools", "Beach"]);
    const upgradedRes = predictRandomForest(upgradedFeat.vector);

    assert.ok(
      upgradedRes.meanPrice > baseRes.meanPrice,
      `Expected Upgraded (${upgradedRes.meanPrice}) > Base (${baseRes.meanPrice})`
    );
  });

  // 4. End-to-End estimateListingPrice Tests
  await runAsyncTest("Pipeline: Estimate without coordinates returns clean benchmark", async () => {
    const result = await estimateListingPrice({
      country: "India",
      location: "Manali",
      category: ["Mountains", "Cabins"]
    });

    assert.strictEqual(result.success, true);
    assert.ok(result.recommendedPrice >= 2000 && result.recommendedPrice <= 6000);
    assert.ok(result.minPrice < result.recommendedPrice);
    assert.ok(result.maxPrice > result.recommendedPrice);
    assert.strictEqual(result.nearbyCount, 0);
    assert.strictEqual(result.currencySymbol, "₹");
    assert.ok(result.breakdown.categoryAdjustments.length > 0);
  });

  await runAsyncTest("Pipeline: Spatial calibration correctly blends nearby MongoDB listings", async () => {
    const mockModel = {
      aggregate: async () => [
        { _id: "1", price: 2000, distanceMeters: 5000, category: ["Beach"] },
        { _id: "2", price: 2400, distanceMeters: 8000, category: ["Beach"] },
        { _id: "3", price: 2200, distanceMeters: 12000, category: ["Rooms"] }
      ]
    };

    const result = await estimateListingPrice({
      country: "India",
      location: "Goa",
      category: ["Beach"],
      coordinates: [73.8567, 15.2993],
      ListingModel: mockModel
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.nearbyCount, 3);
    assert.strictEqual(result.nearestDistanceKm, 5.0);
    assert.strictEqual(result.confidence, "Good");
    assert.strictEqual(result.breakdown.spatialMedian, 2200);
    assert.ok(result.breakdown.blendWeight > 0);
  });

  await runAsyncTest("Pipeline: Handles missing or invalid country/location without crashing", async () => {
    const result = await estimateListingPrice({
      country: null,
      location: null,
      category: null,
      coordinates: null
    });

    assert.strictEqual(result.success, true);
    assert.ok(result.recommendedPrice > 0);
    assert.ok(result.minPrice > 0);
    assert.ok(result.maxPrice > result.minPrice);
  });

  console.log(`\n=== Test Results: ${passed}/${total} Passed ===`);
  if (passed === total) {
    console.log("All Smart Price Estimator tests completed successfully! 🎉\n");
  } else {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
