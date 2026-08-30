import assert from "node:assert/strict";
import test from "node:test";
import { normalizeCapture, normalizeConfig, normalizeCreate, normalizePaymentStatus, proxyPayPalPost } from "../functions/_shared/paypal-commerce-proxy.js";

const PUBLIC="https://thirdrailify.pages.dev",ADMIN="https://thirdrailify-admin.pages.dev";

test("PayPal configuration normalization exposes only browser-safe state",()=>{
  const result=normalizeConfig({ok:true,provider:"paypal",preferred:true,environment:"sandbox",currency:"CAD",intent:"CAPTURE",clientId:null,configured:false,webhookConfigured:false,storeCheckoutEnabled:false,donationsEnabled:false,emergencyPaused:false,stripe:{configured:true,enabled:false,preferred:false},message:"PayPal credentials are not configured.",clientSecret:"must-not-project",accessToken:"must-not-project"});
  assert.deepEqual(Object.keys(result).sort(),["clientId","configured","currency","donationsEnabled","emergencyPaused","environment","intent","message","ok","preferred","provider","storeCheckoutEnabled","stripe","webhookConfigured"]);
  assert.doesNotMatch(JSON.stringify(result),/secret|token/i);
});

test("PayPal create, capture, and status projections reject provider extras",()=>{
  assert.deepEqual(normalizeCreate({ok:true,provider:"paypal",attemptId:"pat_safe-reference",orderId:"PAYPALORDER001",target:"donation",reference:"don_safe-reference",environment:"sandbox",currency:"CAD",amount:1500,payer:{email:"private"}}),{ok:true,provider:"paypal",attemptId:"pat_safe-reference",orderId:"PAYPALORDER001",target:"donation",reference:"don_safe-reference",environment:"sandbox",currency:"CAD",amount:1500});
  assert.equal(normalizeCapture({ok:true,attemptId:"pat_safe-reference",kind:"donation",reference:"don_safe-reference",status:"completed",captureId:"private"}).status,"completed");
  assert.equal(normalizePaymentStatus({ok:true,payment:{reference:"pat_safe-reference",kind:"donation",orderReference:null,donationReference:"don_safe-reference",environment:"sandbox",currency:"CAD",amount:1500,status:"pending",updatedAt:"2026-08-30T00:00:00Z",providerOrderId:"private"}}).payment.status,"pending");
  assert.throws(()=>normalizeCreate({ok:true,provider:"paypal",attemptId:"bad",orderId:"ORDER",target:"store",reference:"ord_safe",environment:"sandbox",currency:"CAD",amount:100}));
});

test("PayPal POST proxy enforces Public origin and forwards only the bounded request",async()=>{
  const env={THIRDRAILIFY_PUBLIC_ORIGIN:PUBLIC,THIRDRAILIFY_ADMIN_ORIGIN:ADMIN};let observed;
  const fetchImpl=async(url,init)=>{observed={url,method:init.method,origin:new Headers(init.headers).get("Origin"),body:init.body};return Response.json({ok:true,provider:"paypal",attemptId:"pat_safe-reference",orderId:"PAYPALORDER001",target:"donation",reference:"don_safe-reference",environment:"sandbox",currency:"CAD",amount:1500},{status:201});};
  const request=new Request(`${PUBLIC}/api/commerce/paypal/donation`,{method:"POST",headers:{Origin:PUBLIC,"Content-Type":"application/json"},body:JSON.stringify({donationRequestId:"11111111-1111-4111-8111-111111111111",amountMinor:1500})});
  const response=await proxyPayPalPost(env,request,"/api/commerce/paypal/donation",fetchImpl);assert.equal(response.status,201);assert.deepEqual(observed,{url:`${ADMIN}/api/commerce/paypal/donation`,method:"POST",origin:PUBLIC,body:JSON.stringify({donationRequestId:"11111111-1111-4111-8111-111111111111",amountMinor:1500})});
  const rejected=await proxyPayPalPost(env,new Request(`${PUBLIC}/api/commerce/paypal/donation`,{method:"POST",headers:{Origin:"https://evil.example","Content-Type":"application/json"},body:"{}"}),"/api/commerce/paypal/donation",async()=>{throw new Error("must not call");});assert.equal(rejected.status,403);
});
