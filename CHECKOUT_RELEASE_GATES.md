# Ontario checkout release gates

Internal pre-activation engineering audit as at 28 August 2026. Normal Public checkout and fulfilment must remain disabled until every applicable owner, legal, provider and engineering gate is approved and re-tested. This document is not legal advice.

Technical source anchors: Ontario's current Consumer Protection Act, 2002 internet-agreement provisions require prescribed pre-contract disclosure, an express opportunity to accept/decline and correct errors, and a retainable agreement copy; O. Reg. 17/05 supplies prescribed details. The Consumer Protection Act, 2023 remains not in force on this audit date. The Competition Bureau identifies unattainable advertised prices caused by mandatory non-government fees as drip pricing. Qualified Canadian/Ontario counsel must determine exact applicability and final wording.

| Gate | Status | Evidence / missing work |
| --- | --- | --- |
| Seller identity | OWNER DECISION REQUIRED | Public policies truthfully say owned/operated by Shawn in London, Ontario, Canada and use no surname/entity type. Contracting form, legal seller presentation and any required address remain unconfirmed. |
| CAD price | IMPLEMENTED | Catalogue and variants use integer-minor-unit CAD authority; Stripe test request hard-codes `cad`; optional conversions are labelled approximate. Re-test final checkout. |
| Taxes | NOT IMPLEMENTED | Stripe test body does not enable automatic tax or send a tax calculation; no application tax engine or approved tax disclosure exists. |
| Mandatory fees | PARTIAL | No application-level mandatory fee or sale/compare-at field was found. There is no final enabled-checkout fee model or total audit. |
| Shipping charges | NOT IMPLEMENTED | No shipping rate, option, address collection or shipping total is sent to Stripe. |
| Duties/customs | NOT IMPLEMENTED | No destination model or duty/customs disclosure exists. Applicability depends on owner-selected markets. |
| Product description | PARTIAL | Public detail pages and server-authoritative product title exist; Stripe test line sends name/variant only, not the full product description. |
| Variant | IMPLEMENTED | Public selection and server-authoritative variant ID/label/options are present; final checkout must keep the selected variant visible. |
| Quantity | IMPLEMENTED | Cart and server validate bounded quantities and Stripe receives quantity; final review UI still needs activation evidence. |
| Payment timing | PARTIAL | Stripe hosted `mode=payment` and webhook-only confirmation exist for the closed test path. Customer-facing charge/acceptance timing is not approved or disclosed in an enabled flow. |
| Order correction before submission | NOT IMPLEMENTED | The local cart can be edited, but no final checkout review screen provides an express immediate correct/accept/decline step. |
| Order confirmation / retainable agreement | NOT IMPLEMENTED | A read-only test success status exists. No customer email/address is collected and no enabled order-confirmation delivery workflow exists; templates remain draft. |
| Cancellation flow | NOT IMPLEMENTED | Stripe cancel URL returns to `/shop`, but there is no post-order cancellation request/action or statutory cancellation workflow. |
| Fulfilment | NOT IMPLEMENTED | `fulfillment_submission_enabled=false`; no order submission, status-sync, retry, cancellation or shipment workflow exists. |
| Estimated delivery | NOT IMPLEMENTED | No destination, shipping method, production estimate or evidence-backed delivery date is calculated. Do not display one until supported. |
| Refund/remedy contact | PARTIAL | Policies publish `support@thirdrailify.com`; monitoring is unconfirmed and Admin has no refund/remedy mutation. |
| Checkout Privacy notice | NOT IMPLEMENTED | Current controlled test intentionally collects no customer email/address. Final collection categories, providers, purposes and notices require implementation/review. |
| Terms acceptance | NOT IMPLEMENTED | Terms links exist around account UI, but no enabled checkout acknowledgement/acceptance evidence exists. |
| Final total presentation | PARTIAL | Local cart shows CAD subtotal and Stripe validates the same item total in the closed test. Taxes, shipping, duties and other applicable charges are absent. |
| Misleading/drip-pricing protection | PARTIAL | CAD authority, qualified conversions, no fake sale price and no application fee are tested. A full attainable final total cannot be proven before tax/shipping/fee implementation. |
| Allowed provinces/countries | OWNER DECISION REQUIRED | No shipping-country allow-list, address validation or market restriction exists. Global reach/currency choice does not select a market. |
| Voluntary change-of-mind policy | OWNER DECISION REQUIRED | No return window is implemented. Public copy preserves mandatory remedies and makes no voluntary window promise. |
| Consumer/e-commerce wording and flow | LEGAL REVIEW REQUIRED | Counsel must review the final seller identity, prescribed information, acceptance/correction, agreement copy, cancellation/refund, remedies and all launch jurisdictions. |

## Activation rule

Keep `checkout_enabled`, `live_payment_capture_enabled` and `fulfillment_submission_enabled` false. Re-run code, provider, network and browser acceptance only after owner decisions and counsel-approved requirements are implemented. No status here certifies legal compliance.

Official source anchors:

- https://www.ontario.ca/laws/statute/02c30
- https://www.ontario.ca/laws/regulation/r05017
- https://www.ontario.ca/laws/statute/23c23
- https://competition-bureau.canada.ca/en/deceptive-marketing-practices/drip-pricing
