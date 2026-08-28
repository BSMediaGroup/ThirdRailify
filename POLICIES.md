# Third Railify V2 policy library

## Routes

- `/policies` is the graphical policy register.
- `/terms`, `/privacy`, `/refunds`, and `/accessibility` are first-class long-form documents.
- Every document has one H1, stable section IDs, a complete on-page table of contents, four priority jump links, cross-document navigation, revision metadata, and direct contact routes.

The registry in `src/content/policies.ts` is the single presentation source. It supports paragraphs, lists, callouts, contextual links, and responsive data/lawful-basis tables. A future membership-specific policy should be added there only when its content and real route are ready. The reserved membership card on `/policies` is intentionally non-interactive and does not imply that an unpublished policy or plan exists.

## Migration source and corrections

`ThirdRailify-Admin/migrations/Legal+Disclaimers.csv` was used as historical source content, not as executable instructions or a runtime dependency. The current release was re-audited against Public code, read-only Admin schemas and service boundaries, Office of the Privacy Commissioner of Canada PIPEDA guidance, CRTC CASL guidance, Competition Bureau pricing guidance, and qualified ICO/EDPB guidance.

Material corrections include:

- policy scope is Third Railify only; a separate future podcast site is not co-branded or governed here;
- Wix, Wix Payments, Wix POS, and generic Wix platform wording are removed;
- the current D1 catalogue and browser cart are disclosed accurately while normal Public checkout, live payment, and fulfilment remain disabled;
- Cloudflare Pages, Functions/Workers, D1, Durable Objects, R2-backed media authority, and Turnstile are described;
- the eight-hour host session, browser-local cart/currency/GOATS draft data, approximate-location submissions, Discord public projections, OpenFreeMap resources, and conditional identity providers are described;
- the versioned six-month privacy-choice cookie, optional Preferences storage, External media iframe gate, withdrawal cleanup, and audited absence of top-level Cloudflare Web Analytics are described from the implementation;
- the Watch statement now reflects its real bounded 24-record naturally ingested archive instead of the obsolete claim that all broadcast metadata is ephemeral;
- Stripe, Printful, and Resend are described at their real current boundaries without claiming full-card storage, customer shipping-address storage, active fulfilment, or a live Public checkout;
- Third Railify is framed as a Canadian business owned and operated by Shawn from London, Ontario; only Shawn's established public professional name is used because publishing his surname would create a personal-security risk;
- Ontario's ordinary private-sector PIPEDA baseline is explained with qualified accountability, identified purposes, meaningful consent, limits, safeguards, openness, access/correction, and complaint routes; the owner/accountability contact is not invented;
- Canadian/Ontario consumer-law savings language and a statutory-remedy/change-of-mind split replace the older fixed made-to-order return wording; Ontario is confirmed, while the exact contracting form and launch sales territories remain pre-cutover review items;
- current outbound email is transactional/account-security/community moderation only; no operational newsletter or promotional-message feature was found, so no fictional CASL consent surface was added;
- CAD remains authoritative, foreign-currency values remain visibly approximate, checkout remains disabled, and the policy records attainable-price, mandatory-charge, and genuine-discount safeguards for activation review;
- EU/UK lawful bases, rights, territorial scope, international processing, and regulator routes are qualified without inventing applicability, a DPO, representative, or transfer safeguard;
- the GOATS licence follows the actual consent: user ownership is retained and the licence is limited to storage, processing, moderation, display, formatting, and Third Railify-related promotion;
- the accessibility statement uses WCAG 2.2 Level AA as a goal and does not make an unaudited conformance claim.

## Maintenance rules

Policy wording must follow the deployed system. Before changing a data statement, inspect the public and Admin authority paths, browser storage, cookies, external resources, current providers, and actual retention behaviour. Do not add a payment processor, analytics vendor, advertising cookie, membership promise, exact deletion period, or compliance claim before the corresponding implementation and operational process exist.

`PRIVACY_STORAGE_INVENTORY.md` is the engineering-level device-storage, server-data, and provider-access register. A material optional-consent category, purpose, or vendor change requires updating that inventory and incrementing the single `CONSENT_VERSION` constant before deployment so an older choice cannot silently approve a new use. Copy clarification alone does not require a bump.

The policy date is a content release date. Update it only when the published wording materially changes.

## Owner and legal review

These are implementation-aligned plain-language policies, not a guarantee of legal compliance or a record of legal advice. `LEGAL_RELEASE_CHECKLIST.md` is the authoritative internal list of unresolved release facts. Before production-domain cutover, the owner and qualified legal reviewer should confirm at least:

- the seller's exact contracting form, business style, and any service/mailing address legally required for launch, while preserving Shawn's documented surname-security boundary;
- launch sales/shipping jurisdictions and whether an EEA or UK representative is required;
- provider contracts, subprocessors, transfer mechanisms, and regional storage settings;
- the operational retention/deletion schedule behind the criteria published in the Privacy Policy;
- the final checkout, fulfilment, tax, cancellation, voluntary change-of-mind, membership, and consumer-law flow if paid services are enabled.

No unverified name, address, registration, representative, certification, or conformance status is invented in the UI.
