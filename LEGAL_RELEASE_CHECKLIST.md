# Third Railify Canadian legal release checklist

Internal release record for owner and qualified Canadian legal review. It is not rendered by the Public application, is not legal advice, and does not certify compliance.

## Operator and jurisdiction

- **CONFIRMED — Canadian owner and operating base:** the owner has confirmed that Third Railify is legally owned and operated by Shawn from London, Ontario, Canada. Public commerce uses the trading presentation `Third Railify Official`, country `CA`, and authoritative currency `CAD`.
- **CONFIRMED — owner safety boundary:** Shawn is on-screen talent and intentionally keeps his surname private for personal security. Public policies use only the established professional name `Shawn`; do not publish, infer, or expose a surname from non-public records.
- **NEEDS OWNER CONFIRMATION — legal/contracting form:** confirm whether the seller contracts as an individual/sole proprietor, registered business name, partnership, or corporation, and document how `Third Railify`, `Third Railify Official`, and Brainstream Media Group relate. No entity type or registration number is invented.
- **CONFIRMED — operating province:** London, Ontario is the owner-confirmed operating base. The former `CONFIRM CANADIAN OPERATING / CONTRACTING PROVINCE` blocker is resolved for this audit; the exact contracting form still requires confirmation.
- **NEEDS OWNER CONFIRMATION — incorporation and address:** confirm province of incorporation where relevant and approve a service, mailing, or legal-notice address if one must be published.
- **NEEDS LEGAL REVIEW — Ontario regimes:** Ontario has no general private-sector privacy statute replacing PIPEDA for ordinary commercial businesses. Review PIPEDA scope and any sector-specific Ontario rules, plus the in-force Consumer Protection Act, 2002 internet-agreement, disclosure, cancellation, warranty, and remedy requirements before checkout. The Consumer Protection Act, 2023 was verified as not yet in force on the audit date.
- **NEEDS OWNER CONFIRMATION — contact operations:** verify that `privacy@thirdrailify.com`, `support@thirdrailify.com`, `access@thirdrailify.com`, and `webmaster@thirdrailify.com` are monitored; reconcile Admin's `info@thirdrailify.com` commerce/GOATS reply-to configuration.
- **NEEDS LEGAL REVIEW — tax/business identifiers:** determine whether a Canadian Business Number or GST/HST/QST/PST registration detail must be displayed for the final entity and sales footprint. None is invented or exposed from encrypted Admin fields.

## Privacy accountability and operations

- **CONFIRMED — PIPEDA baseline:** Ontario's Information and Privacy Commissioner directs ordinary private-sector business privacy issues to PIPEDA and the federal OPC. Public wording applies PIPEDA to covered commercial handling while preserving qualifications for statutory scope, exceptions, sector-specific rules, and other jurisdictions.
- **NEEDS OWNER CONFIRMATION — privacy accountability contact:** designate the individual or role accountable for privacy management. The Public request channel is `privacy@thirdrailify.com`; no person, privacy officer, or data protection officer has been invented.
- **NEEDS LEGAL REVIEW — request and incident procedures:** establish documented access, correction, withdrawal, complaint, identity-verification, breach, legal-hold, and deletion procedures behind the Public contact path without collecting unnecessary identification.
- **NEEDS LEGAL REVIEW — provider and international processing:** review contracts, subprocessors, regional settings, processing locations, and safeguards for Cloudflare, Resend, Stripe, Printful, identity providers, YouTube, Rumble, OpenFreeMap, and other applicable recipients. No universal transfer mechanism or processing-country list is claimed.
- **NEEDS OWNER CONFIRMATION — operational retention schedule:** approve deletion/retention rules for accounts; expired sessions and tokens; security, rate-limit, and audit records; final GOATS records and media; comments/reactions; transactional email; correspondence; commerce, webhook, order, refund, and fulfilment records; and backups.
- **CONFIRMED — implemented fixed periods:** sessions are eight hours; handoffs five minutes; OAuth transactions ten minutes; password resets thirty minutes; email verification twenty-four hours; unfinalised GOATS drafts twenty-four hours; privacy choices 183 days; Watch archive 24 public programme records.
- **CONFIRMED — consent schema:** `CONSENT_VERSION` remains `1`. The rewrite adds no category, purpose, vendor, storage key, cookie, or tracker.
- **CONFIRMED — automated security boundary:** Turnstile and rate limits may challenge or temporarily block a request but are not implemented as solely automated personal decisions with legal or similarly significant effect. A support route is disclosed.
- **NEEDS OWNER CONFIRMATION — minors:** confirm the intended minimum account, submission, and purchase age and any parental-permission process.

