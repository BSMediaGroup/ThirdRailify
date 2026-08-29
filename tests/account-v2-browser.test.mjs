import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import test from "node:test";
import { chromium } from "playwright-core";

const ORIGIN = process.env.ACCOUNT_BROWSER_ORIGIN || "http://127.0.0.1:4201";
const LIVE = Boolean(process.env.ACCOUNT_BROWSER_ORIGIN);
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const RESULTS = join(tmpdir(), "thirdrailify-account-v2-browser");
const IMAGE = "https://static.wixstatic.com/media/account-v2-fixture.svg";

test("Account V2 routes, saved addresses, orders, Cart, and Checkout are responsive and truthful", async (t) => {
  await mkdir(RESULTS, { recursive: true });
  if (!LIVE) { const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "4201"], { stdio: "ignore" }); t.after(() => server.kill()); await waitForServer(); }
  const browser = await chromium.launch({ executablePath: CHROME, headless: true }); t.after(() => browser.close());

  for (const [width, height] of [[1920,1080],[1440,900],[1024,768],[768,1024],[390,844]]) {
    const { context, page, errors } = await fixturePage(browser, width, height);
    await page.goto(`${ORIGIN}/account`); await page.getByRole("heading", { level: 1, name: "Your account" }).waitFor();
    await page.getByRole("heading", { level: 2, name: "2 recorded orders" }).waitFor(); await assertPage(page, "/account"); assert.match(await page.locator("body").innerText(), /Home.*Ada Rail.*2 recorded orders/is);
    await page.screenshot({ path: `${RESULTS}/account-overview-${width}x${height}.png`, fullPage: true });
    if (width === 1440) {
      await page.getByRole("link", { name: "Profile", exact: true }).click(); await page.waitForURL(`${ORIGIN}/account/profile`); await page.getByRole("heading", { level: 1, name: "Profile & contact" }).waitFor(); assert.equal(await page.getByLabel("Primary account email").isEditable(), false); await page.getByLabel("Upload a new image").setInputFiles({ name: "not-an-image.txt", mimeType: "text/plain", buffer: Buffer.from("fixture") }); await page.getByRole("button", { name: "Upload avatar" }).click(); await page.getByText("Choose a JPG, PNG, or WebP image no larger than 5 MB.").waitFor(); await page.getByLabel("Or use a direct HTTPS image URL").fill("https://example.com/not-an-image.txt"); await page.getByRole("button", { name: "Use image URL" }).click(); await page.getByText("The supplied avatar URL did not return an approved image.").waitFor(); await page.evaluate(() => { window.scrollTo(0, 0); if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); }); await page.screenshot({ path: `${RESULTS}/account-profile-1440x900.png`, fullPage: true });
      await page.goBack(); await page.waitForURL(`${ORIGIN}/account`); await page.goForward(); await page.waitForURL(`${ORIGIN}/account/profile`); assert.equal(await page.evaluate(() => performance.getEntriesByType("navigation").length), 1);
      await page.goto(`${ORIGIN}/account/delivery`); await page.getByRole("heading", { level: 1, name: "Delivery addresses" }).waitFor(); await page.getByRole("button", { name: "Add address" }).click(); await page.getByRole("dialog", { name: "Add a destination" }).waitFor(); await page.screenshot({ path: `${RESULTS}/account-address-editor-1440x900.png`, fullPage: true }); await page.getByRole("button", { name: "Close address editor" }).click();
      await page.goto(`${ORIGIN}/account/security`); await page.getByRole("heading", { level: 1, name: "Security & privacy" }).waitFor(); await page.getByRole("heading", { level: 2, name: "Connected identity." }).waitFor(); assert.match(await page.locator("body").innerText(), /Provider disconnection.*not exposed/s); await page.screenshot({ path: `${RESULTS}/account-security-1440x900.png`, fullPage: true });
    }
    assert.deepEqual(errors, []); await context.close();
  }

  for (const [width,height] of [[1440,900],[768,1024],[390,844]]) {
    const { context,page,errors } = await fixturePage(browser,width,height);
    await page.goto(`${ORIGIN}/account/delivery`); await page.getByRole("heading", { level: 1, name: "Delivery addresses" }).waitFor(); await assertPage(page,"/account/delivery"); assert.equal(await page.locator(".address-card.is-default").count(),1); await page.screenshot({ path: `${RESULTS}/account-delivery-${width}x${height}.png`, fullPage:true });
    await page.goto(`${ORIGIN}/account/orders`); await page.getByRole("heading", { level: 1, name: "Orders & payments" }).waitFor(); await page.getByText("TR-AAAA1111", { exact:true }).first().waitFor(); await assertPage(page,"/account/orders"); assert.match(await page.locator("body").innerText(), /1\s+LIVE.*1\s+TEST/s); await page.screenshot({ path: `${RESULTS}/account-orders-${width}x${height}.png`, fullPage:true }); assert.deepEqual(errors,[]); await context.close();
  }

  for (const [width,height] of [[1440,900],[390,844]]) {
    const { context,page,errors } = await fixturePage(browser,width,height); await page.goto(`${ORIGIN}/account/orders/ord_account_aaaa1111`); await page.getByRole("heading", { level:1, name:"Order details" }).waitFor(); await page.getByRole("heading", { name:"TR-AAAA1111" }).waitFor(); assert.doesNotMatch(await page.locator("body").innerText(), /stripe|webhook|provider.order|ciphertext/i); await assertPage(page,"/account/orders/ord_account_aaaa1111"); await page.screenshot({ path:`${RESULTS}/account-order-detail-${width}x${height}.png`, fullPage:true }); assert.deepEqual(errors,[]); await context.close();
  }

  for (const [width,height] of [[1920,1080],[1440,900],[768,1024],[390,844]]) {
    const { context,page,errors } = await fixturePage(browser,width,height,true); await page.goto(`${ORIGIN}/cart`); await page.getByRole("heading", { level:1, name:"Your cart." }).waitFor(); await page.locator(".cart-delivery-summary strong", { hasText: "Home" }).waitFor(); assert.match(await page.locator(".cart-summary").innerText(), /Calculated at checkout.*Calculated before payment.*Home.*Checkout unavailable/is); assert.equal(await page.getByRole("button", { name:"Checkout unavailable" }).isDisabled(),true); await assertPage(page,"/cart"); await page.screenshot({ path:`${RESULTS}/cart-${width}x${height}.png`, fullPage:true }); assert.deepEqual(errors,[]); await context.close();
  }

  for (const [width,height] of [[1440,900],[1024,768],[768,1024],[390,844]]) {
    const { context,page,errors } = await fixturePage(browser,width,height,true); await page.goto(`${ORIGIN}/checkout`); await page.getByRole("heading", { level:1, name:"Delivery & checkout." }).waitFor(); const home = page.getByRole("radio", { name:/Home/ }); await home.waitFor(); assert.equal(await home.getAttribute("aria-checked"),"true"); assert.equal(await page.getByLabel("Recipient name").inputValue(),"Ada Rail"); assert.equal(await page.getByLabel("Customer email").isEditable(),false); assert.equal(await page.getByRole("button", { name:"Continue to secure payment" }).isDisabled(),true); assert.match(await page.locator(".checkout-gate-message").innerText(),/currently unavailable/); assert.equal(await page.locator('input[name="card-number"]').count(),0); await assertPage(page,"/checkout"); await page.screenshot({ path:`${RESULTS}/checkout-${width}x${height}.png`, fullPage:true }); assert.deepEqual(errors,[]); await context.close();
  }
});

