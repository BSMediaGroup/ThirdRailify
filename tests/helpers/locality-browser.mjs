import assert from "node:assert/strict";

export async function checkLocalityAutocomplete(page, screenshot) {
  const calls = [];
  await page.route("**/api/address/localities?**", async (route) => {
    const params = new URL(route.request().url()).searchParams;
    calls.push(Object.fromEntries(params));
    const q = params.get("q");
    if (q === "Offline") return route.fulfill({ status: 503, json: { ok: false } });
    return route.fulfill({ json: { ok: true, results: q === "Custom locality" ? [] : [
      { city: "London", region: "Ontario", countryCode: "CA" },
      { city: "London", region: "England", countryCode: "GB" },
      { city: "London", region: "Alberta", countryCode: "CA" },
    ] } });
  });
  const city = page.getByRole("combobox", { name: "City / locality" });
  await page.getByLabel("Country", { exact: true }).selectOption("CA");
  await page.getByLabel("Province / territory").selectOption("ON");
  await city.fill("Lo");
  await page.waitForTimeout(450);
  assert.equal(calls.length, 0);
  await city.fill("Lon");
  await page.getByRole("option", { name: "London Ontario, Canada", exact: true }).waitFor();
  assert.equal(await page.locator('.city-locality-field [role="option"]').count(), 1);
  assert.deepEqual(calls.at(-1), { q: "Lon", country: "CA", region: "Ontario" });
  assert.equal(await city.getAttribute("aria-expanded"), "true");
  await city.press("ArrowDown");
  const selected = await city.getAttribute("aria-activedescendant");
  assert.ok(selected); assert.equal(await page.locator(`[id="${selected}"]`).getAttribute("aria-selected"), "true");
  const box = await page.locator(".city-locality-field__popup").boundingBox();
  assert.ok(box.x >= 0 && box.x + box.width <= page.viewportSize().width);
  assert.equal(await page.locator(".city-locality-field__popup").evaluate((element) => getComputedStyle(element).backgroundColor), "rgb(16, 17, 13)");
  await page.screenshot({ path: screenshot, fullPage: true });
  await city.press("Enter");
  assert.equal(await city.inputValue(), "London");
  assert.equal(await city.getAttribute("aria-expanded"), "false");
  assert.equal(await page.getByLabel("Province / territory").inputValue(), "ON");
  await city.fill("Lond");
  await page.getByRole("listbox", { name: "City and locality suggestions" }).waitFor();
  await city.press("Escape");
  assert.equal(await city.inputValue(), "Lond");
  assert.equal(await city.getAttribute("aria-expanded"), "false");
  await city.fill("Londo");
  await page.getByRole("option", { name: "London Ontario, Canada", exact: true }).click();
  assert.equal(await city.inputValue(), "London");
  await city.fill("Custom locality");
  await page.getByRole("status").filter({ hasText: "No matches found" }).waitFor();
  await city.press("Tab");
  assert.equal(await city.inputValue(), "Custom locality");
  assert.equal(await city.evaluate((input) => input.checkValidity()), true);
  await city.fill("Offline");
  await page.getByRole("status").filter({ hasText: "Suggestions are unavailable" }).waitFor();
  assert.equal(await city.inputValue(), "Offline");
  assert.equal(await city.evaluate((input) => input.checkValidity()), true);
  await city.fill("London");
  await page.getByRole("listbox", { name: "City and locality suggestions" }).waitFor();
  await page.getByLabel("Country", { exact: true }).selectOption("US");
  assert.equal(await city.getAttribute("aria-expanded"), "false");
  assert.equal(await city.inputValue(), "London");
  await page.getByLabel("Country", { exact: true }).selectOption("CA");
  await page.getByLabel("Province / territory").selectOption("ON");
}
