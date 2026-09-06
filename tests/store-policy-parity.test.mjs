import assert from "node:assert/strict";
import test from "node:test";
import {policyDocuments} from "../src/content/policies.ts";
import {COMMERCE_POLICIES} from "../../ThirdRailify-Admin/functions/_shared/commerce-policy-snapshot.js";
test("retained server agreement policies match the actual Public policy versions and full text",()=>{for(const k of ["terms","privacy","refunds"]){const p=policyDocuments[k];assert.deepEqual(COMMERCE_POLICIES[k],{version:p.revision,url:p.slug,title:p.title,sections:p.sections});assert.match(p.slug,/^\/[a-z]+$/);}assert.match(JSON.stringify(COMMERCE_POLICIES),/worldwide/);});