async function fixturePage(browser,width,height,withCart=false) {
  const context = await browser.newContext({ viewport:{width,height}, reducedMotion:"reduce" });
  await context.addCookies([{ name:"thirdrailify_consent", value:encodeURIComponent(JSON.stringify({ version:1,timestamp:new Date().toISOString(),expiry:new Date(Date.now()+86400000).toISOString(),categories:{preferences:true,externalMedia:false} })), url:ORIGIN, sameSite:"Lax" }]);
  if (withCart) await context.addInitScript(() => localStorage.setItem("thirdrailify-commerce-cart-v2",JSON.stringify([{productId:"product-1",variantId:"variant-1",quantity:2}])));
  const page = await context.newPage(); const errors=[]; page.on("console",(message)=>{ if(message.type()==="error"&&!message.text().startsWith("Failed to load resource")) errors.push(message.text()); }); page.on("pageerror",(error)=>errors.push(error.message));
  await page.route(IMAGE,(route)=>route.fulfill({status:200,contentType:"image/svg+xml",body:"<svg xmlns='http://www.w3.org/2000/svg' width='600' height='750'><rect width='100%' height='100%' fill='#1a1b13'/><path d='M50 375h500' stroke='#ffd12f' stroke-width='12'/></svg>"}));
  await page.route("**/api/**",async(route)=>{ const url=new URL(route.request().url()); const path=url.pathname;
    if(path==="/api/auth/config") return json(route,{configured:true,emailSignupConfigured:true,turnstileSiteKey:null,oauthProviders:[],oauthProviderStates:[],publicOrigin:ORIGIN,adminOrigin:ORIGIN,environment:"test",cookieMode:"host-only"});
    if(path==="/api/auth/session") return json(route,session());
    if(path==="/api/auth/avatar") return json(route,{ok:false,error:"avatar_source_invalid",message:"The supplied avatar URL did not return an approved image."},422);
    if(path==="/api/account/commerce") return json(route,overview());
    if(path==="/api/account/commerce/orders") return json(route,{ok:true,orders:orders(),total:2,liveCount:1,testCount:1});
    if(path==="/api/account/commerce/orders/ord_account_aaaa1111") return json(route,{ok:true,authority:"Admin Commerce D1",order:orderDetail()});
    if(path.startsWith("/api/account/commerce/")) return json(route,overview());
    if(path==="/api/commerce/catalogue") return json(route,catalogue());
    if(path==="/api/commerce/shipping-quotes") return json(route,{ok:false,error:"shipping_unavailable",message:"Shipping calculation is not available yet."},409);
    if(path==="/api/catalogue/banner") return json(route,{ok:true,normal:{enabled:false,messages:[]},live:{enabled:false}});
    if(path==="/api/watch") return json(route,{available:false,liveNow:[],primary:null,latest:null,upcoming:null});
    return json(route,{ok:false,error:"not_found"},404);
  });
  return {context,page,errors};
}

