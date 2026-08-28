# Third Railify Canadian legal release checklist

Internal release record for owner and qualified Canadian legal review. It is not rendered by the Public application, is not legal advice, and does not certify compliance.

## Release summary

- **ENGINEERING-OWNED OPEN BLOCKERS: 0**
- **OWNER-DECISION OPEN BLOCKERS: 8**
- **LEGAL-REVIEW OPEN BLOCKERS: 6**
- **EXTERNAL/PROVIDER REVIEW OPEN BLOCKERS: 1** (the provider-contract gate is also one of the six legal-review matters)

Engineering evidence and procedures: [contact roles](CONTACT_ROLE_MATRIX.md), [privacy operations](PRIVACY_OPERATIONS_RUNBOOK.md), [retention](DATA_RETENTION_MATRIX.md), [provider/data flows](THIRD_PARTY_DATA_PROCESSING.md), [checkout gates](CHECKOUT_RELEASE_GATES.md), and the Admin [commerce support runbook](../ThirdRailify-Admin/COMMERCE_SUPPORT_RUNBOOK.md).

## Operator and jurisdiction

- **CONFIRMED — Canadian owner and operating base:** the owner has confirmed that Third Railify is legally owned and operated by Shawn from London, Ontario, Canada. Public commerce uses the trading presentation `Third Railify Official`, country `CA`, and authoritative currency `CAD`.
- **CONFIRMED — owner safety boundary:** Shawn is on-screen talent and intentionally keeps his surname private for personal security. Public policies use only the established professional name `Shawn`; do not publish, infer, or expose a surname from non-public records.
- **NEEDS OWNER CONFIRMATION — legal/contracting form and address:** confirm the seller's contracting form, how `Third Railify`, `Third Railify Official`, and Brainstream Media Group relate, and any approved service, mailing, or legal-notice address that must be published. No entity type, incorporation status, registration number, surname, or address is invented.
- **CONFIRMED — operating province:** London, Ontario is the owner-confirmed operating base. The former `CONFIRM CANADIAN OPERATING / CONTRACTING PROVINCE` blocker is resolved for this audit; the exact contracting form still requires confirmation.
- **NEEDS LEGAL REVIEW — Ontario regimes:** Ontario has no general private-sector privacy statute replacing PIPEDA for ordinary commercial businesses. Review PIPEDA scope and any sector-specific Ontario rules, plus the in-force Consumer Protection Act, 2002 internet-agreement, disclosure, cancellation, warranty, and remedy requirements before checkout. The Consumer Protection Act, 2023 was verified as not yet in force on the audit date.
- **NEEDS OWNER CONFIRMATION — contact operations:** confirm which of the currently published Third Railify contact addresses are actively monitored and which should remain customer-facing. Source proves that Admin uses `alerts@notify.thirdrailify.com` as transactional `FROM` and `info@thirdrailify.com` as `REPLY-TO`; it does not prove mailbox monitoring. See [CONTACT_ROLE_MATRIX.md](CONTACT_ROLE_MATRIX.md).
- **NEEDS LEGAL REVIEW — tax/business identifiers:** determine whether a Canadian Business Number or GST/HST/QST/PST registration detail must be displayed for the final entity and sales footprint. None is invented or exposed from encrypted Admin fields.

## Privacy accountability and operations

- **CONFIRMED — PIPEDA baseline:** Ontario's Information and Privacy Commissioner directs ordinary private-sector business privacy issues to PIPEDA and the federal OPC. Public wording applies PIPEDA to covered commercial handling while preserving qualifications for statutory scope, exceptions, sector-specific rules, and other jurisdictions.
- **NEEDS OWNER CONFIRMATION — privacy accountability contact:** designate the individual or role accountable for privacy management. The Public request channel is `privacy@thirdrailify.com`; no person, privacy officer, or data protection officer has been invented.
- **ENGINEERING COMPLETE — LEGAL REVIEW REQUIRED — request and incident procedures:** [PRIVACY_OPERATIONS_RUNBOOK.md](PRIVACY_OPERATIONS_RUNBOOK.md) now provides concrete access, correction, withdrawal, account, GOATS, interaction, order, incident, credential-exposure, identity-verification, audit, deletion-capability and legal-hold workflows. Counsel must approve legal exceptions, response/notification duties, preservation, identity evidence and final procedure.
- **ENGINEERING COMPLETE — LEGAL REVIEW REQUIRED — provider and international processing:** [THIRD_PARTY_DATA_PROCESSING.md](THIRD_PARTY_DATA_PROCESSING.md) records actual purposes, routes, information categories, browser/server direction and consent posture. Externally verify live contracts/DPAs, subprocessors, regional settings, processing locations, deletion/incident terms and applicable safeguards. No country or transfer mechanism is invented.
- **ENGINEERING COMPLETE — OWNER SIGN-OFF REQUIRED — operational retention schedule:** [DATA_RETENTION_MATRIX.md](DATA_RETENTION_MATRIX.md) identifies every implemented TTL/cap, cleanup mechanism and category with `NO FIXED APPLICATION RETENTION POLICY CONFIRMED`. The owner must approve the business schedule after qualified legal review; engineering must then implement only the approved rules.
- **CONFIRMED — implemented fixed periods:** sessions are eight hours; handoffs five minutes; OAuth transactions ten minutes; password resets thirty minutes; email verification twenty-four hours; unfinalised GOATS drafts twenty-four hours; privacy choices 183 days; Watch archive 24 public programme records.
- **CONFIRMED — consent schema:** `CONSENT_VERSION` remains `1`. The rewrite adds no category, purpose, vendor, storage key, cookie, or tracker.
- **CONFIRMED — automated security boundary:** Turnstile and rate limits may challenge or temporarily block a request but are not implemented as solely automated personal decisions with legal or similarly significant effect. A support route is disclosed.
- **NEEDS OWNER CONFIRMATION — minors:** no age gate, date of birth, minimum age, parental-consent workflow or age-restricted product was found. Confirm the intended minimum age, if any, for account creation, GOATS submissions and purchases, and whether any parental-consent workflow is intended.

