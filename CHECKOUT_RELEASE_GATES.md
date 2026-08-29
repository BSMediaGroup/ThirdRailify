# Ontario checkout release gates

Internal pre-activation engineering audit as at 28 August 2026. Normal Public checkout and fulfilment must remain disabled until every applicable owner, legal, provider and engineering gate is approved and re-tested. This document is not legal advice.

Technical source anchors: Ontario's current Consumer Protection Act, 2002 internet-agreement provisions require prescribed pre-contract disclosure, an express opportunity to accept/decline and correct errors, and a retainable agreement copy; O. Reg. 17/05 supplies prescribed details. The Consumer Protection Act, 2023 remains not in force on this audit date. The Competition Bureau identifies unattainable advertised prices caused by mandatory non-government fees as drip pricing. Qualified Canadian/Ontario counsel must determine exact applicability and final wording.

| Gate | Status | Evidence / missing work |
| --- | --- | --- |
| Seller identity | OWNER DECISION REQUIRED | Public policies truthfully say owned/operated by Shawn in London, Ontario, Canada and use no surname/entity type. Contracting form, legal seller presentation and any required address remain unconfirmed. |
| CAD price | IMPLEMENTED | Catalogue and variants use integer-minor-unit CAD authority; Stripe test request hard-codes `cad`; optional conversions are labelled approximate. Re-test final checkout. |
| Taxes | NOT IMPLEMENTED | Stripe test body does not enable automatic tax or send a tax calculation; no application tax engine or approved tax disclosure exists. |
| Mandatory fees | PARTIAL | No application-level mandatory fee or sale/compare-at field was found. There is no final enabled-checkout fee model or total audit. |
| Shipping charges | IMPLEMENTED / DISABLED | The server quote adapter, opaque selectable options, integer CAD shipping total, encrypted order snapshot and Stripe fixed-amount shipping request are implemented. `shipping_strategy=unconfigured` and checkout remains closed; no real provider quote has been accepted. |
| Duties/customs | NOT IMPLEMENTED | No destination model or duty/customs disclosure exists. Applicability depends on owner-selected markets. |
| Product description | PARTIAL | Public detail pages and server-authoritative product title exist; Stripe test line sends name/variant only, not the full product description. |
| Variant | IMPLEMENTED | Public selection and server-authoritative variant ID/label/options are present; final checkout must keep the selected variant visible. |
| Quantity | IMPLEMENTED | Cart and server validate bounded quantities and Stripe receives quantity; final review UI still needs activation evidence. |
| Payment timing | PARTIAL | Stripe hosted `mode=payment` and webhook-only confirmation exist for the closed test path. Customer-facing charge/acceptance timing is not approved or disclosed in an enabled flow. |
| Order correction before submission | PARTIAL | Cart, delivery details, selected method and totals are reviewable and changes invalidate the quote. The legally sufficient final accept/decline wording and enabled-flow evidence remain unresolved. |
| Order confirmation / retainable agreement | NOT IMPLEMENTED | A read-only test success status exists. No customer email/address is collected and no enabled order-confirmation delivery workflow exists; templates remain draft. |
| Cancellation flow | NOT IMPLEMENTED | Stripe cancel URL returns to `/shop`, but there is no post-order cancellation request/action or statutory cancellation workflow. |
| Fulfilment | NOT IMPLEMENTED | `fulfillment_submission_enabled=false`; no order submission, status-sync, retry, cancellation or shipment workflow exists. |
| Estimated delivery | IMPLEMENTED / UNPROVEN | The UI displays an estimate only when returned by the authoritative server option. No real provider quote evidence exists and production wording remains subject to final market/provider review. |
| Refund/remedy contact | PARTIAL | Policies publish `support@thirdrailify.com`; monitoring is unconfirmed and Admin has no refund/remedy mutation. |
| Checkout Privacy notice | PARTIAL | Delivery data is ephemeral in Public, encrypted in the order snapshot, omitted from localStorage/list/audit/Stripe metadata, and described in checkout copy. Final provider, retention, access and legal notice review remains required. |
| Terms acceptance | NOT IMPLEMENTED | Terms links exist around account UI, but no enabled checkout acknowledgement/acceptance evidence exists. |
| Final total presentation | PARTIAL | Checkout displays server-authoritative CAD product subtotal, selected shipping and total, and Stripe request agreement is tested. Tax remains truthfully uncalculated; duties and other applicable charges are unresolved. |
| Misleading/drip-pricing protection | PARTIAL | CAD authority, qualified conversions, no fake sale price and no application fee are tested. A full attainable final total cannot be proven before tax/shipping/fee implementation. |
| Allowed provinces/countries | OWNER DECISION REQUIRED | Server normalization accepts real ISO country codes and requires region/postal formats for CA/US/AU, but no owner-approved shipping market allow-list exists. Technical address formatting does not select a legal market. |
| Voluntary change-of-mind policy | OWNER DECISION REQUIRED | No return window is implemented. Public copy preserves mandatory remedies and makes no voluntary window promise. |
| Consumer/e-commerce wording and flow | LEGAL REVIEW REQUIRED | Counsel must review the final seller identity, prescribed information, acceptance/correction, agreement copy, cancellation/refund, remedies and all launch jurisdictions. |

## Activation rule

Keep `checkout_enabled`, `live_payment_capture_enabled` and `fulfillment_submission_enabled` false. Re-run code, provider, network and browser acceptance only after owner decisions and counsel-approved requirements are implemented. No status here certifies legal compliance.

Official source anchors:

- https://www.ontario.ca/laws/statute/02c30
- https://www.ontario.ca/laws/regulation/r05017
- https://www.ontario.ca/laws/statute/23c23
- https://competition-bureau.canada.ca/en/deceptive-marketing-practices/drip-pricing
