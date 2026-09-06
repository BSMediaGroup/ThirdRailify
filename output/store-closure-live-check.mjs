import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {chromium} from 'playwright-core';
const origin='https://thirdrailify.com';
const evidence=[];
for(const path of ['/api/commerce/payment-config','/api/commerce/shipping-markets','/api/commerce/catalogue']) {
  const response=await fetch(origin+path,{signal:AbortSignal.timeout(15000)});
  assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/application\/json/);
  const data=await response.json();
  assert.doesNotMatch(JSON.stringify(data),/private_phone|privatePhone|private_address|privateAddress|ciphertext|legalBusinessName/);
  evidence.push({path,status:response.status,data:path.endsWith('payment-config')?data:path.endsWith('shipping-markets')?{destinations:data.markets?.length}:undefined});
}
const protectedResponse=await fetch('https://admin.thirdrailify.com/api/admin/commerce/launch/activate',{method:'POST',headers:{Origin:'https://admin.thirdrailify.com','Content-Type':'application/json'},body:'{}',signal:AbortSignal.timeout(15000)});
assert.equal(protectedResponse.status,401);evidence.push({protectedLaunchStatus:protectedResponse.status});
const browser=await chromium.launch({executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',headless:true});
try {
 for(const width of [1440,390]) {
  const context=await browser.newContext({viewport:{width,height:1000}});
  let providerRequests=0;
  await context.route('**/*',route=>{
   const url=new URL(route.request().url());
   if(/(^|\.)(paypal\.com|paypalobjects\.com|stripe\.com|printful\.com|resend\.com)$/.test(url.hostname)){providerRequests++;return route.abort();}
   return route.continue();
  });
  const page=await context.newPage();await page.goto(origin+'/checkout',{waitUntil:'domcontentloaded',timeout:20000});
  await page.locator('main').waitFor({timeout:10000});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.screenshot({path:`output/store-launch/closure-live-checkout-${width}.png`,fullPage:true});
  evidence.push({width,checkoutRendered:true,headings:await page.locator('main h1,main h2').allTextContents(),providerRequestsBlocked:providerRequests});await context.close();
 }
} finally {await browser.close();}
await writeFile('output/store-closure-live-check.json',JSON.stringify(evidence,null,2));
console.log(JSON.stringify(evidence,null,2));