## Commerce and consumer release

- **CONFIRMED — current gate:** normal Public checkout and fulfilment submission are disabled. The operator-only Stripe path uses sandbox funds and cannot start fulfilment.
- **CONFIRMED — price presentation:** CAD is authoritative; optional foreign-currency displays are marked approximate; the cart shows product/variant/quantity and CAD subtotal; no application-level sale or compare-at field was found in the Public catalogue projection.
- **ENGINEERING COMPLETE — LEGAL REVIEW REQUIRED — federal/Ontario activation:** [CHECKOUT_RELEASE_GATES.md](CHECKOUT_RELEASE_GATES.md) records implementation status for seller identity, price, tax, fees, shipping/duties, product/variant/quantity, payment, correction, confirmation, cancellation, fulfilment, delivery, remedies, Privacy, Terms, final total and drip-pricing controls. Normal checkout remains disabled. Counsel must approve the final in-force Ontario/federal and other launch-market implementation before activation.
- **NEEDS OWNER CONFIRMATION — sales footprint:** no allowed-country/province list, shipping destination, address-validation or tax market is selected. Confirm the provinces/countries that Third Railify intends to accept orders from at launch.
- **NEEDS OWNER CONFIRMATION — voluntary change of mind:** Choose whether Third Railify will offer any voluntary change-of-mind return policy in addition to mandatory legal remedies. No return window is implemented or promised.
- **NEEDS OWNER CONFIRMATION — remedies:** Admin provides bounded read-only order/payment/webhook/fulfilment evidence but no refund, cancellation, replacement, retry, shipment, dispute or Printful-claim mutation. Confirm business authority and outcomes for these remedies. See the Admin [COMMERCE_SUPPORT_RUNBOOK.md](../ThirdRailify-Admin/COMMERCE_SUPPORT_RUNBOOK.md).
- **NOT APPLICABLE — current customer checkout collection:** the controlled test Stripe request does not ask for customer email, shipping address, or billing address. Re-audit the final schema and collection notice before customer checkout is enabled.
- **NOT APPLICABLE — current paid plans:** VIP, memberships, gift cards, recurring billing, donations with benefits, and paid digital access are not operational. Create specific terms before activating any of them.

## Email and international scope

- **CONFIRMED — CASL implementation finding:** code inspection found account verification/reset, GOATS submission/moderation, and prepared transaction/service messages. No connected newsletter or promotional-email sending feature was found; the visible newsletter control is disabled.
- **NOT APPLICABLE — marketing consent UI:** no promotional commercial electronic messaging feature is operational, so no newsletter consent or unsubscribe system was invented. Reassess consent, sender identification, unsubscribe, suppression, and evidence before sending marketing messages.
- **ENGINEERING COMPLETE — LEGAL REVIEW REQUIRED — EU/UK scope and representatives:** the site is globally reachable, accounts are technically available, EUR/GBP are optional approximate displays, checkout is disabled, launch shipping countries are unconfirmed, no EU/UK localisation or targeted marketing sender was found, and external media is consent-gated. Counsel must determine territorial scope and any representative requirement after market plans are final. No representative is named.

## Required handoff actions before production cutover

These acceptance rows restate the substantive gates above and are not counted again in the release summary.

- **NEEDS OWNER CONFIRMATION — final owner approval:** approve the resolved business decisions and production cutover only after the evidence below is current.
- **NEEDS LEGAL REVIEW — Canadian privacy:** review PIPEDA applicability, accountability, requests/incidents, retention and any sector-specific Ontario scope.
- **NEEDS LEGAL REVIEW — consumer/e-commerce:** review Ontario/federal requirements and every other owner-selected launch territory against the final checkout design.
- **NEEDS OWNER CONFIRMATION — privacy accountability:** designate the accountable individual or role without publishing Shawn's surname.
- **ENGINEERING COMPLETE — LEGAL REVIEW REQUIRED — providers:** complete the external contract, processing-location, subprocessor and safeguards review from the technical dossier.
- **ENGINEERING COMPLETE — OWNER SIGN-OFF REQUIRED — operations:** approve the retention matrix and privacy/commerce procedures after legal review.
- **RELEASE BLOCKER — final activated-flow audit:** after an owner/counsel-approved checkout and fulfilment design exists, complete collection-point, provider, order-confirmation and browser acceptance before activation. Normal checkout remains disabled.
- **CONFIRMED — current Public browser acceptance:** the unchanged legal-page runtime passed the previous stable/immutable acceptance on deployment `acf59157-2f67-4308-9c8a-0653319450ce`; this milestone re-runs desktop/mobile acceptance and records current evidence in its completion report.
