import { checkLocalityAutocomplete } from "../../tests/helpers/locality-browser.mjs";
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
    if(path==="/api/commerce/shipping-markets") return json(route,{ok:true,authority:"Commerce D1",markets:[{countryCode:"CA",displayName:"Canada"},{countryCode:"US",displayName:"United States"}]});
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

const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "4201"], {stdio:"ignore", windowsHide:true});
let browser;
try {
 await waitForServer();
 browser=await chromium.launch({executablePath:CHROME,headless:true});
 for(const width of [1440,390]) {
  const {context,page}=await fixturePage(browser,width,900,true);
  await page.goto(`${ORIGIN}/account/delivery`);
  await page.getByRole("button",{name:"Add address",exact:true}).click();
  await checkLocalityAutocomplete(page,`output/locality-autocomplete/account-${width}.png`);
  await page.getByRole("button",{name:"Close address editor"}).click();
  await page.goto(`${ORIGIN}/checkout`);
  await page.getByRole("radio",{name:/Add another address/}).click();
  await checkLocalityAutocomplete(page,`output/locality-autocomplete/checkout-${width}.png`);
  await context.close();
 }
 console.log("Corrected opaque dropdown verified: Account and signed-in Checkout at 390px and 1440px.");
} finally { await browser?.close(); server.kill(); }
