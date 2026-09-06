import assert from "node:assert/strict";
import {mkdir} from "node:fs/promises";
import {spawn} from "node:child_process";
import test from "node:test";
import {chromium} from "playwright-core";
import {normalizeAgreement} from "../functions/_shared/commerce-checkout-proxy.js";
const ORIGIN="http://127.0.0.1:4217";
const IMAGE="https://fixture.example.test/product.svg";
const PHONE="Synthetic private telephone";
const ADDRESS="Synthetic private premises";
function offer(qualifying=true){return {ok:true,acceptanceToken:"a".repeat(43),agreement:{id:"agr_synthetic",version:1,environment:"live",qualifyingInternetAgreement:qualifying,merchant:{legalName:"Synthetic Merchant",tradingName:"Fixture",phone:PHONE,address:{line1:ADDRESS},supportEmail:"support@example.test",secret:"DO_NOT_PROJECT"},items:[{productId:"product-1",variantId:"variant-1",name:"BLEH Fixture",description:"Fixture product",unitAmount:qualifying?6000:3000,quantity:1,lineTotalAmount:qualifying?6000:3000}],totals:{productSubtotalAmount:qualifying?6000:3000,shippingAmount:895,taxAmount:0,totalAmount:qualifying?6895:3895,currency:"CAD"},tax:{policy:"not_collecting",statement:"Tax is not being collected."},shipping:{method:"Standard delivery",delivery:{minDays:3,maxDays:7},destination:{city:"London",countryCode:"CA"}},payment:{provider:"paypal",terms:"PayPal payment is due now in CAD."},fulfillment:{statement:"Made to order; delivery estimate below."},policies:Object.fromEntries(["terms","privacy","returns"].map(key=>[key,{url:key==="returns"?"/refunds":"/"+key,version:"2026.09",title:key,sections:[{title:"Agreement conditions",paragraphs:["Review these synthetic terms."]}]}])),conditions:["Worldwide shipping; destination availability confirmed before payment."],offeredAt:new Date().toISOString(),expiresAt:"2099-09-06T00:00:00Z",privateRecord:"DO_NOT_PROJECT"}};}
test("scoped Public projection excludes extra fields and removes private merchant contact at every threshold",()=>{for(const qualifying of [true,false]){const result=normalizeAgreement(offer(qualifying));assert.doesNotMatch(JSON.stringify(result),/DO_NOT_PROJECT/);assert.equal(JSON.stringify(result).includes(PHONE),false);assert.equal(JSON.stringify(result).includes(ADDRESS),false);}const invalid=offer();invalid.agreement.totals.taxAmount=1;assert.throws(()=>normalizeAgreement(invalid));});
test("checkout stays private without a separate agreement gate at 1440, 768 and 390",async t=>{
 await mkdir("output/store-launch",{recursive:true});
 const server=spawn(process.execPath,["node_modules/vite/bin/vite.js","--host","127.0.0.1","--port","4217"],{stdio:"ignore"});t.after(()=>server.kill());await waitForServer();
 const browser=await chromium.launch({executablePath:"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",headless:true});t.after(()=>browser.close());
 for(const width of [1440,768,390]){
  const context=await browser.newContext({viewport:{width,height:900},reducedMotion:"reduce"});t.after(()=>context.close());
  await context.addCookies([{name:"thirdrailify_consent",value:encodeURIComponent(JSON.stringify({version:1,timestamp:new Date().toISOString(),expiry:"2099-01-01T00:00:00Z",categories:{preferences:true,externalMedia:false}})),url:ORIGIN}]);
  await context.addInitScript(()=>localStorage.setItem("thirdrailify-commerce-cart-v2",JSON.stringify([{productId:"product-1",variantId:"variant-1",quantity:1}])));
  const page=await context.newPage();page.setDefaultTimeout(12000);const errors=[];let offers=0;let payments=0;page.on("pageerror",e=>errors.push(e.message));
  await page.route(IMAGE,route=>route.fulfill({contentType:"image/svg+xml",body:"<svg xmlns='http://www.w3.org/2000/svg'/>"}));
  await page.route("**/api/**",route=>{const path=new URL(route.request().url()).pathname;
   if(path==="/api/auth/config")return json(route,{configured:false,oauthProviders:[],oauthProviderStates:[],publicOrigin:ORIGIN,adminOrigin:ORIGIN});
   if(path==="/api/auth/session")return json(route,{ok:true,authenticated:false,account:null,access:{isAdmin:false,isMasterAdmin:false}});
   if(path==="/api/commerce/catalogue")return json(route,catalogue());
   if(path==="/api/commerce/shipping-markets")return json(route,{ok:true,markets:[{countryCode:"CA",displayName:"Canada"},{countryCode:"US",displayName:"United States"},{countryCode:"GB",displayName:"United Kingdom"},{countryCode:"AU",displayName:"Australia"},{countryCode:"DE",displayName:"Germany"},{countryCode:"JP",displayName:"Japan"}]});
   if(path==="/api/commerce/shipping-quotes")return json(route,shippingQuote());
   if(path==="/api/commerce/payment-config")return json(route,{...paymentConfig(),environment:"live",storeCheckoutEnabled:true});
   if(path==="/api/commerce/agreement"){offers++;return json(route,offer());}
   if(path.includes("paypal")||path.includes("capture")){payments++;return json(route,{ok:false},409);}
   if(path==="/api/catalogue/banner")return json(route,{ok:true,normal:{enabled:false,messages:[]},live:{enabled:false}});
   if(path==="/api/watch")return json(route,{available:false,liveNow:[],primary:null,latest:null,upcoming:null});
   return json(route,{ok:false},404);
  });
  await page.goto(ORIGIN+"/checkout",{waitUntil:"domcontentloaded"});await page.getByRole("button",{name:/Continue as guest/}).click();await page.getByLabel("Customer email").fill("customer@example.test");await fillDelivery(page);
  await page.getByLabel("Country",{exact:true}).selectOption("GB");assert.equal(await page.getByLabel("Country",{exact:true}).inputValue(),"GB");await page.getByLabel("Country",{exact:true}).selectOption("CA");await page.getByLabel("Province / territory").selectOption("ON");
  assert.equal(offers,0);assert.doesNotMatch(await page.content(),new RegExp(PHONE+"|"+ADDRESS));
  await page.getByRole("button",{name:"Request shipping methods"}).click();await page.getByRole("radio",{name:/Standard delivery/}).waitFor();
  assert.equal(await page.getByRole("button",{name:"Review transaction agreement"}).count(),0);
  assert.equal(await page.getByRole("checkbox",{name:/I explicitly accept/}).count(),0);
  assert.equal(await page.locator(".checkout-summary details").count(),0);
  assert.equal(offers,0);assert.equal(payments,0);
  assert.doesNotMatch(await page.content(),new RegExp(PHONE+"|"+ADDRESS));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.getByLabel("Address line 1").fill("101 Changed Street");
  assert.equal(offers,0);assert.equal(payments,0);
  assert.doesNotMatch(await page.evaluate(()=>JSON.stringify({storage:{...localStorage},url:location.href})),new RegExp(PHONE+"|"+ADDRESS+"|customer@example.test"));assert.deepEqual(errors,[]);
  await context.close();
 }
});

