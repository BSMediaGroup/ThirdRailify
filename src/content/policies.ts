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
  readingTime: string;
  tone: "gold" | "cyan" | "green" | "paper";
  highlights: Array<{ label: string; sectionId: string }>;
  sections: PolicySection[];
};

const updated = "28 August 2026";

export const policyDocuments: Record<PolicyKey, PolicyDocument> = {
  terms: {
    key: "terms",
    order: "01",
    slug: "/terms",
    shortTitle: "Terms",
    title: "Terms & Conditions",
    eyebrow: "Rules of the rail",
    summary: "The agreement for using Third Railify, its accounts, community features, media, and any offerings that become available through the site.",
    updated,
    readingTime: "12 minute read",
    tone: "gold",
    highlights: [
      { label: "Using the service", sectionId: "using-the-service" },
      { label: "Accounts & community", sectionId: "accounts" },
      { label: "Commerce", sectionId: "commerce" },
      { label: "Legal terms", sectionId: "disclaimers" },
    ],
    sections: [
      {
        id: "who-we-are",
        title: "Who these terms cover",
        eyebrow: "Scope",
        paragraphs: [
          "Third Railify is an Ontario, Canada-based digital entertainment and podcast service operated at thirdrailify.com and its authorised staging domains. These Terms govern the Third Railify website, accounts, content, community features, and offerings.",
          "In these Terms, “Third Railify”, “we”, “us”, and “our” refer to the operator of the Third Railify service. “You” means anyone who visits or uses the service.",
        ],
      },
      {
        id: "using-the-service",
        title: "Acceptance and use",
        eyebrow: "Agreement",
        paragraphs: [
          "By accessing or using the service, creating an account, submitting content, or completing a transaction when one is available, you agree to these Terms and acknowledge our Privacy Policy. If you do not agree, do not use the affected service or feature.",
          "Mandatory consumer rights and other rights that cannot lawfully be waived continue to apply regardless of anything in these Terms.",
        ],
      },
      {
        id: "eligibility",
        title: "Eligibility",
        eyebrow: "Age & authority",
        paragraphs: [
          "You must be legally capable of agreeing to these Terms. You must be at least the age of majority where you live to purchase paid offerings or enter a recurring membership. If you use the service for an organisation, you confirm that you have authority to bind it.",
        ],
      },
      {
        id: "accounts",
        title: "Accounts and security",
        eyebrow: "Identity",
        bullets: [
          "Provide accurate information and keep it reasonably current.",
          "Protect your credentials and promptly tell us about suspected unauthorised access.",
          "Do not share, sell, automate, or impersonate an account or another person.",
          "We may restrict or disable an account where reasonably necessary for security, abuse prevention, infringement, payment disputes, legal compliance, or community safety.",
        ],
        note: "Account access may use email credentials or an identity provider. The provider's separate terms also apply to your use of that provider.",
      },
      {
        id: "offerings",
        title: "What the service provides",
        eyebrow: "Offerings",
        bullets: [
          "Podcast, livestream, recorded video, editorial, and informational content.",
          "Community features, including approved GOATS submissions, comments, reactions, profiles, and public Discord information where enabled.",
          "A merchandise catalogue and browser-local preview cart. The V2 site does not accept payment unless an enabled checkout expressly says otherwise.",
          "Membership, donation, digital-content, or other paid features only when they are expressly offered with price and checkout terms.",
        ],
        paragraphs: [
          "Features, schedules, platform availability, and catalogue items may change. We may maintain, replace, suspend, or discontinue a feature, but changes do not remove rights already acquired under applicable law or an accepted order.",
        ],
      },
      {
        id: "community-content",
        title: "Your content and community rules",
        eyebrow: "Submissions",
        paragraphs: [
          "You keep ownership of content you submit. You grant us a worldwide, non-exclusive, royalty-free licence to host, copy, resize, format, moderate, display, and distribute that content through Third Railify and its promotional channels for the purpose of operating and promoting the service. The licence lasts for as long as the content is published or reasonably needed for backups, disputes, and legal compliance.",
          "You confirm that you have the rights and permissions required for everything you submit, including images of other people. Approval is never automatic. We may edit for formatting, decline, hide, or remove content where reasonably necessary, without fabricating its meaning or attribution.",
        ],
        bullets: [
          "Do not submit unlawful, infringing, deceptive, defamatory, harassing, hateful, exploitative, or privacy-invasive material.",
          "Do not publish street addresses, private contact details, credentials, or other sensitive information about yourself or another person.",
          "Do not manipulate reactions, comments, rankings, moderation, or account systems.",
        ],
      },
      {
        id: "commerce",
        title: "Orders, prices, and payments",
        eyebrow: "Commerce",
        paragraphs: [
          "The current V2 cart is a local preview and cannot create an order. If checkout is enabled later, the price, currency, taxes, shipping, payment method, recurring terms, and fulfilment disclosures shown before confirmation form part of your order.",
          "Payment credentials are handled by the payment provider presented at checkout; we do not intend to receive or store full card numbers. Merchandise may be produced on demand by a fulfilment partner such as Printful. Product images are illustrative and minor production differences may occur.",
          "You are responsible for accurate delivery information and for duties or import charges disclosed as your responsibility, subject to mandatory consumer law. Delivery estimates are estimates, not guarantees.",
        ],
        links: [{ label: "Read the Refund Policy", href: "/refunds" }],
      },
      {
        id: "memberships",
        title: "Memberships and recurring services",
        eyebrow: "Future paid access",
        paragraphs: [
          "Memberships are not part of the current V2 checkout. If recurring access is offered, the applicable tier, billing interval, renewal terms, included benefits, cancellation route, and any membership-specific policy will be shown before purchase and will appear in the Policy Library when published.",
          "Unless the checkout says otherwise, cancellation stops future renewals and access continues to the paid-through date. Refunds remain subject to the Refund Policy and mandatory law.",
        ],
      },
      {
        id: "media-platforms",
        title: "Video, API, and external platforms",
        eyebrow: "Third-party signal",
        paragraphs: [
          "Watch surfaces display validated public metadata and embeds from services such as YouTube and Rumble. Third Railify retains a bounded archive of up to 24 naturally ingested broadcast records so viewers can find past episodes; it does not scrape providers in the browser or store your provider credentials or private viewing history.",
          "Embedded players and links are operated by their providers. Their availability, advertising, accessibility, and data practices are outside our control. By using YouTube-powered features, you also agree to the YouTube Terms of Service.",
        ],
        links: [
          { label: "YouTube Terms of Service", href: "https://www.youtube.com/t/terms" },
          { label: "Google Privacy Policy", href: "https://policies.google.com/privacy" },
        ],
      },
      {
        id: "third-parties",
        title: "Third-party services",
        eyebrow: "Connected services",
        paragraphs: [
          "Hosting, security checks, identity providers, maps, community previews, video players, fulfilment, and payment services may be supplied by third parties. Their own terms apply when you interact with them. A link does not imply that Third Railify controls or endorses everything on the destination service.",
        ],
        links: [{ label: "See providers in the Privacy Policy", href: "/privacy#service-providers" }],
      },
      {
        id: "acceptable-use",
        title: "Acceptable use",
        eyebrow: "Boundaries",
        bullets: [
          "Do not break the law, violate rights, or use the service to harm, threaten, exploit, or defraud anyone.",
          "Do not probe or access non-public systems, bypass access controls, interfere with security, or introduce malicious code.",
          "Do not overload the service with abusive automation or scraping, or circumvent provider restrictions, paywalls, or digital rights controls.",
          "Do not use Third Railify branding, content, or data to misrepresent affiliation, origin, sponsorship, or endorsement.",
        ],
      },
      {
        id: "intellectual-property",
        title: "Intellectual property",
        eyebrow: "Ownership",
        paragraphs: [
          "Except for user content and third-party material, the service's content, code, logos, graphics, merchandise designs, audio, and brand identifiers are owned by Third Railify or its licensors and are protected by Canadian and international intellectual-property laws. Third Railify™ and associated marks may be common-law or registered marks of their respective owners.",
          "You may use the service for personal, non-commercial purposes. No other licence is granted. Fair dealing, fair use, and other statutory exceptions remain available where the law provides them.",
        ],
      },
      {
        id: "disclaimers",
        title: "Disclaimers",
        eyebrow: "Risk allocation",
        paragraphs: [
          "The service is provided on an “as is” and “as available” basis to the maximum extent permitted by law. We do not guarantee uninterrupted availability, error-free content, a particular broadcast schedule, or continuing access to a third-party platform.",
          "Third Railify content is entertainment and commentary. It may contain opinions, satire, errors, or discussion of sensitive events. It is not legal, medical, financial, or other professional advice.",
          "Nothing in these Terms excludes warranties or remedies that cannot lawfully be excluded.",
        ],
      },
      {
        id: "liability",
        title: "Limitation of liability",
        eyebrow: "Legal limits",
        paragraphs: [
          "To the extent permitted by law, Third Railify is not liable for indirect, incidental, special, consequential, exemplary, or punitive loss, or for lost profits or revenue, arising from the service. To the extent a monetary cap is lawful, aggregate liability relating to a paid offering will not exceed the amount you paid for that offering during the three months before the event giving rise to the claim.",
          "These limits do not apply to fraud, wilful misconduct, or any liability or consumer remedy that cannot legally be limited. Some jurisdictions do not allow particular exclusions, so some of this section may not apply to you.",
        ],
      },
      {
        id: "indemnity",
        title: "Responsibility for misuse",
        eyebrow: "Indemnity",
        paragraphs: [
          "To the extent permitted by law, you will indemnify Third Railify against third-party claims, losses, and reasonable costs directly caused by your unlawful user content, material breach of these Terms, or deliberate misuse of the service. We will provide reasonable notice and will not settle a claim in a way that imposes an admission or non-monetary obligation on you without your consent.",
        ],
      },
      {
        id: "changes-law-contact",
        title: "Changes, law, and contact",
        eyebrow: "Administration",
        paragraphs: [
          "We may update these Terms and will publish the revised date. Material changes apply prospectively, and we will provide additional notice or obtain renewed agreement where required by law. Continued use after an effective update may indicate acceptance, but cannot replace consent where the law specifically requires it.",
          "These Terms are governed by the laws of Ontario and applicable federal laws of Canada, without regard to conflict-of-laws rules. Courts in Ontario have jurisdiction, except where mandatory consumer law allows you to bring a claim elsewhere.",
          "Questions about these Terms can be sent to support@thirdrailify.com. Technical issues can be sent to webmaster@thirdrailify.com.",
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
    summary: "What Third Railify collects, why it is used, where it goes, how long it is kept, and the choices available to you.",
    updated,
    readingTime: "14 minute read",
    tone: "cyan",
    highlights: [
      { label: "Data we handle", sectionId: "information-we-collect" },
      { label: "Retention", sectionId: "retention" },
      { label: "Providers", sectionId: "service-providers" },
      { label: "Your rights", sectionId: "your-rights" },
    ],
    sections: [
      {
        id: "scope-controller",
        title: "Scope and controller",
        eyebrow: "Overview",
        paragraphs: [
          "This Privacy Policy explains how Third Railify, an Ontario, Canada-based digital entertainment service, handles personal information through thirdrailify.com, authorised staging domains, accounts, community features, Watch, and the storefront preview.",
          "Third Railify is the organisation responsible for the processing described here. This policy does not replace the privacy notices of services you choose to visit, such as Discord, YouTube, Rumble, or an identity provider.",
          "For privacy questions or rights requests, email privacy@thirdrailify.com. General support is available at support@thirdrailify.com.",
        ],
      },
      {
        id: "information-we-collect",
        title: "Information we collect",
        eyebrow: "Data categories",
        bullets: [
          "Account and profile data: email address, display name, avatar, account status, dates, and identifiers from an identity provider you choose. Passwords are processed as salted verifiers; we do not need to retain your readable password.",
          "Authentication and security data: session and anti-forgery token hashes, provider transaction records, login dates, bounded return paths, hashed device or network signals, rate-limit records, and security audit events.",
          "Community data: comments, reactions, public display identity, and GOATS submission details such as private contact email, submitted images, story, optional rating, consent record, product selection, and deliberately approximate city/region/country location.",
          "Support and transaction data: messages and attachments you send us and, if paid services are enabled, order, delivery, billing-status, refund, and fulfilment records. Full payment-card numbers are handled by the payment provider, not stored by Third Railify.",
          "Technical request data: IP address, browser or device type, operating system, requested URL, referrer, timestamps, and network/security events that may be processed in ordinary server and Cloudflare logs.",
          "Browser-local data: preview cart product IDs and quantities, display currency and cached exchange rates, and a GOATS form draft excluding its email, consent checkbox, and images. These stay in your browser unless you submit the relevant information.",
          "Public platform data: Third Railify video IDs, titles, thumbnails, channel identity, schedule, and broadcast state supplied through authorised ingest or provider services. Watch keeps up to 24 naturally ingested episode records; it does not collect your private provider account or viewing history.",
          "Discord public display data: bounded public server, channel, display-name, avatar, and presence fields from Third Railify's authorised bot projection or Discord's public widget. We do not receive private Discord messages through the widget.",
        ],
      },
      {
        id: "how-we-use-data",
        title: "How we use information",
        eyebrow: "Purposes",
        bullets: [
          "Provide, secure, diagnose, and improve the site and its account, media, storefront, and community features.",
          "Authenticate users, manage sessions and profiles, prevent fraud and abuse, and enforce the Terms.",
          "Receive, validate, moderate, publish, hide, and administer community submissions, comments, and reactions.",
          "Respond to support, privacy, accessibility, and legal requests.",
          "Process and fulfil an order, membership, donation, cancellation, or refund if those paid services are enabled.",
          "Comply with legal duties, preserve evidence, resolve disputes, and protect users, Third Railify, and the public.",
        ],
        note: "Third Railify does not sell personal information. The current V2 site does not intentionally run behavioural advertising or non-essential marketing analytics.",
      },
      {
        id: "lawful-bases",
        title: "Lawful bases for European users",
        eyebrow: "EEA & UK",
        paragraphs: [
          "Where the GDPR or UK GDPR applies, we rely on the basis that fits the activity: performance of a contract for accounts and paid services; consent for optional publication or a use that specifically asks for it; legitimate interests for service operation, security, moderation, fraud prevention, and proportionate improvement; and legal obligation for tax, accounting, lawful requests, and compliance records.",
          "Our legitimate interests are operating a safe, reliable entertainment and community service, protecting it from abuse, and understanding operational failures. We consider the impact on your rights before relying on this basis. We do not use solely automated decision-making that produces legal or similarly significant effects. Automated security checks may challenge or rate-limit a request, with support available if that prevents legitimate access.",
        ],
      },
      {
        id: "cookies-local-storage",
        title: "Cookies and local storage",
        eyebrow: "Your device",
        bullets: [
          "Essential session cookie: a secure, HTTP-only cookie keeps an authenticated session on the current host and expires after eight hours. It uses SameSite=Lax and is not available to page scripts.",
          "Local cart: product IDs and quantities persist until you clear the cart or browser storage. It does not create an order or contain payment details.",
          "Currency preference and rate cache: the selected display currency and a validated exchange-rate snapshot persist locally for convenience.",
          "GOATS draft: non-sensitive text selections may persist locally while you prepare a submission. The local draft excludes your email, consent, and image files and is removed after successful submission.",
          "Third-party resources: an embedded video, identity-provider redirect, map resource, Discord request, or Turnstile challenge may let that provider process technical information under its own policy.",
        ],
        note: "There is no V2 marketing-cookie banner because the current implementation does not intentionally set non-essential advertising or marketing cookies. If that changes, the consent experience and this policy must change before those technologies are enabled.",
      },
      {
        id: "community-publication",
        title: "Community submissions and publication",
        eyebrow: "GOATS & comments",
        paragraphs: [
          "GOATS submissions begin as private moderation records. Draft uploads expire after 24 hours and become eligible for cleanup if not finalised. A final submission keeps the contact email private while moderators validate consent, media, product identity, story, and a coarse location. Only approved public fields are exposed on the site.",
          "Public fields may include display name, approved images, story, approximate location label and privacy-adjusted map point, linked product, optional rating, dates, comments, reactions, and avatar. Do not submit a street address or material you are not authorised to publish.",
          "Removing public content does not always erase every underlying record immediately; a limited record may remain where needed for appeals, security, rights management, legal claims, or backup integrity.",
        ],
      },
      {
        id: "watch-and-platform-data",
        title: "Watch and platform data",
        eyebrow: "Broadcast metadata",
        paragraphs: [
          "Third Railify receives signed broadcast snapshots and displays public YouTube and Rumble metadata. The current snapshot changes naturally, while a separate archive keeps at most 24 eligible episode records with stable IDs. Hidden records remain in that bounded retention set but are not public.",
          "The site uses YouTube's privacy-enhanced embed domain and does not autoplay. Loading or playing an embedded provider may still disclose technical request information to that provider. Third Railify does not request your Google or Rumble credentials and does not store a viewer-specific watch history.",
        ],
        links: [
          { label: "Google Privacy Policy", href: "https://policies.google.com/privacy" },
          { label: "YouTube Terms of Service", href: "https://www.youtube.com/t/terms" },
        ],
      },
      {
        id: "service-providers",
        title: "Service providers and recipients",
        eyebrow: "Where data goes",
        bullets: [
          "Cloudflare provides Pages hosting, Functions and Workers, network delivery and security, Turnstile bot checks, D1 database storage, Durable Object state, R2-backed media storage, and related infrastructure. Cloudflare may process IP addresses, routing data, request metadata, security signals, and data stored for us.",
          "Discord may provide sign-in and public community-widget information. The public widget can expose Discord display names, avatars, and presence selected by Discord or the authorised bot signal.",
          "Google/YouTube and Rumble provide linked or embedded media and public broadcast metadata. An identity provider you choose may also provide account identifiers, display information, and verified email status.",
          "OpenFreeMap and its underlying OpenMapTiles/OpenStreetMap ecosystem provide map resources for approved approximate community locations. Frankfurter provides public exchange-rate data; our request does not intentionally send your cart or account data.",
          "If commerce is enabled, a disclosed payment processor and fulfilment partner such as Printful receive the information needed to process payment, produce merchandise, deliver orders, and handle returns.",
          "Professional advisers, insurers, transaction counterparties, courts, regulators, or law enforcement may receive information where reasonably necessary and lawful. We may also disclose information to protect rights, safety, and service integrity.",
        ],
        links: [
          { label: "Cloudflare Privacy Policy", href: "https://www.cloudflare.com/privacypolicy/" },
          { label: "Discord Privacy Policy", href: "https://discord.com/privacy" },
          { label: "OpenFreeMap Privacy Policy", href: "https://openfreemap.org/privacy/" },
          { label: "Printful Privacy Policy", href: "https://www.printful.com/policies/privacy" },
        ],
      },
      {
        id: "retention",
        title: "How long we keep information",
        eyebrow: "Retention",
        paragraphs: [
          "We keep personal information only for as long as reasonably needed for the stated purpose, then delete, anonymise, or securely isolate it unless a longer period is required or permitted by law. We consider account status, user expectations, sensitivity, dispute and limitation periods, security needs, tax or accounting duties, provider rules, and technical backup cycles.",
        ],
        bullets: [
          "Browser-local cart, currency, rates, and draft values remain until the feature removes them or you clear site storage.",
          "The authentication cookie expires after eight hours. Expired or revoked server-side session, token, rate-limit, and audit records are retained only for proportionate security, troubleshooting, and legal-accountability needs, then scheduled for deletion or anonymisation.",
          "Unfinalised GOATS submission drafts expire after 24 hours and become eligible for cleanup. Final submissions and media are kept through moderation and publication, and afterward only as needed for consent evidence, disputes, safety, or legal obligations.",
          "Account and profile records are kept while an account is active and for a reasonable closure period needed for recovery, security, disputes, or law. You may request deletion, subject to lawful exceptions.",
          "Support correspondence, commerce, tax, refund, and fulfilment records are retained for the applicable relationship and statutory recordkeeping or claim period.",
          "The Watch archive is structurally capped at 24 eligible episode records. It contains public programme metadata, not a viewer history.",
          "Cloudflare and other providers apply their own documented retention schedules to data they process for infrastructure and security.",
        ],
        note: "We review retention when purposes, providers, laws, or system architecture materially change. A legal hold, safety investigation, or active claim may temporarily extend an otherwise applicable period.",
      },
      {
        id: "international-transfers",
        title: "International processing",
        eyebrow: "Data location",
        paragraphs: [
          "Third Railify is based in Canada and uses providers that operate internationally. Your information may therefore be processed in Canada, the United States, the European Economic Area, or another country where a provider operates, and local access laws may differ from those where you live.",
          "Where European data-transfer rules apply, we rely on an available lawful mechanism appropriate to the provider and transfer, such as an adequacy decision, contractual safeguards including Standard Contractual Clauses, or a permitted derogation. Contact us if you want information about the safeguard relevant to your data.",
        ],
      },
      {
        id: "security",
        title: "Security",
        eyebrow: "Safeguards",
        paragraphs: [
          "We use layered administrative and technical safeguards appropriate to the service, including HTTPS, secure and HTTP-only session cookies, hashed credentials and tokens, narrow data projections, role-based administration, request validation, bot protection, bounded uploads, and separation of public and administrative authority.",
          "No online service can guarantee absolute security. Use a unique password, protect your identity-provider account, and contact support@thirdrailify.com promptly if you suspect misuse.",
        ],
      },
      {
        id: "your-rights",
        title: "Your privacy rights",
        eyebrow: "Access & control",
        paragraphs: [
          "Depending on where you live, you may have rights to know whether we hold personal information about you; access it; correct inaccurate information; request deletion; withdraw consent; object to or restrict processing; receive portable data; and complain to a privacy regulator. Canadian privacy principles also support access, accuracy, openness, and a way to challenge compliance.",
          "If the GDPR or UK GDPR applies, you may object to direct marketing at any time and may object to processing based on legitimate interests. Consent can be withdrawn prospectively without affecting processing already lawful before withdrawal.",
          "Email privacy@thirdrailify.com with your request and enough detail to identify the relevant account or submission. We may verify your identity, narrow an overbroad request, or retain information where a lawful exception applies. We will respond within the time required by applicable law. You may complain to your local supervisory authority; Canadian concerns may also be raised with the Office of the Privacy Commissioner of Canada where it has jurisdiction.",
        ],
      },
      {
        id: "children",
        title: "Children's privacy",
        eyebrow: "Age boundaries",
        paragraphs: [
          "Third Railify is a general-audience entertainment service and is not directed to children who cannot lawfully consent to the relevant processing. Do not create an account, submit community content, or purchase an offering if local law requires consent you do not have. If you believe a child supplied personal information without valid permission, contact privacy@thirdrailify.com so we can investigate and take appropriate action.",
        ],
      },
      {
        id: "changes-contact",
        title: "Changes and contact",
        eyebrow: "Policy administration",
        paragraphs: [
          "We will update the date on this page when this policy changes. If a change materially affects how existing personal information is used, we will provide additional notice or seek consent where required.",
          "Privacy and rights requests: privacy@thirdrailify.com. Accessibility barriers: access@thirdrailify.com. General support: support@thirdrailify.com. Website security and technical issues: webmaster@thirdrailify.com.",
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
    summary: "How returns, replacements, cancellations, and refunds work when Third Railify enables a paid offering.",
    updated,
    readingTime: "6 minute read",
    tone: "green",
    highlights: [
      { label: "Current checkout", sectionId: "current-checkout" },
      { label: "Merchandise", sectionId: "merchandise" },
      { label: "Digital & membership", sectionId: "digital-memberships" },
      { label: "Request support", sectionId: "request-refund" },
    ],
    sections: [
      {
        id: "overview",
        title: "Overview",
        eyebrow: "Scope",
        paragraphs: [
          "This policy applies to eligible purchases made directly from Third Railify. It does not reduce non-waivable consumer rights under Ontario, Canadian, or other applicable law. A third-party marketplace purchase is governed by that marketplace's return process unless the checkout expressly says otherwise.",
        ],
      },
      {
        id: "current-checkout",
        title: "Current V2 checkout status",
        eyebrow: "No false transaction",
        paragraphs: [
          "The V2 storefront currently provides a browser-local preview cart and does not accept payment or create orders. Until an enabled checkout expressly confirms a transaction, there is no V2 purchase to cancel or refund. If the site sends you to another authorised store, review the checkout and refund terms shown there before paying.",
        ],
      },
      {
        id: "merchandise",
        title: "Made-to-order merchandise",
        eyebrow: "Physical goods",
        paragraphs: [
          "Most merchandise may be produced on demand by a disclosed fulfilment partner such as Printful. If an item arrives damaged, misprinted, defective, or materially different from the confirmed order, contact us within 30 days of delivery with the order number, a description, and clear photos. We will assess the issue and, where accepted, arrange a replacement or refund.",
          "Because made-to-order items are produced specifically for an order, change-of-mind, colour-preference, or size/fit returns are generally not accepted unless required by law. Check the product description and size chart before ordering. Do not send an item back without instructions; unauthorised returns may be refused.",
          "Original shipping is generally non-refundable unless the item was defective, incorrect, or the law requires otherwise. Approved refunds return to the original payment method; provider processing times vary.",
        ],
      },
      {
        id: "digital-memberships",
        title: "Digital content and memberships",
        eyebrow: "Access products",
        paragraphs: [
          "Digital downloads or streams are generally final once access or delivery begins, except where the checkout promises otherwise or the law provides a cancellation or remedy.",
          "If recurring memberships are enabled, you may cancel future renewal through the route disclosed at purchase. Access ordinarily continues through the paid-through date, with no prorated refund for the unused remainder unless required by law or Third Railify materially fails to provide the core paid service.",
          "For a significant unplanned outage, we may offer a credit, extension, replacement benefit, or refund depending on the circumstances and applicable law.",
        ],
      },
      {
        id: "donations",
        title: "Donations and voluntary support",
        eyebrow: "Contributions",
        paragraphs: [
          "A clearly described voluntary donation made without receiving a product or paid plan is generally non-refundable, except for duplicate or unauthorised transactions and rights that apply by law. Contact us promptly if a contribution was made in error.",
        ],
      },
      {
        id: "request-refund",
        title: "Request support or a refund",
        eyebrow: "Resolution",
        paragraphs: [
          "Email support@thirdrailify.com with your order number, the item or service, what went wrong, and any useful photographs. Do not include a full card number, account password, or identity-provider credentials.",
          "We will confirm the next step and may request reasonable evidence. Approved refunds are issued to the original payment method unless the provider or applicable law requires another method. Processing time after approval depends on the payment provider and your financial institution.",
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
