export type PolicyKey = "terms" | "privacy" | "refunds" | "accessibility";

export type PolicyLink = {
  label: string;
  href: string;
};

export type PolicySection = {
  id: string;
  title: string;
  eyebrow: string;
  paragraphs?: string[];
  bullets?: string[];
  note?: string;
  links?: PolicyLink[];
  table?: {
    caption: string;
    headers: string[];
    rows: string[][];
  };
};

export type PolicyDocument = {
  key: PolicyKey;
  order: string;
  slug: string;
  shortTitle: string;
  title: string;
  eyebrow: string;
  summary: string;
  updated: string;
  revision: string;
  readingTime: string;
  tone: "gold" | "cyan" | "green" | "paper";
  highlights: Array<{ label: string; sectionId: string }>;
  sections: PolicySection[];
};

const updated = "30 August 2026";
const revision = "2026.08-L1";

export const policyDocuments: Record<PolicyKey, PolicyDocument> = {
  terms: {
    key: "terms",
    order: "01",
    slug: "/terms",
    shortTitle: "Terms",
    title: "Terms of Use & Sale",
    eyebrow: "Rules of the rail",
    summary: "The plain-language rules for Third Railify accounts, community content, media, the storefront, and any checkout that is expressly enabled.",
    updated,
    revision,
    readingTime: "11 minute read",
    tone: "gold",
    highlights: [
      { label: "Using the service", sectionId: "using-the-service" },
      { label: "Your content", sectionId: "community-content" },
      { label: "Store & pricing", sectionId: "storefront" },
      { label: "Consumer rights", sectionId: "consumer-rights" },
    ],
    sections: [
      {
        id: "who-we-are",
        title: "Who these Terms cover",
        eyebrow: "Scope",
        paragraphs: [
          "These Terms apply to the Third Railify and Third Railify Official website, authorised staging domains, accounts, Watch features, community features, and storefront. Third Railify is a Canadian business owned and operated by Shawn from London, Ontario, Canada. For personal safety, the owner is identified here by the established public professional name “Shawn”. In these Terms, “Third Railify”, “we”, “us”, and “our” refer to that business; “you” means a visitor, account holder, contributor, or customer.",
          "The site is currently a staging replacement for the existing Wix site. The contracting identity and contact information presented at an enabled checkout or in an order confirmation form part of that sale and must be read with these Terms.",
        ],
      },
      {
        id: "using-the-service",
        title: "Acceptance and eligibility",
        eyebrow: "Agreement",
        paragraphs: [
          "By using a feature, creating an account, submitting content, or completing an enabled checkout, you agree to the Terms that apply to that activity and acknowledge the Privacy Policy. If you do not agree, do not use the affected feature.",
          "You must be legally capable of agreeing to these Terms. If you act for an organisation, you confirm that you have authority to do so. Any age, parental-consent, or purchasing rule required by the law where you live also applies.",
        ],
      },
      {
        id: "accounts",
        title: "Accounts and security",
        eyebrow: "Identity",
        bullets: [
          "Provide accurate account information and keep it reasonably current.",
          "Protect your credentials and promptly report suspected unauthorised access.",
          "Do not sell, share, automate, or impersonate an account or another person.",
          "An identity provider's own terms apply when you choose its sign-in service.",
        ],
        paragraphs: [
          "We may restrict or disable access where reasonably necessary to investigate security events, abuse, infringement, payment disputes, legal requirements, or community safety. Where practicable, the action will be proportionate to the issue and any mandatory rights will remain available.",
        ],
      },
      {
        id: "service-features",
        title: "What the service provides",
        eyebrow: "Current features",
        bullets: [
          "Podcast, livestream, recorded video, editorial, and entertainment content.",
          "Approved GOATS submissions, comments, reactions, profiles, and public Discord information.",
          "A CAD-authoritative merchandise catalogue and browser-local cart. Normal public checkout is currently disabled.",
          "Direct links to third-party platforms and services.",
        ],
        paragraphs: [
          "Schedules, catalogue items, platform availability, and non-paid features may change. A change does not remove rights already acquired under an accepted order or rights that cannot lawfully be excluded.",
        ],
      },
      {
        id: "community-content",
        title: "GOATS submissions and your content",
        eyebrow: "Ownership & licence",
        paragraphs: [
          "You keep ownership of content you submit. If you submit content through GOATS, you give Third Railify a worldwide, non-exclusive, royalty-free licence to store, process, moderate, reproduce, display, resize, and format it for the GOATS feature. If approved, the licence also permits Third Railify to promote that submission through Third Railify-related services and social channels.",
          "This licence is limited to operating, moderating, displaying, and promoting the approved submission. It does not transfer ownership, grant unrelated sale rights, or grant AI-training rights. The licence lasts while the content is used for those purposes and for the limited period reasonably needed for backups, disputes, consent evidence, and legal obligations.",
          "You confirm that you have permission to submit the content, including permission relating to identifiable people in images. Approval is not automatic. We may decline, format, hide, or remove content where reasonably necessary for the service, moderation, rights, safety, or law.",
        ],
      },
      {
        id: "comments-reactions",
        title: "Comments, reactions, and community conduct",
        eyebrow: "Participation",
        bullets: [
          "Do not post unlawful, infringing, deceptive, defamatory, harassing, hateful, exploitative, or privacy-invasive material.",
          "Do not publish street addresses, private contact details, credentials, or sensitive information about another person.",
          "Do not manipulate reactions, rankings, comments, moderation, or account systems.",
          "Comments and reactions may publish immediately or await moderation, depending on the setting shown for that GOATS listing.",
        ],
      },
      {
        id: "acceptable-use",
        title: "Acceptable use",
        eyebrow: "Boundaries",
        bullets: [
          "Do not break the law, violate rights, or use the service to harm, threaten, exploit, or defraud anyone.",
          "Do not probe non-public systems, bypass controls, interfere with security, or introduce malicious code.",
          "Do not overload the service with abusive automation or scraping, or circumvent provider restrictions or access controls.",
          "Do not use Third Railify branding or content to misrepresent affiliation, origin, sponsorship, or endorsement.",
        ],
      },
      {
        id: "intellectual-property",
        title: "Third Railify and third-party content",
        eyebrow: "Intellectual property",
        paragraphs: [
          "Except for user content and third-party material, the site's code, branding, graphics, merchandise designs, audio, and editorial content belong to Third Railify or its licensors. You may use the public service for personal, non-commercial purposes. No broader licence is granted.",
          "Fair dealing, fair use, and other statutory exceptions remain available where the law provides them. Embedded media and external platforms remain subject to their owners' rights and terms.",
        ],
      },
      {
        id: "storefront",
        title: "Products, availability, and fulfilment",
        eyebrow: "Store",
        paragraphs: [
          "The storefront displays a real catalogue, product variants, and CAD prices, but normal customer checkout is currently disabled. A cart is only a device-local selection and does not reserve stock, create an order, or guarantee availability.",
          "If checkout is enabled, the item, variant, quantity, authoritative CAD price, taxes, shipping costs, delivery information, and any other material term shown before confirmation form part of the order. We may reject or cancel an order for a genuine pricing error, unavailable item, security concern, or inability to fulfil it, and will provide any refund or remedy required in the circumstances.",
          "Merchandise may be produced and shipped by Printful or another disclosed production partner. Third Railify remains the storefront and customer support path; a fulfilment provider's policy does not replace rights you have against the seller.",
        ],
      },
      {
        id: "pricing-currency",
        title: "Pricing and display currencies",
        eyebrow: "CAD authority",
        paragraphs: [
          "CAD is the authoritative storefront currency. A USD or other display-currency amount is an approximate conversion for convenience, based on a public exchange-rate snapshot. It does not change the CAD catalogue price, cart calculation, or currency that an enabled checkout confirms.",
          "Before an enabled order is submitted, checkout must display the attainable item price and disclose taxes, shipping, duties, and any other mandatory charge that applies. Any bank or payment-provider conversion rate or fee is controlled by that provider and may differ from the site's approximation.",
          "Any sale, comparison-price, or savings claim must be genuine and supported by the pricing history and circumstances. The current Public catalogue does not create a checkout or add a mandatory non-government fee.",
        ],
      },
      {
        id: "orders-payments",
        title: "Orders and payment",
        eyebrow: "Checkout",
        paragraphs: [
          "When checkout is enabled, an order is accepted only through the confirmation shown by the authorised checkout flow. A return URL alone is not proof of payment. Payment credentials are handled by the payment provider; Third Railify does not store full payment-card numbers.",
          "The current backend contains a controlled Stripe test workflow. It cannot create a live charge or start fulfilment and is not a public purchasing route.",
        ],
        links: [{ label: "Read the Refund Policy", href: "/refunds" }],
      },
      {
        id: "sizes-customer-details",
        title: "Variants, sizes, and order details",
        eyebrow: "Your selection",
        paragraphs: [
          "Choose the intended size, colour, variant, quantity, and delivery details carefully before placing an enabled order. A customer ordering error or change of mind is different from receiving an item that is faulty, unsafe, incorrect, or not as described.",
          "Nothing in this section limits a remedy required because the supplied product or service fails an applicable consumer guarantee.",
        ],
      },
      {
        id: "external-services",
        title: "External media and services",
        eyebrow: "Third parties",
        paragraphs: [
          "YouTube and Rumble players, Discord information, identity providers, map resources, and other linked services are operated by third parties. Their availability, advertising, accessibility, and data practices are outside Third Railify's direct control. Direct links remain available when an optional embedded player is not allowed.",
        ],
        links: [
          { label: "Privacy provider details", href: "/privacy#service-providers" },
          { label: "YouTube Terms", href: "https://www.youtube.com/t/terms" },
        ],
      },
      {
        id: "service-changes",
        title: "Moderation, suspension, and service changes",
        eyebrow: "Administration",
        paragraphs: [
          "We may maintain, replace, suspend, or discontinue a feature, and may remove or restrict content or access for the reasons described in these Terms. We will not use this clause to avoid an accepted order, retain payment for a service we do not provide, or remove a mandatory remedy.",
        ],
      },
      {
        id: "disclaimers-liability",
        title: "Disclaimers and responsibility",
        eyebrow: "Proportionate limits",
        paragraphs: [
          "Third Railify content is entertainment and commentary and may include opinions, satire, errors, or discussion of sensitive events. It is not legal, medical, financial, or other professional advice.",
          "To the extent the law permits, we do not promise uninterrupted availability, error-free content, a particular broadcast schedule, or continued access to a third-party platform. We are not responsible for loss caused solely by a third party or event outside our reasonable control where it would be unfair or unlawful to impose that responsibility on us.",
          "Any exclusion or limitation applies only to the extent it is lawful and reasonable in the circumstances. It does not apply to fraud, wilful misconduct, or liability and remedies that cannot legally be excluded or limited.",
        ],
      },
      {
        id: "consumer-rights",
        title: "Rights that cannot be excluded",
        eyebrow: "Consumer protection",
        paragraphs: [
          "Nothing in these Terms limits rights or remedies that cannot lawfully be excluded under consumer protection laws that apply to you.",
          "The Refund Policy and any voluntary store policy operate alongside those rights. They do not replace or shorten a statutory remedy.",
        ],
        links: [
          { label: "Ontario consumer protection", href: "https://www.ontario.ca/page/consumer-protection-ontario" },
          { label: "Refund Policy", href: "/refunds" },
        ],
      },
      {
        id: "changes-contact",
        title: "Changes and contact",
        eyebrow: "Policy administration",
        paragraphs: [
          "We may update these Terms and will publish the revision date. Material changes apply prospectively, with additional notice or renewed agreement where required by law. Continued use cannot replace consent where the law specifically requires it.",
          "Questions about these Terms, products, or orders can be sent to support@thirdrailify.com. Technical or security issues can be sent to webmaster@thirdrailify.com.",
        ],
      },
    ],
  },

  privacy: {
    key: "privacy",
    order: "02",
    slug: "/privacy",
    shortTitle: "Privacy",
    title: "Privacy Policy",
    eyebrow: "Your data on the rail",
    summary: "A layered account of what Third Railify handles, why it is used, who receives it, how long it remains, and how to make a privacy request.",
    updated,
    revision,
    readingTime: "15 minute read",
    tone: "cyan",
    highlights: [
      { label: "At a glance", sectionId: "privacy-at-a-glance" },
      { label: "Information", sectionId: "information-we-collect" },
      { label: "Providers", sectionId: "service-providers" },
      { label: "Your rights", sectionId: "your-rights" },
    ],
    sections: [
      {
        id: "privacy-at-a-glance",
        title: "Privacy at a glance",
        eyebrow: "Key points",
        bullets: [
          "Accounts, GOATS submissions, and community interactions use the minimum information needed for those features.",
          "GOATS contact emails and unapproved media stay behind the Admin authority; only approved public fields are projected to the Public site.",
          "YouTube and Rumble players are not created until External media is allowed.",
          "Normal customer checkout is disabled. The current storefront cart stays on your device and contains no payment details.",
          "Third Railify does not intentionally run behavioural advertising, a marketing tracker, or top-level Cloudflare Web Analytics on the current site.",
          "Privacy requests and complaints can be sent to privacy@thirdrailify.com.",
        ],
      },
      {
        id: "who-operates",
        title: "Who operates this service",
        eyebrow: "Responsibility",
        paragraphs: [
          "This policy applies to the Third Railify and Third Railify Official website, authorised staging domains, account service, GOATS community workflow, Watch experience, and storefront. Third Railify is a Canadian business owned and operated by Shawn from London, Ontario, Canada. For personal safety, the owner is identified here by the established public professional name “Shawn”. Privacy questions, requests, and complaints can be sent to privacy@thirdrailify.com.",
        ],
      },
      {
        id: "canadian-privacy-framework",
        title: "Canadian privacy framework",
        eyebrow: "PIPEDA where applicable",
        paragraphs: [
          "Where the Personal Information Protection and Electronic Documents Act (PIPEDA) applies, Third Railify handles personal information for purposes a reasonable person would consider appropriate and follows the Act's accountability, openness, access, consent, accuracy, safeguards, and collection, use, disclosure, and retention limits.",
          "Third Railify operates from Ontario. PIPEDA is the general private-sector privacy baseline for ordinary commercial personal-information handling in Ontario, subject to its scope, exceptions, sector-specific rules, and any other law that applies to a particular activity. PIPEDA also matters to covered interprovincial and international commercial handling.",
        ],
        links: [
          { label: "OPC Privacy Guide for Businesses", href: "https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/pipeda-compliance-help/guide_org/" },
          { label: "PIPEDA fair information principles", href: "https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/p_principle/" },
          { label: "Ontario IPC private-sector overview", href: "https://www.ipc.on.ca/en/media-centre/blog/access-and-privacy-private-sector-businesses" },
        ],
      },
      {
        id: "information-we-collect",
        title: "Information we collect and hold",
        eyebrow: "Data categories",
        bullets: [
          "Account and profile information: email address, display name, avatar, role and status, account dates, and identifiers or usernames from a sign-in provider you choose.",
          "Authentication and security information: password verifiers, session and anti-forgery token hashes, login dates, bounded return paths, provider transactions, hashed user-agent or network-derived rate-limit values, and security audit events.",
          "GOATS information: public display name; private email; city, optional region, and country; deliberately coarse public coordinates; uploaded main, profile, and gallery images; story or review; product association; optional rating; consent version and timestamp; account association where present; moderation history; comments; and reactions.",
          "Technical request information: IP address, browser or device type, requested URL, referrer, time, routing information, and security signals that may be processed by the application or Cloudflare.",
          "Communications: the name, reply email, selected topic, message, and consent acknowledgement submitted through the contact form; transactional account and GOATS email records; moderation messages; and information you include in privacy, support, accessibility, or security correspondence.",
          "Commerce records: current customer contact name and optional phone; saved delivery-address labels and structured address fields you choose to retain; product and variant identity; quantity and CAD amounts; encrypted order-time delivery snapshots; Stripe Checkout Session or PaymentIntent identifiers; payment and refund status; Printful fulfilment identifiers; and order/audit dates when a controlled test or future enabled order exists. Third Railify does not store full payment-card numbers.",
          "Public programme and community projections: bounded YouTube/Rumble broadcast metadata and public Discord server, channel, display-name, avatar, and presence fields. These are not a viewer-specific watch history or private Discord messages.",
        ],
      },
      {
        id: "how-collected",
        title: "How information is collected and held",
        eyebrow: "Sources & storage",
        paragraphs: [
          "We collect information directly when you create an account, sign in, update a profile, submit GOATS content, comment, react, contact us, or use an enabled transaction flow. We also receive limited identity data from a sign-in provider you choose, public community data from Discord, and public broadcast data through authorised ingestion.",
          "Account and service records are held in Cloudflare-hosted storage controlled through the Admin service. Uploaded profile and GOATS media are held in private R2-backed storage and exposed only through bounded media routes. Browser-local preferences and cart state remain on your device unless a separate submission sends information to the service.",
        ],
      },
      {
        id: "why-we-use-data",
        title: "Why we use information",
        eyebrow: "Purposes",
        bullets: [
          "Provide accounts, profiles, Watch, community, storefront, and support features requested by users.",
          "Authenticate users, manage sessions, prevent fraud and abuse, diagnose failures, and protect service integrity.",
          "Receive, validate, moderate, publish, hide, and administer GOATS submissions, comments, and reactions.",
          "Deliver contact enquiries and replies, and send account verification, password reset, submission, and moderation communications.",
          "Create and administer an order, payment-status record, refund, or fulfilment record if the applicable checkout is enabled.",
          "Meet legal obligations, respond to lawful requests, preserve evidence, resolve disputes, and protect people and rights.",
        ],
        note: "We do not sell personal information. We do not use GOATS submissions or account data to train an AI model.",
      },
      {
        id: "accounts-authentication",
        title: "Accounts and authentication",
        eyebrow: "Identity",
        paragraphs: [
          "Email accounts use a salted password verifier; readable passwords are not stored. An eight-hour host session uses a secure, HTTP-only cookie. Short-lived verification, reset, OAuth, and handoff records support account activation and safe movement between the Admin account authority and Public site.",
          "When a provider is displayed as available, you may choose Discord, Google, GitHub, or X authentication. The provider may return an account identifier, username, display name, avatar, and email or verified-email status where its scope supplies those fields. Google sign-in is currently held behind a migration flag.",
          "A signed-in Account can be linked server-side to one commerce Customer. Current contact fields and saved delivery addresses are encrypted in the Admin commerce service and are available only to that Account through the authenticated same-origin relay. Updating or deleting a saved address does not rewrite an order's historical delivery snapshot.",
        ],
      },
      {
        id: "consent-and-choices",
        title: "Consent and meaningful choices",
        eyebrow: "Purpose and consequence",
        paragraphs: [
          "We explain what a feature needs, why it needs it, and the material consequence of choosing it. Account and identity-provider information is needed to create or authenticate the account you request. GOATS consent permits private moderation and, if approved, publication of the disclosed community fields. Optional External media sends technical information to YouTube or Rumble only after a positive choice.",
          "Information integral to an enabled transaction is used to perform the order you request; it is not presented as an optional marketing consent. Preferences and External media can be refused without losing essential navigation, account security, the local cart, or direct provider links.",
          "You may withdraw an optional consent through Privacy choices or contact privacy@thirdrailify.com about another consent-based use. Withdrawal applies going forward and may mean the optional feature can no longer operate.",
        ],
        links: [{ label: "OPC meaningful consent guidance", href: "https://www.priv.gc.ca/en/privacy-topics/privacy-for-businesses/appropriate-handling-of-personal-information/collecting-personal-information-and-consent/consent/gl_omc_201805/" }],
      },
      {
        id: "store-orders",
        title: "Store, orders, and fulfilment",
        eyebrow: "Commerce boundary",
        paragraphs: [
          "The normal Public checkout is disabled. Cart selections remain in localStorage and consist only of product ID, variant ID, and quantity. Display-currency choices do not alter the authoritative CAD value.",
          "Signed-in customers may save delivery addresses for reuse. Checkout selects a default only when one is designated, and saving a newly entered address is an explicit optional action. Contact and address fields are not written to browser storage. Deleting a saved address removes that reusable current address but does not erase delivery evidence attached to an existing order where retention is still required.",
          "A controlled Stripe test workflow can create a sandbox Checkout Session and a local order-status record for operator acceptance. It cannot create a live charge or start fulfilment. Stripe handles card entry; Third Railify stores provider identifiers and status evidence, not full card numbers.",
          "Printful is connected for a pre-cutover catalogue and planned fulfilment workflow. It does not currently receive a Public customer order because fulfilment submission is disabled. Before normal checkout is activated, the information collected for contact, shipping, taxes, payment, and fulfilment must be disclosed at the collection point and reflected in this policy.",
        ],
      },
      {
        id: "community-publication",
        title: "GOATS submissions, comments, and reactions",
        eyebrow: "Community",
        paragraphs: [
          "A GOATS draft begins as a private moderation record. The submitted email, unapproved media, precise internal moderation record, and account association are not part of the Public projection. Approved fields can include display name, images, story, product, rating, approximate location label and privacy-adjusted map point, dates, comments, reactions, and avatar.",
          "Comments and reactions are tied to the signed-in account so the service can attribute, moderate, and let the author delete a comment. Depending on the listing setting, an interaction may publish automatically or wait for moderator approval.",
          "Do not provide a street address or content you cannot lawfully publish. Contact privacy@thirdrailify.com to request review of an account association or community record.",
        ],
      },
      {
        id: "cookies-local-storage",
        title: "Cookies, browser storage, and choices",
        eyebrow: "Your device",
        table: {
          caption: "First-party browser state",
          headers: ["Name", "Purpose", "Duration / choice"],
          rows: [
            ["thirdrailify_session", "Authenticated session and anti-forgery protection", "8 hours; essential when signed in"],
            ["thirdrailify_consent", "Consent version, timestamps, Preferences and External media choices", "183 days (approximately six months); essential to remember the choice"],
            ["thirdrailify-commerce-cart-v2", "Product ID, variant ID, and quantity", "Until cleared; essential to the requested persistent cart"],
            ["thirdrailify.storefront.currency.v1 / thirdrailify.storefront.currency-rates.v1", "Chosen display currency and a validated public CAD rate snapshot", "Optional Preferences; until withdrawal, replacement, or clearing"],
            ["thirdrailify-goats-draft-v2", "Non-sensitive draft text; excludes email, consent, and images", "Optional Preferences; removed after submission, withdrawal, or clearing"],
          ],
        },
        paragraphs: [
          "Preferences and External media start off until you make a positive choice. Use Privacy choices in the footer at any time. Withdrawing Preferences removes the three optional keys owned by this site. Withdrawing External media unmounts provider players and prevents future iframe creation, but cannot erase storage already controlled by another domain.",
        ],
      },
      {
        id: "external-media",
        title: "External media",
        eyebrow: "YouTube & Rumble",
        paragraphs: [
          "YouTube privacy-enhanced and Rumble iframes do not exist before External media consent. If allowed, loading a player sends technical request information to that provider and may permit provider-controlled cookies, browser storage, measurement, or advertising requests. Direct provider links remain available without an embedded player.",
          "Third Railify does not request your YouTube or Rumble credentials and does not build a viewer-specific watch history. Its own Watch archive is capped at 24 eligible public episode records.",
        ],
      },
      {
        id: "security",
        title: "Security and anti-abuse",
        eyebrow: "Safeguards",
        paragraphs: [
          "Safeguards include HTTPS, secure and HTTP-only session cookies, hashed credentials and tokens, role-based administration, narrow Public projections, request validation, bounded uploads, Turnstile challenges, rate limiting, audit events, and separation between Public and Admin authority.",
          "Automated security checks may challenge or temporarily rate-limit a request. They are not used to make a solely automated decision that produces a legal or similarly significant effect. Contact support@thirdrailify.com if a legitimate request is blocked.",
          "No online service can guarantee absolute security. Use a unique password and protect any identity-provider account you connect.",
        ],
      },
      {
        id: "service-providers",
        title: "Service providers and recipients",
        eyebrow: "Where information goes",
        table: {
          caption: "Current and gated providers verified in the implementation",
          headers: ["Provider", "Function", "Information or access"],
          rows: [
            ["Cloudflare", "Hosting, network delivery, D1, Durable Objects, R2 media, and Turnstile", "Stored service records, contact challenges, uploads, IP/request metadata, and security signals"],
            ["Resend", "Contact delivery and transactional account and GOATS email", "Recipient and reply email, contact or transactional message content, and delivery identifiers"],
            ["Discord", "Optional sign-in and public community information", "Chosen identity fields; public display names, avatars, channels, and presence"],
            ["Google, GitHub, X", "Optional sign-in when displayed as available", "Provider ID, username/display data, avatar, and email status where supplied"],
            ["YouTube and Rumble", "Consent-gated players and public broadcast metadata", "Technical requests and provider-controlled player data after consent"],
            ["OpenFreeMap ecosystem", "Map resources", "Technical request information; approved locations are deliberately approximate"],
            ["Frankfurter", "Server-side public CAD exchange rates", "No cart or account data is intentionally sent"],
            ["Stripe", "Controlled test checkout and future disclosed payment processing", "Order references, line totals, provider status; card entry stays with Stripe"],
            ["Printful", "Pre-cutover catalogue and planned production/fulfilment", "Product mappings now; customer fulfilment data only after activation and notice"],
          ],
        },
        paragraphs: [
          "Professional advisers, insurers, courts, regulators, law enforcement, or a business transaction counterparty may receive information only where reasonably necessary and lawful. We do not treat a provider as authorised to use service data for unrelated purposes merely because it supplies infrastructure.",
        ],
        links: [
          { label: "Cloudflare privacy", href: "https://www.cloudflare.com/privacypolicy/" },
          { label: "Resend privacy", href: "https://resend.com/legal/privacy-policy" },
          { label: "Stripe privacy", href: "https://stripe.com/privacy" },
          { label: "Printful privacy", href: "https://www.printful.com/policies/privacy" },
        ],
      },
      {
        id: "international-processing",
        title: "International processing and disclosure",
        eyebrow: "Data location",
        paragraphs: [
          "The service has a Canada/CAD operating scope and uses providers with international infrastructure. Information may be processed or disclosed outside your location, including where a chosen provider, its subprocessors, or support personnel operate. Exact countries and provider regional settings are not fully confirmed, so this policy does not invent a fixed country list.",
          "Where PIPEDA applies, Third Railify remains accountable for personal information under its control when a provider processes it. Where EU or UK transfer rules apply, an appropriate lawful transfer mechanism must be used. We do not claim that every transfer uses Standard Contractual Clauses or another specific safeguard without confirming the relevant provider arrangement.",
        ],
      },
      {
        id: "retention",
        title: "How long we keep information",
        eyebrow: "Retention",
        bullets: [
          "Session cookie and session authority: eight hours. OAuth transactions: ten minutes. Public/Admin handoffs: five minutes. Password resets: thirty minutes. Email verification tokens: twenty-four hours.",
          "Consent preference: 183 days. Optional browser preferences and local cart: until withdrawal, feature cleanup, replacement, or browser clearing.",
          "Unfinalised GOATS drafts and uploads: expire after twenty-four hours and become eligible for cleanup.",
          "Watch archive: capped at 24 eligible public programme records; it is not personal viewing history.",
          "Account, final GOATS, moderation, comment, reaction, email, security, support, commerce, refund, and fulfilment records: for as long as reasonably necessary to provide the feature, administer the relationship or transaction, resolve disputes, protect security, preserve consent or rights evidence, and meet applicable legal obligations.",
          "Provider-controlled records: according to the provider's applicable retention practices and our configuration or contract where one applies.",
        ],
        note: "No unsupported seven-year, thirty-day, or other fixed business retention period has been invented. The remaining operational retention schedule requires owner and legal approval.",
      },
      {
        id: "lawful-bases",
        title: "EU and UK lawful bases, where applicable",
        eyebrow: "Qualified transparency",
        paragraphs: [
          "The ability to access this website from Europe does not by itself establish that EU GDPR or UK data-protection law applies. Where either law does apply, the basis depends on the activity.",
        ],
        table: {
          caption: "Potential lawful bases where EU or UK law applies",
          headers: ["Activity", "Basis", "Why"],
          rows: [
            ["Account and requested service", "Contract", "Provide the account or feature requested"],
            ["Enabled order and payment", "Contract; legal obligation for required records", "Process the sale and keep records the law requires"],
            ["Security, fraud prevention, and proportionate moderation", "Legitimate interests", "Protect users, rights, and reliable service operation"],
            ["Optional browser Preferences and External media", "Consent", "The optional access begins only after a positive choice"],
            ["GOATS storage and approved publication", "Consent and the submission agreement", "Moderate and publish only within the disclosed community scope"],
          ],
        },
      },
      {
        id: "your-rights",
        title: "Access, correction, and privacy rights",
        eyebrow: "Your control",
        paragraphs: [
          "Email privacy@thirdrailify.com with enough detail to locate the relevant account, submission, comment, or communication. You can ask to access or correct personal information, or make another privacy request available under the law that applies to you. We may need to verify identity and may retain information where a lawful exception applies.",
          "Where PIPEDA applies, you may ask about the existence, use, and disclosure of personal information under Third Railify's control, request access, and challenge its accuracy or completeness. Where EU GDPR or UK data-protection law applies, rights may include access, correction, deletion, restriction, objection, portability where applicable, withdrawal of consent, and a complaint to a supervisory authority. A right may depend on the processing basis and circumstances.",
          "Withdrawing consent affects future processing and does not make earlier lawful processing unlawful. Optional browser choices can be changed immediately through Privacy choices.",
        ],
        links: [
          { label: "OPC access guidance", href: "https://www.priv.gc.ca/en/privacy-topics/accessing-personal-information/api_bus/" },
          { label: "ICO individual rights", href: "https://ico.org.uk/for-the-public/your-data-matters/" },
        ],
      },
      {
        id: "complaints",
        title: "Privacy complaints",
        eyebrow: "Resolution",
        paragraphs: [
          "Send a complaint to privacy@thirdrailify.com with the event, feature, date, and outcome you are seeking. We will acknowledge and investigate it, ask for further information where reasonably needed, and communicate an outcome or next step within the period required by applicable law.",
          "If you are not satisfied, you may complain to a privacy or data-protection regulator with jurisdiction. Where PIPEDA applies, this may include the Office of the Privacy Commissioner of Canada. Where EU or UK law applies, you may complain to the relevant supervisory authority.",
        ],
        links: [{ label: "Contact the OPC", href: "https://www.priv.gc.ca/en/contact-the-opc/" }],
      },
      {
        id: "minors",
        title: "Children and minors",
        eyebrow: "Age boundaries",
        paragraphs: [
          "Third Railify is a general-audience entertainment service and is not designed for a child who cannot lawfully provide the information or agreement required for an account, submission, or purchase. If local law requires parental or guardian permission, do not use that feature without it.",
          "Contact privacy@thirdrailify.com if you believe a minor provided personal information without valid permission so the record can be investigated and appropriate action taken.",
        ],
      },
      {
        id: "changes-contact",
        title: "Changes and contact",
        eyebrow: "Policy administration",
        paragraphs: [
          "We will update the revision date when this policy changes. Before starting a materially new use of existing personal information, we will provide additional notice or seek consent where required.",
          "Privacy requests and complaints: privacy@thirdrailify.com. General and order support: support@thirdrailify.com. Accessibility: access@thirdrailify.com. Security and technical issues: webmaster@thirdrailify.com.",
        ],
        links: [
          { label: "Terms of Use & Sale", href: "/terms" },
          { label: "Refund Policy", href: "/refunds" },
        ],
      },
    ],
  },

  refunds: {
    key: "refunds",
    order: "03",
    slug: "/refunds",
    shortTitle: "Refunds",
    title: "Refund Policy",
    eyebrow: "Orders without static",
    summary: "The difference between mandatory remedies and the voluntary change-of-mind position, plus the support path for damaged, incorrect, defective, or missing goods.",
    updated,
    revision,
    readingTime: "7 minute read",
    tone: "green",
    highlights: [
      { label: "Consumer rights", sectionId: "consumer-guarantees" },
      { label: "Change of mind", sectionId: "change-of-mind" },
      { label: "Order problems", sectionId: "order-problems" },
      { label: "Request help", sectionId: "request-help" },
    ],
    sections: [
      {
        id: "overview",
        title: "Overview",
        eyebrow: "Scope",
        paragraphs: [
          "This policy applies to purchases made directly through an enabled Third Railify checkout. It separates remedies required by law from any voluntary change-of-mind policy. A purchase completed on another marketplace uses that seller's process, subject to the mandatory rights that apply to the transaction.",
          "Nothing in this policy limits rights or remedies that cannot lawfully be excluded under applicable consumer protection law.",
        ],
      },
      {
        id: "current-checkout",
        title: "Current V2 checkout status",
        eyebrow: "No false transaction",
        paragraphs: [
          "The V2 storefront currently provides a browser-local cart and normal customer checkout is disabled. The cart does not accept payment, reserve stock, or create an order. The separate operator-only Stripe test path uses sandbox funds and cannot start fulfilment.",
          "If normal checkout is enabled later, the seller identity, product, variant, authoritative CAD amount, taxes, shipping, and other material terms shown before confirmation will apply to that order together with this policy.",
        ],
      },
      {
        id: "consumer-guarantees",
        title: "Statutory and consumer-guarantee remedies",
        eyebrow: "Rights required by law",
        paragraphs: [
          "Consumer-sale, cancellation, warranty, and remedy rules in Canada are substantially provincial and can also depend on the customer's location. A remedy may be available when an item is faulty, unsafe, does not match its description, is the wrong item, or otherwise fails a requirement that applies to the sale.",
          "Third Railify operates from Ontario. Ontario's current consumer-protection rules include specific internet-agreement disclosure, confirmation, cancellation, and refund rights in defined circumstances; they do not create a general return or exchange right for every correctly supplied item.",
          "The appropriate remedy depends on the law and circumstances. It may include repair, replacement, refund, re-supply, cancellation, or another required remedy. This policy does not promise a refund for every problem, impose a fixed expiry date on statutory rights, or treat one voluntary store rule as replacing mandatory rights.",
        ],
        links: [{ label: "Ontario returns, exchanges and warranties", href: "https://www.ontario.ca/page/returns-exchanges-and-warranties-ontario" }],
      },
      {
        id: "change-of-mind",
        title: "Voluntary change-of-mind policy",
        eyebrow: "Separate from statutory rights",
        paragraphs: [
          "Third Railify does not currently offer a general voluntary return entitlement merely because a customer changes their mind, chooses the wrong size or colour, or no longer wants a correctly supplied item. No unsupported 14-day, 30-day, or 60-day voluntary window is promised.",
          "This position applies only to change of mind or customer ordering error. It does not apply where a product is faulty, unsafe, incorrect, misdescribed, or subject to another mandatory remedy.",
        ],
      },
      {
        id: "made-to-order",
        title: "Made-to-order fulfilment",
        eyebrow: "Print on demand",
        paragraphs: [
          "Products may be made on demand and fulfilled by Printful or another disclosed production partner. Third Railify is the storefront and customer support route. Contacting the production provider directly is not required, and its policy does not replace Third Railify's obligations or your mandatory rights.",
          "Production and shipping estimates shown at checkout are estimates unless expressly guaranteed. Do not send an item to a provider or return address without support instructions, because the correct resolution and destination depend on the issue.",
        ],
      },
      {
        id: "sizes-variants",
        title: "Sizes, variants, and customer error",
        eyebrow: "Choose carefully",
        paragraphs: [
          "Check the product description and select the intended size, colour, and variant before ordering. A sizing preference or mistaken selection is normally a change-of-mind issue under the voluntary policy above.",
          "Receiving a different variant from the one confirmed, or an item that is faulty or materially misdescribed, is not treated as ordinary change of mind. Mandatory remedies remain available where the law requires them.",
        ],
      },
      {
        id: "order-problems",
        title: "Damaged, incorrect, defective, or missing orders",
        eyebrow: "Support path",
        paragraphs: [
          "Contact support@thirdrailify.com as soon as reasonably practicable if an enabled order arrives damaged, contains the wrong item, has a manufacturing defect, does not arrive, or has another fulfilment problem. Include the order reference, a clear description, and photographs where they are relevant and reasonably available.",
          "Photographs can help diagnose damage or a production error, but unreasonable evidence will not be demanded as a condition of a statutory right. We will assess the facts and identify the repair, replacement, refund, re-supply, investigation, or other next step available in the circumstances.",
        ],
      },
      {
        id: "request-help",
        title: "How to request help or a refund",
        eyebrow: "Resolution",
        bullets: [
          "Email support@thirdrailify.com.",
          "Include the order reference and the item or service affected.",
          "Explain what went wrong and the outcome you are seeking.",
          "Attach useful photographs where relevant; do not send a full card number, password, or identity-provider credentials.",
        ],
        paragraphs: [
          "We may ask for reasonable information needed to verify the order and problem. If a refund is the appropriate remedy, it will ordinarily be returned through the original payment method unless the provider or applicable law requires another method. Provider and financial-institution processing periods vary, so no unsupported completion time is promised.",
        ],
        links: [
          { label: "Terms of Use & Sale", href: "/terms#consumer-rights" },
        ],
      },
      {
        id: "policy-changes",
        title: "Policy changes",
        eyebrow: "Administration",
        paragraphs: [
          "We will publish the revision date when this policy changes. A later voluntary-policy change will not remove a remedy already attached to an accepted order or a right that cannot lawfully be excluded.",
        ],
      },
    ],
  },

  accessibility: {
    key: "accessibility",
    order: "04",
    slug: "/accessibility",
    shortTitle: "Accessibility",
    title: "Accessibility Statement",
    eyebrow: "A signal for everyone",
    summary: "Our accessibility goal, the measures built into V2, current third-party limitations, and a direct route for requesting help.",
    updated,
    revision,
    readingTime: "5 minute read",
    tone: "paper",
    highlights: [
      { label: "Our goal", sectionId: "commitment" },
      { label: "Measures", sectionId: "measures" },
      { label: "Limitations", sectionId: "limitations" },
      { label: "Report a barrier", sectionId: "feedback" },
    ],
    sections: [
      {
        id: "commitment",
        title: "Our commitment",
        eyebrow: "Accessibility goal",
        paragraphs: [
          "Third Railify wants people with disabilities to be able to browse, watch, shop, manage an account, and participate in community features with comparable independence and dignity.",
          "Our current goal is to meet Web Content Accessibility Guidelines (WCAG) 2.2 Level AA across the V2 public experience. This is a goal and design standard, not a claim that every page and third-party component has completed a formal conformance audit.",
        ],
        links: [{ label: "Read WCAG 2.2", href: "https://www.w3.org/TR/WCAG22/" }],
      },
      {
        id: "measures",
        title: "Measures built into V2",
        eyebrow: "How we work",
        bullets: [
          "Semantic page landmarks, one logical page heading, structured subheadings, and a skip-to-content link.",
          "Keyboard-operable navigation, dialogs, selectors, galleries, media controls, and visible focus treatment.",
          "Text alternatives for informative images, decorative-image suppression, descriptive links, labels, and status text that does not rely on colour alone.",
          "Responsive layouts from small mobile screens through large desktops, with zoom, reflow, readable type, and horizontal-overflow checks.",
          "Colour contrast and restrained animation, with nonessential motion disabled when reduced motion is requested.",
          "Accessible form labels, instructions, validation feedback, focus restoration, and confirmation handling.",
          "A list-based alternative to the interactive GOATS map and direct provider routes when an embedded player is unavailable.",
        ],
      },
      {
        id: "testing",
        title: "Testing and improvement",
        eyebrow: "Ongoing work",
        paragraphs: [
          "Accessibility is included in component review, automated checks, keyboard testing, responsive browser validation, and regression coverage. Automated tools cannot find every barrier, so lived experience and direct feedback remain important.",
          "When we discover a barrier, we prioritise it based on impact, frequency, and whether an immediate alternative route is available.",
        ],
      },
      {
        id: "limitations",
        title: "Known and possible limitations",
        eyebrow: "Third-party edges",
        bullets: [
          "YouTube and Rumble players, Discord content, identity-provider screens, Turnstile, and payment or fulfilment interfaces are supplied by third parties and may have accessibility behaviour we cannot directly change.",
          "Captions, transcripts, chapter data, and audio description depend on the source media and may not be available for every live or historical programme.",
          "Interactive maps can be difficult with some assistive technology. The GOATS gallery and location list provide the same approved listings without requiring map interaction.",
          "Historic images, clips, or linked documents may not yet have complete alternatives. Contact us for an accessible route or format.",
        ],
        note: "If a third-party component blocks access, we will offer a practical alternative where one is available and raise material issues with the provider.",
      },
      {
        id: "physical-events",
        title: "Physical events and formats",
        eyebrow: "Beyond the site",
        paragraphs: [
          "Third Railify is primarily an online service and does not currently operate a public retail location. If an in-person event or downloadable document is offered and you need an accommodation or alternative format, contact us as early as practical.",
        ],
      },
      {
        id: "feedback",
        title: "Report a barrier",
        eyebrow: "Direct contact",
        paragraphs: [
          "Email access@thirdrailify.com or support@thirdrailify.com. Include the page URL, what you were trying to do, the barrier you encountered, and your preferred contact method or format. You do not need to disclose a diagnosis or disability.",
          "We aim to acknowledge accessibility feedback within five business days. Resolution time depends on the issue, but we will communicate a useful next step or alternative route whenever possible.",
        ],
      },
    ],
  },
};

export const policyList = (Object.values(policyDocuments) as PolicyDocument[]).sort((a, b) => a.order.localeCompare(b.order));
