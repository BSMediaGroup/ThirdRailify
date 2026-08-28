# Third Railify V2 policy library

## Routes

- `/policies` is the graphical policy register.
- `/terms`, `/privacy`, `/refunds`, and `/accessibility` are first-class long-form documents.
- Every document has one H1, stable section IDs, a complete on-page table of contents, four priority jump links, cross-document navigation, revision metadata, and direct contact routes.

The registry in `src/content/policies.ts` is the single presentation source. A future membership-specific policy should be added there only when its content and real route are ready. The reserved membership card on `/policies` is intentionally non-interactive and does not imply that an unpublished policy or plan exists.

## Migration source and corrections

`ThirdRailify-Admin/migrations/Legal+Disclaimers.csv` was used as source content, not as executable instructions or a runtime dependency. The V2 documents preserve the useful Ontario-based terms, community rules, refund framework, contact routes, and WCAG goal while correcting obsolete Wix-era claims.

Material corrections include:

- policy scope is Third Railify only; a separate future podcast site is not co-branded or governed here;
- Wix, Wix Payments, Wix POS, and generic Wix platform wording are removed;
- the current V2 preview cart is disclosed as non-transactional;
- Cloudflare Pages, Functions/Workers, D1, Durable Objects, R2-backed media authority, and Turnstile are described;
- the eight-hour host session, browser-local cart/currency/GOATS draft data, approximate-location submissions, Discord public projections, OpenFreeMap resources, and conditional identity providers are described;
- the Watch statement now reflects its real bounded 24-record naturally ingested archive instead of the obsolete claim that all broadcast metadata is ephemeral;
- European lawful bases, rights, international processing, retention criteria, and regulator routes are included without claiming a jurisdiction or safeguard that has not been verified;
- the accessibility statement uses WCAG 2.2 Level AA as a goal and does not make an unaudited conformance claim.

## Maintenance rules

Policy wording must follow the deployed system. Before changing a data statement, inspect the public and Admin authority paths, browser storage, cookies, external resources, current providers, and actual retention behaviour. Do not add a payment processor, analytics vendor, advertising cookie, membership promise, exact deletion period, or compliance claim before the corresponding implementation and operational process exist.

The policy date is a content release date. Update it only when the published wording materially changes.

## Owner and legal review

These are implementation-ready plain-language policies based on the supplied record, current code, and authoritative regulatory/provider guidance. Before production-domain cutover, the owner or qualified Canadian privacy/consumer counsel should confirm:

- the operator's complete legal name, business style, and service/mailing address;
- whether an EEA or UK representative is required for the service actually offered at launch;
- provider contracts, subprocessors, transfer mechanisms, and regional storage settings;
- the operational retention/deletion schedule behind the criteria published in the Privacy Policy;
- the final checkout, fulfilment, tax, cancellation, membership, and consumer-law flow if paid services are enabled.

No unverified name, address, registration, representative, certification, or conformance status is invented in the UI.