async function fillDelivery(page) {
  await page.getByLabel("Recipient name").fill("Checkout Fixture");
  await page.getByLabel("Address line 1").fill("100 Test Street");
  await page.getByLabel("City / locality").fill("London");
  await page.getByLabel("Country").selectOption("CA");
  await page.getByLabel("Province / territory").selectOption("ON");
  await page.getByLabel("Postal code").fill("N6A 1A1");
}
function paymentConfig() { return { ok: true, provider: "paypal", preferred: true, environment: "sandbox", currency: "CAD", intent: "CAPTURE", clientId: null, configured: false, webhookConfigured: false, storeCheckoutEnabled: false, donationsEnabled: false, emergencyPaused: false, stripe: { configured: true, enabled: false, preferred: false }, message: "PayPal credentials are not configured." }; }
function shippingQuote() { return { ok: true, quote: { id: "shq_aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", expiresAt: "2099-08-29T01:15:00.000Z", currency: "CAD", subtotalAmount: 6000, requiresShipping: true, checkoutAvailable: true, options: [{ id: "shr_bbbbbbbbbbbbbbbbbbbbbbbb", name: "Standard delivery", amount: 895, currency: "CAD", totalAmount: 6895, delivery: { minDays: 3, maxDays: 7, minDate: null, maxDate: null } }] } }; }
function catalogue() { return { ok: true, source: "commerce-d1", currency: "CAD", checkoutEnabled: true, updatedAt: "2026-08-29T00:00:00.000Z", collections: [], products: [{ id: "product-1", slug: "bleh-fixture", title: "BLEH Fixture", description: "Fixture product.", images: [IMAGE], categories: ["Apparel"], collectionSlugs: [], tags: [], featured: false, featuredOrder: null, displayOrder: 10, maxQuantity: 5, available: true, price: { minUnitAmount: 6000, maxUnitAmount: 6000, label: "CA$30.50" }, variants: [{ id: "variant-1", label: "M / Black", size: "M", color: "Black", options: { Size: "M", Color: "Black" }, unitAmount: 6000, currency: "CAD", availability: "active" }] }] }; }
function json(route, body, status = 200) { return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) }); }
async function waitForServer() { for (let attempt = 0; attempt < 80; attempt += 1) { try { if ((await fetch(ORIGIN)).ok) return; } catch { /* Vite is starting. */ } await new Promise((resolve) => setTimeout(resolve, 100)); } throw new Error("Checkout browser test server did not start."); }
