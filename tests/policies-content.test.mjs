import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("legal copy reflects the audited implementation and qualified legal posture", async () => {
  const [policies, consent] = await Promise.all([
    read("src/content/policies.ts"),
    read("src/privacy/consent.ts"),
  ]);

  assert.match(consent, /CONSENT_VERSION = 1/, "legal clarification must not silently change consent schema");
  for (const phrase of [
    "thirdrailify_session", "thirdrailify_consent", "thirdrailify-commerce-cart-v2",
    "thirdrailify.storefront.currency.v1", "thirdrailify.storefront.currency-rates.v1", "thirdrailify-goats-draft-v2",
  ]) assert.ok(policies.includes(phrase), `privacy copy represents ${phrase}`);

  assert.match(policies, /YouTube privacy-enhanced and Rumble iframes do not exist before External media consent/);
  assert.match(policies, /Email privacy@thirdrailify\.com/);
  assert.match(policies, /Privacy complaints/);
  assert.match(policies, /International processing and disclosure/);
  assert.match(policies, /Third Railify is a Canadian business/);
  assert.match(policies, /owned and operated by Shawn from London, Ontario, Canada/);
  assert.match(policies, /established public professional name “Shawn”/);
  assert.doesNotMatch(policies, /owned and operated by Shawn [A-Z][a-z]+/);
  assert.match(policies, /Where the Personal Information Protection and Electronic Documents Act \(PIPEDA\) applies/);
  assert.match(policies, /Consent and meaningful choices/);
  assert.match(policies, /Office of the Privacy Commissioner of Canada/);
  assert.match(policies, /Where EU GDPR or UK data-protection law applies/);

  assert.match(policies, /Nothing in these Terms limits rights or remedies that cannot lawfully be excluded under consumer protection laws that apply to you/);
  assert.match(policies, /CAD is the authoritative storefront currency/);
  assert.match(policies, /attainable item price/);
  assert.match(policies, /sale, comparison-price, or savings claim must be genuine/);
  assert.match(policies, /You keep ownership of content you submit/);
  assert.match(policies, /does not transfer ownership, grant unrelated sale rights, or grant AI-training rights/);

  assert.match(policies, /Statutory and consumer-guarantee remedies/);
  assert.match(policies, /Voluntary change-of-mind policy/);
  assert.match(policies, /does not currently offer a general voluntary return entitlement/);
  assert.match(policies, /damaged, contains the wrong item, has a manufacturing defect, does not arrive/);
  assert.match(policies, /Nothing in this policy limits rights or remedies that cannot lawfully be excluded under applicable consumer protection law/);

  const prohibited = [
    /all sales final/i,
    /under no circumstances/i,
    /guaranteed legal compliance/i,
    /Australian Consumer Law/i,
    /Australian Privacy Principles/i,
    /Privacy Act 1988/i,
    /\bACCC\b/i,
    /\bOAIC\b/i,
    /our data protection officer/i,
    /our EU representative/i,
    /our UK representative/i,
    /\bABN\b/i,
    /\bACN\b/i,
    /governed by the laws of (Ontario|Alberta|British Columbia|Quebec|Québec)/i,
  ];
  for (const pattern of prohibited) assert.doesNotMatch(policies, pattern);
});

test("material collection points link to the canonical Privacy Policy", async () => {
  const [auth, account, submit, detail] = await Promise.all([
    read("src/auth/AuthDialog.tsx"),
    read("src/pages/AccountPage.tsx"),
    read("src/pages/GoatSubmitPage.tsx"),
    read("src/pages/GoatDetailPage.tsx"),
  ]);
  assert.match(auth, /to="\/privacy"/);
  assert.match(account, /to="\/privacy#accounts-authentication"/);
  assert.match(submit, /to="\/privacy#community-publication"/);
  assert.match(detail, /to="\/privacy#community-publication"/);
});

test("legal release gates stay tied to configured implementation facts", async () => {
  const [policies, home, contactDialog, contactClient, cart, currency, consent, checklist, contacts, retention, providers, checkout] = await Promise.all([
    read("src/content/policies.ts"),
    read("src/pages/HomePage.tsx"),
    read("src/contact/ContactDialog.tsx"),
    read("src/contact/client.ts"),
    read("src/store/cart.tsx"),
    read("src/components/CurrencyPrice.tsx"),
    read("src/privacy/consent.ts"),
    read("LEGAL_RELEASE_CHECKLIST.md"),
    read("CONTACT_ROLE_MATRIX.md"),
    read("DATA_RETENTION_MATRIX.md"),
    read("THIRD_PARTY_DATA_PROCESSING.md"),
    read("CHECKOUT_RELEASE_GATES.md"),
  ]);

  assert.match(home, /className="contact-band"/);
  assert.match(home, /to="\/donate"/);
  assert.doesNotMatch(home, /newsletter/i, "the retired newsletter scaffold is absent");
  assert.match(contactDialog, /thirdrailify-contact/);
  assert.match(contactClient, /fetch\("\/api\/contact"/);
  assert.doesNotMatch(`${contactDialog}\n${contactClient}`, /thirdmailify|CONTACT_CC_EMAIL|RESEND_API_KEY/i, "contact recipients and provider credentials stay server-side");
  assert.match(cart, /thirdrailify-commerce-cart-v2/);
  assert.match(currency, /Approximate/);
  assert.match(consent, /CONSENT_VERSION = 1/);

  assert.match(checklist, /ENGINEERING-OWNED OPEN BLOCKERS: 0/);
  assert.match(checklist, /OWNER-DECISION OPEN BLOCKERS: 8/);
  assert.match(checklist, /LEGAL-REVIEW OPEN BLOCKERS: 6/);
  assert.match(checklist, /EXTERNAL\/PROVIDER REVIEW OPEN BLOCKERS: 1/);
  assert.match(checklist, /Confirm the intended minimum age, if any/);
  assert.match(checklist, /Choose whether Third Railify will offer any voluntary change-of-mind return policy/);
  assert.match(retention, /NO FIXED APPLICATION RETENTION POLICY CONFIRMED/);
  assert.match(providers, /No processing country, residency commitment, DPA/);
  assert.match(checkout, /Normal Public checkout and fulfilment must remain disabled/);

  const approvedContacts = new Set([
    "privacy@thirdrailify.com", "support@thirdrailify.com", "access@thirdrailify.com",
    "webmaster@thirdrailify.com", "info@thirdrailify.com",
  ]);
  for (const address of policies.match(/[a-z][a-z0-9.-]*@thirdrailify\.com/gi) || []) {
    assert.equal(approvedContacts.has(address.toLowerCase()), true, `Public policy contact ${address} is in the audited matrix`);
  }
  for (const address of approvedContacts) assert.ok(contacts.includes(address));

  for (const pattern of [
    /Third Railify (?:is|operates as) (?:a )?(?:corporation|partnership|sole proprietorship)/i,
    /Canadian (?:business |registration )?(?:number|no\.)\s*[:#]?\s*\d/i,
    /must be (?:at least )?(?:13|16|18|19)\b/i,
    /returns? (?:are )?(?:accepted|available) within \d+ days/i,
    /our (?:EU|UK) representative/i,
  ]) assert.doesNotMatch(policies, pattern);
});