async function assertPage(page,path) { assert.equal(new URL(page.url()).pathname,path); assert.equal(await page.locator("h1").count(),1); const report=await page.evaluate(()=>({root:document.documentElement.scrollWidth,viewport:document.documentElement.clientWidth,body:document.body.scrollWidth})); assert.ok(report.root<=report.viewport&&report.body<=report.viewport,JSON.stringify(report)); }
function session(){return{ok:true,authenticated:true,account:{id:"account-fixture",email:"verified@example.test",displayName:"Ada Account",username:null,avatarUrl:null,providers:["email","discord"],role:"user",adminLevel:"none",status:"active",emailVerified:true,createdAt:"2026-08-01T00:00:00.000Z",lastLoginAt:"2026-08-30T01:00:00.000Z",source:"test"},access:{isAdmin:false,isMasterAdmin:false},csrfToken:"fixture-csrf"};}
function address(){return{id:"adr_aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",label:"Home",recipientName:"Ada Rail",company:"Third Rail Fixture",address1:"100 Test Street",address2:"Unit 4",city:"London",region:"ON",postalCode:"N6A 1A1",countryCode:"CA",phone:"+1 519 555 0100",isDefault:true,revision:1,createdAt:"2026-08-29T00:00:00.000Z",updatedAt:"2026-08-29T00:00:00.000Z",externallyVerified:false};}
function orders(){return[{id:"ord_account_aaaa1111",reference:"TR-AAAA1111",environment:"test",orderStatus:"checkout_created",paymentStatus:"paid",fulfillmentStatus:"unfulfilled",itemCount:2,totalAmount:6995,refundAmount:0,currencyCode:"CAD",createdAt:"2026-08-29T01:00:00.000Z",updatedAt:"2026-08-29T01:05:00.000Z",paymentConfirmedAt:"2026-08-29T01:05:00.000Z",trackingAvailable:false},{id:"ord_account_bbbb2222",reference:"TR-BBBB2222",environment:"live",orderStatus:"checkout_created",paymentStatus:"pending",fulfillmentStatus:"unfulfilled",itemCount:1,totalAmount:3495,refundAmount:0,currencyCode:"CAD",createdAt:"2026-08-28T01:00:00.000Z",updatedAt:"2026-08-28T01:00:00.000Z",paymentConfirmedAt:null,trackingAvailable:false}];}
function overview(){return{ok:true,authority:"Admin Commerce D1",linked:true,contact:{name:"Ada Rail",phone:"+1 519 555 0100",email:"verified@example.test",emailVerified:true,revision:1},addresses:[address()],orders:orders(),summary:{savedAddressCount:1,orderCount:2,liveOrderCount:1,testOrderCount:1},checkout:{enabled:false,livePaymentCaptureEnabled:false,fulfillmentSubmissionEnabled:false,shippingConfigured:false,message:"Checkout is currently unavailable. No order or payment can be created."}};}
function orderDetail(){return{id:"ord_account_aaaa1111",reference:"TR-AAAA1111",environment:"test",checkoutStatus:"checkout_created",paymentStatus:"paid",fulfillmentStatus:"unfulfilled",currencyCode:"CAD",createdAt:"2026-08-29T01:00:00.000Z",updatedAt:"2026-08-29T01:05:00.000Z",paymentConfirmedAt:"2026-08-29T01:05:00.000Z",items:[{id:"item-1",productId:"product-1",variantId:"variant-1",title:"Signal Tee",variant:"M / Black",options:{Size:"M",Color:"Black"},image:IMAGE,unitAmount:3050,quantity:2,lineTotalAmount:6100,currencyCode:"CAD"}],financial:{subtotalAmount:6100,shippingAmount:895,taxAmount:null,totalAmount:6995,refundAmount:0,netAmount:6995,currencyCode:"CAD"},delivery:{address:{recipientName:"Ada Rail",company:"Third Rail Fixture",address1:"100 Test Street",address2:"Unit 4",city:"London",region:"ON",postalCode:"N6A 1A1",countryCode:"CA",phone:"+1 519 555 0100"},method:"Standard delivery",amount:895,currencyCode:"CAD",capturedAt:"2026-08-29T01:00:00.000Z",historicalSnapshot:true,externallyVerified:false},shipments:[],timeline:[{at:"2026-08-29T01:00:00.000Z",label:"Order recorded",state:"checkout_created"},{at:"2026-08-29T01:05:00.000Z",label:"Payment confirmed",state:"paid"}]};}
function catalogue(){return{ok:true,source:"commerce-d1",currency:"CAD",checkoutEnabled:false,updatedAt:"2026-08-30T00:00:00.000Z",collections:[],products:[{id:"product-1",slug:"signal-tee",title:"Signal Tee",description:"Fixture product.",images:[IMAGE],categories:["Apparel"],collectionSlugs:[],tags:[],featured:false,featuredOrder:null,displayOrder:10,maxQuantity:5,available:true,price:{minUnitAmount:3050,maxUnitAmount:3050,label:"CA$30.50"},variants:[{id:"variant-1",label:"M / Black",size:"M",color:"Black",options:{Size:"M",Color:"Black"},unitAmount:3050,currency:"CAD",availability:"active"}]}]};}
function json(route,body,status=200){return route.fulfill({status,contentType:"application/json",body:JSON.stringify(body)});}
async function waitForServer(){for(let attempt=0;attempt<100;attempt+=1){try{if((await fetch(ORIGIN)).ok)return;}catch{/* starting */}await new Promise((resolve)=>setTimeout(resolve,100));}throw new Error("Account V2 browser server did not start.");}