## Commerce and consumer release

- **CONFIRMED — current gate:** normal Public checkout and fulfilment submission are disabled. The operator-only Stripe path uses sandbox funds and cannot start fulfilment.
- **CONFIRMED — price presentation:** CAD is authoritative; optional foreign-currency displays are marked approximate; the cart shows product/variant/quantity and CAD subtotal; no application-level sale or compare-at field was found in the Public catalogue projection.
- **NEEDS LEGAL REVIEW — federal/Ontario activation:** before enabling checkout, verify Competition Act attainable-price and genuine-discount requirements together with the in-force Ontario internet-agreement disclosure, confirmation, correction, cancellation, and refund rules.
- **NEEDS OWNER CONFIRMATION — sales footprint:** identify every province, country, or region intentionally offered normal checkout and Printful shipping. Site reachability and optional currency display do not establish an intended market.
- **NEEDS OWNER CONFIRMATION — voluntary change of mind:** approve the launch rule. Public copy currently offers no general voluntary return entitlement because no owner-approved period exists; this does not limit mandatory remedies.
- **NEEDS LEGAL REVIEW — checkout disclosure:** approve seller identity, CAD price, taxes, mandatory fees, shipping, duties, delivery estimates, payment, cancellation, and fulfilment disclosures before checkout activation.
- **NEEDS OWNER CONFIRMATION — remedies:** confirm operational authority and workflows for repair, replacement, refund, cancellation, missing shipments, disputes, and Printful claims without shifting seller responsibility to Printful.
- **NOT APPLICABLE — current customer checkout collection:** the controlled test Stripe request does not ask for customer email, shipping address, or billing address. Re-audit the final schema and collection notice before customer checkout is enabled.
- **NOT APPLICABLE — current paid plans:** VIP, memberships, gift cards, recurring billing, donations with benefits, and paid digital access are not operational. Create specific terms before activating any of them.

## Email and international scope

- **CONFIRMED — CASL implementation finding:** code inspection found account verification/reset, GOATS submission/moderation, and prepared transaction/service messages. No connected newsletter or promotional-email sending feature was found; the visible newsletter control is disabled.
- **NOT APPLICABLE — marketing consent UI:** no promotional commercial electronic messaging feature is operational, so no newsletter consent or unsubscribe system was invented. Reassess consent, sender identification, unsubscribe, suppression, and evidence before sending marketing messages.
- **NEEDS LEGAL REVIEW — EU/UK territorial scope:** determine whether Third Railify intentionally offers goods/services to or monitors people in the EEA or UK after sales, shipping, localisation, and marketing plans are final. Public wording says only `Where EU or UK data protection law applies`.
- **NEEDS LEGAL REVIEW — EU/UK representatives:** if territorial scope is established, determine whether an EU or UK representative is required. No representative is documented or named publicly.

## Required sign-off before production cutover

- [ ] Operator/business owner approval
- [ ] Qualified Canadian privacy review, including PIPEDA and any sector-specific Ontario scope
- [ ] Qualified Ontario consumer/e-commerce review and review for other launch territories
- [ ] Privacy accountability contact designated
- [ ] Provider contract, processing-location, and safeguards review
- [ ] Retention and request-handling procedures approved
- [ ] Checkout/fulfilment and collection-point audit completed after final activation design
- [x] Final browser, route, consent, and no-overflow acceptance completed on stable and immutable deployment `acf59157-2f67-4308-9c8a-0653319450ce`
