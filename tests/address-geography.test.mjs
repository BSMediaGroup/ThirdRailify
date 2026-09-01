import assert from "node:assert/strict";
import test from "node:test";
import {
  ADDRESS_GEOGRAPHY_DATASET, countryName, countryOptions, formatGeography, normalizeCountry,
  normalizeRegion, postalLabel, regionLabel, regionName, regionOptions,
} from "../src/address/geography.ts";
import * as adminGeography from "../../ThirdRailify-Admin/src/address/geography.ts";

test("address geography uses the pinned shared offline dataset and canonical codes", () => {
  assert.equal(ADDRESS_GEOGRAPHY_DATASET, "country-region-data@4.1.0");
  assert.equal(adminGeography.ADDRESS_GEOGRAPHY_DATASET, ADDRESS_GEOGRAPHY_DATASET);
  assert.equal(countryOptions().length, 249);
  for (const [code, name] of [["CA", "Canada"], ["US", "United States"], ["AU", "Australia"], ["GB", "United Kingdom"], ["DE", "Germany"], ["JP", "Japan"], ["BR", "Brazil"], ["NZ", "New Zealand"]]) {
    assert.equal(countryName(code), name);
    assert.equal(normalizeCountry(name), code);
    assert.equal(adminGeography.countryName(code), name);
  }
  for (const [country, code, name] of [["CA", "ON", "Ontario"], ["CA", "QC", "Quebec"], ["CA", "BC", "British Columbia"], ["US", "CA", "California"], ["US", "NY", "New York"], ["US", "TX", "Texas"], ["AU", "NSW", "New South Wales"], ["AU", "VIC", "Victoria"], ["AU", "QLD", "Queensland"]]) {
    assert.equal(regionName(country, code), name);
    assert.equal(normalizeRegion(country, name), code);
    assert.equal(adminGeography.regionName(country, code), name);
  }
});

test("legacy normalization, friendly labels, and non-applicable regions are deterministic", () => {
  assert.equal(normalizeCountry("ca"), "CA");
  assert.equal(normalizeCountry("Canada"), "CA");
  assert.equal(normalizeRegion("CA", "on"), "ON");
  assert.equal(normalizeRegion("Canada", "Ontario"), "ON");
  assert.equal(normalizeRegion("CA", "Legacy North"), "Legacy North");
  assert.equal(formatGeography("Thamesford", "ON", "CA"), "Thamesford, Ontario, Canada");
  assert.equal(regionLabel("CA"), "Province / territory");
  assert.equal(regionLabel("US"), "State / territory");
  assert.equal(postalLabel("US"), "ZIP code");
  assert.equal(postalLabel("GB"), "Postcode");
  assert.deepEqual(regionOptions("AQ"), []);
});
