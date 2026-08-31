/* global URL */

export const SITE_NAME = "Third Railify";
export const BRAND_NAME = "Third Railify™";
export const SITE_LANGUAGE = "en-CA";
export const DEFAULT_DESCRIPTION = "Third Railify is a Canadian daily podcast covering news, crime, pop culture, live commentary, and the arguments in between.";
export const DEFAULT_SOCIAL_IMAGE_PATH = "/social/shawn-gina-hero.webp";
export const INDEX_ROBOTS = "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";
export const NOINDEX_ROBOTS = "noindex, follow, noarchive";

const STATIC_ROUTES = [
  route("/", "home", "Third Railify™ | News, Crime, Pop Culture & Chaos", DEFAULT_DESCRIPTION, {
    label: "Home",
    schemaType: "WebPage",
    imageAlt: "Shawn and Gina from the Third Railify podcast",
    home: true,
  }),
  route("/about", "about", "About the Show | Third Railify", "Meet the story, hosts, recurring formats, and live community behind Third Railify's Canadian news, crime, and pop-culture podcast.", {
    label: "About",
    schemaType: "AboutPage",
    imageAlt: "Shawn and Gina, hosts of Third Railify",
  }),
  route("/shawn", "host:shawn", "Shawn | Third Railify Host", "Meet Shawn, the Canadian host bringing news, crime, pop culture, live commentary, and unscheduled detours to Third Railify.", {
    label: "Shawn",
    schemaType: "ProfilePage",
    imagePath: "/social/shawn3.webp",
    imageAlt: "Illustrated portrait of Shawn from Third Railify",
    person: { name: "Shawn", jobTitle: "Third Railify host" },
  }),
  route("/gina", "host:gina", "Gina | Third Railify Co-host", "Meet Gina, the Third Railify co-host bringing sass, humour, mysteries, culture, and a distinct Just Gina perspective to the show.", {
    label: "Gina",
    schemaType: "ProfilePage",
    imagePath: "/social/gina3.webp",
    imageAlt: "Illustrated portrait of Gina from Third Railify",
    person: { name: "Gina", jobTitle: "Third Railify co-host" },
  }),
  route("/watch", "watch", "Watch Third Railify Live & On Demand", "Watch the current Third Railify signal, check verified live status, and open recent completed transmissions from the public archive.", {
    label: "Watch",
    schemaType: "CollectionPage",
    imageAlt: "Shawn and Gina on Third Railify",
    podcast: true,
  }),
  route("/watch/live", "watch:live", "Watch Third Railify Live", "Open the current verified Third Railify broadcast or the latest available transmission from the official Watch rail.", {
    label: "Live",
    parent: ["Watch", "/watch"],
    schemaType: "WebPage",
    imageAlt: "Third Railify live broadcast with Shawn and Gina",
  }),
  route("/watch/episodes", "watch:episodes", "Third Railify Episode Archive", "Browse the retained Third Railify Watch archive and replay completed news, crime, pop-culture, and community transmissions.", {
    label: "Episodes",
    parent: ["Watch", "/watch"],
    schemaType: "CollectionPage",
    imageAlt: "Third Railify episode archive",
  }),
  route("/gaming", "gaming", "Third Railify Gaming | Third Railify", "Watch Third Railify Gaming on Rumble, check the four-session weekly schedule and current game rotation, or securely suggest the next game.", {
    label: "Gaming",
    parent: ["Community", "/community"],
    schemaType: "CollectionPage",
    imageAlt: "Third Railify Gaming green signal artwork",
  }),
  route("/wheels", "wheels", "Competition Wheels | Third Railify", "Explore public Third Railify competition wheels for giveaways, games, raid calls, and live show segments, with practice spins kept separate from recorded official draws.", {
    label: "Wheels",
    parent: ["Community", "/community"],
    schemaType: "CollectionPage",
    imageAlt: "Third Railify competition wheels",
  }),
  route("/wheels/new", "wheels:new", "Build a Competition Wheel | Third Railify", "Create a Third Railify competition wheel with approved creator access, participant controls, appearance settings, and explicit publication choices.", {
    label: "Build a wheel",
    parent: ["Wheels", "/wheels"],
    index: false,
  }),
  route("/polls", "polls", "Live Audience Polls | Third Railify", "Vote in open Third Railify Polls and follow authoritative live results from the web and Rumble chat.", {
    label: "Polls",
    parent: ["Community", "/community"],
    schemaType: "CollectionPage",
    imageAlt: "Third Railify live audience Polls",
  }),
  route("/polls/new", "polls:new", "Build a Live Poll | Third Railify", "Create a versioned Third Railify audience Poll with exact whole-message chat triggers and server-owned results.", {
    label: "Build a Poll",
    parent: ["Polls", "/polls"],
    index: false,
  }),
  route("/wheels/stages/new", "wheels:stage:new", "Build a Multi-Wheel Stage | Third Railify", "Compose up to six accessible Third Railify Wheels into a private-by-default responsive Stage.", {
    label: "Build a Stage",
    parent: ["Wheels", "/wheels"],
    index: false,
  }),
  route("/live", "watch:live-alias", "Finding the Current Third Railify Broadcast", "Check the verified Third Railify broadcast state and continue to the current live player or the main Watch page.", {
    label: "Current broadcast",
    canonicalPath: "/watch",
    parent: ["Watch", "/watch"],
    index: false,
  }),
  route("/shop", "shop", "Official Podcast Merch | Third Railify Shop", "Browse official Third Railify and Just Gina podcast merchandise, real catalogue variants, and authoritative CAD pricing.", {
    label: "Shop",
    schemaType: "CollectionPage",
    imageAlt: "Official Third Railify podcast merchandise",
  }),
  route("/cart", "cart", "Your Cart | Third Railify Shop", "Review the Third Railify merchandise and variants saved in this browser before checkout becomes available.", {
    label: "Cart",
    parent: ["Shop", "/shop"],
    index: false,
  }),
  route("/checkout", "checkout", "Delivery & Checkout | Third Railify Shop", "Review delivery details, server-issued shipping, and the authoritative CAD order total before payment becomes available.", {
    label: "Checkout",
    parent: ["Shop", "/shop"],
    index: false,
  }),
  route("/checkout/success", "checkout:status", "Order Status | Third Railify", "Check the exact status of a Third Railify test checkout session without exposing payment or provider details.", {
    label: "Order status",
    parent: ["Shop", "/shop"],
    index: false,
  }),
  route("/community", "community", "Join the Third Railify Community", "Join the Third Railify community, find the official Discord, meet friends of the show, and explore GOATS in the Wild.", {
    label: "Community",
    schemaType: "CollectionPage",
    imagePath: "/social/farm1.webp",
    imageAlt: "Third Railify community goat artwork",
  }),
  route("/friends", "friends", "Friends of the Show | Third Railify", "Meet Daniel Clancy, Darnell Quiggley, and Simple Davy—the recurring voices who bring extra chaos to Third Railify.", {
    label: "Friends",
    parent: ["Community", "/community"],
    schemaType: "CollectionPage",
  }),
  route("/vip", "vip", "Third Railify VIP Membership", "Explore the current Third Railify community membership path and the Baby GOAT, Blossom GOAT, Mega GOAT, and Improbable GOAT tiers.", {
    label: "VIP",
    parent: ["Community", "/community"],
  }),
  route("/donate", "donate", "Donate to Third Railify | Power the Signal", "Support the independent production behind Third Railify and help keep the Canadian news, culture, and chaos signal broadcasting.", {
    label: "Donate",
    imageAlt: "Shawn and Gina from the independent Third Railify podcast",
  }),
  route("/gift-cards", "gift-cards", "Third Railify Gift Cards", "Find the current Third Railify gift-card path for CAD amounts, recipient delivery, and official store credit.", {
    label: "Gift cards",
    parent: ["Shop", "/shop"],
  }),
  route("/goats", "goats", "GOATS in the Wild | Third Railify Community", "Explore approved community stories, Third Railify merch in the wild, approximate map pins, photos, and worldwide GOAT sightings.", {
    label: "GOATS in the Wild",
    parent: ["Community", "/community"],
    schemaType: "CollectionPage",
    imagePath: "/social/farm1.webp",
    imageAlt: "GOATS in the Wild community artwork",
  }),
  route("/goats/submit", "goats:submit", "Submit Your GOATED Drip | Third Railify", "Send a Third Railify merch photo and approximate location for private moderation before any GOATS in the Wild publication.", {
    label: "Submit",
    parent: ["GOATS in the Wild", "/goats"],
    imagePath: "/social/farm1.webp",
    imageAlt: "Third Railify GOATS in the Wild community artwork",
    index: false,
  }),
  route("/policies", "policies", "Policies | Third Railify", "Read the Third Railify Terms of Use and Sale, Privacy Policy, Refund Policy, and Accessibility Statement.", {
    label: "Policies",
    schemaType: "CollectionPage",
  }),
  route("/terms", "policy:terms", "Terms of Use & Sale | Third Railify", "Read the rules for using Third Railify, community participation, accounts, content, enabled purchases, and dispute handling.", {
    label: "Terms",
    parent: ["Policies", "/policies"],
  }),
  route("/privacy", "policy:privacy", "Privacy Policy | Third Railify", "Learn what Third Railify collects, why it is used, which providers receive it, how long it is kept, and how to make a privacy request.", {
    label: "Privacy",
    parent: ["Policies", "/policies"],
  }),
  route("/refunds", "policy:refunds", "Refund Policy | Third Railify", "Understand Third Railify's statutory remedy, change-of-mind, damaged item, incorrect order, and refund support positions.", {
    label: "Refunds",
    parent: ["Policies", "/policies"],
  }),
  route("/accessibility", "policy:accessibility", "Accessibility Statement | Third Railify", "Read Third Railify's accessibility goal, current V2 measures, third-party limitations, and direct route for reporting a barrier.", {
    label: "Accessibility",
    parent: ["Policies", "/policies"],
  }),
  route("/account", "account", "Your Account | Third Railify", "Sign in to or manage your Third Railify account, profile, access, and public community identity.", {
    label: "Account",
    index: false,
  }),
  route("/account/profile", "account:profile", "Profile & Contact | Third Railify Account", "Manage your Third Railify display name, profile image, verified account email presentation, and private commerce contact details.", {
    label: "Profile & contact",
    canonicalPath: "/account",
    index: false,
  }),
  route("/account/delivery", "account:delivery", "Delivery Addresses | Third Railify Account", "Manage encrypted reusable delivery addresses and choose a default destination through your authenticated Third Railify Account.", {
    label: "Delivery addresses",
    canonicalPath: "/account",
    index: false,
  }),
  route("/account/orders", "account:orders", "Orders & Payments | Third Railify Account", "Review account-linked Third Railify order amounts, payment state, purchase environment, and fulfilment evidence without stored card details.", {
    label: "Orders & payments",
    canonicalPath: "/account",
    index: false,
  }),
  route("/account/messages", "account:messages", "Messages | Third Railify Account", "Review private account and order messages issued by authoritative Third Railify workflows.", {
    label: "Messages",
    canonicalPath: "/account",
    index: false,
  }),
  route("/account/security", "account:security", "Security & Privacy | Third Railify Account", "Review connected sign-in methods, authenticated session state, account privacy controls, and current self-service security boundaries.", {
    label: "Security & privacy",
    canonicalPath: "/account",
    index: false,
  }),
  route("/account/login", "account:login", "Sign In | Third Railify", "Sign in to your Third Railify account through the protected shared account service.", {
    label: "Sign in",
    canonicalPath: "/account",
    index: false,
  }),
];

const STATIC_BY_PATH = new Map(STATIC_ROUTES.map((item) => [item.path, item]));

export function staticSeoForPath(pathname, origin) {
  const path = normalizePath(pathname);
  const exact = STATIC_BY_PATH.get(path);
  if (exact) return createSeoDocument(exact, origin);

  if (/^\/account\/orders\/[^/]+$/.test(path)) return createSeoDocument(route(path, "account:order-detail", "Order Details | Third Railify Account", "Review the authenticated account-owned items, payment summary, delivery snapshot, fulfilment state, and order timeline for this purchase.", {
    label: "Order details",
    canonicalPath: "/account/orders",
    index: false,
  }), origin);

  const category = path.match(/^\/products\/([a-z0-9]+(?:-[a-z0-9]+)*)$/);
  if (category) {
    const label = titleCase(category[1]);
    return createSeoDocument(route(path, `shop:collection:${category[1]}`, `${label} Podcast Merch | Third Railify Shop`, `Browse ${label.toLowerCase()} merchandise from the official Third Railify catalogue with real variants and authoritative CAD pricing.`, {
      label,
      parent: ["Shop", "/shop"],
      schemaType: "CollectionPage",
      imageAlt: `Third Railify ${label.toLowerCase()} merchandise`,
    }), origin);
  }

  const product = canonicalProductSlug(path);
  if (product) return createSeoDocument(route(`/shop/${product}`, `product:${product}`, `Official Podcast Merchandise | Third Railify Shop`, "View product images, available variants, and authoritative CAD pricing from the official Third Railify merchandise catalogue.", {
    label: "Product",
    parent: ["Shop", "/shop"],
    schemaType: "ItemPage",
    pageType: "product",
    imageAlt: "Official Third Railify merchandise",
  }), origin);

  const episode = path.match(/^\/watch\/v\/(ep_[a-f0-9]{64})$/);
  if (episode) return createSeoDocument(route(path, `episode:${episode[1]}`, "Third Railify Episode | Watch", "Watch a completed Third Railify transmission from the retained public episode archive.", {
    label: "Episode",
    parent: ["Episodes", "/watch/episodes"],
    schemaType: "VideoObject",
    pageType: "video.other",
    imageAlt: "Third Railify episode",
  }), origin);

  const goat = path.match(/^\/goats\/([a-z0-9][a-z0-9-]{1,118}[a-z0-9])$/);
  if (goat) return createSeoDocument(route(path, `goat:${goat[1]}`, "GOATS in the Wild Story | Third Railify", "View an approved GOATS in the Wild community story featuring Third Railify merchandise beyond the rail.", {
    label: "Community story",
    parent: ["GOATS in the Wild", "/goats"],
    schemaType: "WebPage",
    pageType: "article",
    imagePath: "/social/farm1.webp",
    imageAlt: "GOATS in the Wild community story",
  }), origin);

  const poll = path.match(/^\/polls\/([a-z0-9][a-z0-9-]{1,78}[a-z0-9])(?:\/(edit|popout))?$/);
  if (poll) {
    const popout = poll[2] === "popout"; const canonicalPath = `/polls/${poll[1]}`;
    const editing = poll[2] === "edit";
    return createSeoDocument(route(path, `poll:${poll[1]}:${popout ? "popout" : editing ? "edit" : "view"}`, popout ? "Poll Results Popout | Third Railify" : editing ? "Edit an Audience Poll | Third Railify" : "Live Audience Poll | Third Railify", popout ? "Open a focused, read-only Third Railify Poll results display for a live production surface." : editing ? "Manage this protected, versioned Third Railify audience Poll through the approved creator control surface." : "Vote in a Third Railify audience Poll and follow authoritative combined web and Rumble chat results.", {
      label: popout ? "Poll popout" : editing ? "Edit Poll" : "Audience Poll", parent: ["Polls", "/polls"], canonicalPath, index: !popout && !editing, schemaType: "WebApplication", imageAlt: "Third Railify live audience Poll",
    }), origin);
  }

  const stage = path.match(/^\/wheels\/stages\/([a-z0-9][a-z0-9-]{1,78}[a-z0-9])(?:\/(edit))?$/);
  if (stage) {
    const editing = stage[2] === "edit"; const canonicalPath = `/wheels/stages/${stage[1]}`;
    return createSeoDocument(route(path, `wheel-stage:${stage[1]}:${editing ? "edit" : "view"}`, editing ? "Edit a Multi-Wheel Stage | Third Railify" : "Multi-Wheel Stage | Third Railify", editing ? "Manage this protected Third Railify multi-Wheel Stage, its visibility, ordered Wheels, portability, and explicit save state." : "Open a responsive Third Railify multi-Wheel Stage for public practice and authorized official draws.", {
      label: editing ? "Edit Stage" : "Multi-Wheel Stage", parent: ["Wheels", "/wheels"], canonicalPath, index: false, schemaType: "WebApplication", imageAlt: "Third Railify multi-Wheel Stage",
    }), origin);
  }

  const wheel = path.match(/^\/wheels\/([a-z0-9][a-z0-9-]{1,78}[a-z0-9])(?:\/(edit|present))?$/);
  if (wheel) {
    const mode = wheel[2] || "view";
    const canonicalPath = `/wheels/${wheel[1]}`;
    const presentation = mode === "present";
    const editing = mode === "edit";
    return createSeoDocument(route(path, `wheel:${wheel[1]}:${mode}`, presentation ? "Present a Competition Wheel | Third Railify" : editing ? "Edit a Competition Wheel | Third Railify" : "Competition Wheel | Third Railify", presentation ? "Open a focused Third Railify competition-wheel presentation for practice or an authorized recorded official draw." : editing ? "Manage this Third Railify competition wheel through the protected approved-creator control surface." : "View and practice-spin a public Third Railify competition wheel, with recorded official draws available only to authorized operators.", {
      label: presentation ? "Present" : editing ? "Edit" : "Competition wheel",
      parent: ["Wheels", "/wheels"],
      canonicalPath,
      index: mode === "view",
      schemaType: mode === "view" ? "WebApplication" : "WebPage",
      imageAlt: "Third Railify competition wheel",
    }), origin);
  }

  return createSeoDocument(route(path, "not-found", "Page Not Found | Third Railify", "This route is not part of the current Third Railify public site.", {
    label: "Not found",
    index: false,
  }), origin);
}

export function productSeo(product, origin) {
  const slug = slugValue(product?.slug);
  if (!slug) return null;
  const name = boundedText(product?.name || product?.title, 120) || "Third Railify merchandise";
  const canonicalPath = `/shop/${slug}`;
  const description = metaDescription(product?.description, `Shop ${name} from the official Third Railify catalogue. View product images, real variants, and authoritative CAD pricing.`);
  const images = uniqueUrls([...(Array.isArray(product?.images) ? product.images : []), product?.image]);
  const imageUrl = images[0] || DEFAULT_SOCIAL_IMAGE_PATH;
  const document = createSeoDocument(route(canonicalPath, `product:${slug}`, `${name} | Third Railify Shop`, description, {
    label: name,
    parent: ["Shop", "/shop"],
    schemaType: "ItemPage",
    pageType: "product",
    imagePath: imageUrl,
    imageAlt: `${name} product image`,
  }), origin);
  const minimum = minorUnits(product?.price?.minUnitAmount ?? product?.priceMinUnitAmount ?? (Number(product?.price) * 100));
  const maximum = minorUnits(product?.price?.maxUnitAmount ?? product?.priceMaxUnitAmount ?? minimum);
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  const offer = minimum !== null ? {
    "@type": "AggregateOffer",
    priceCurrency: "CAD",
    lowPrice: money(minimum),
    highPrice: money(maximum ?? minimum),
    offerCount: Math.max(1, variants.length),
    availability: product?.available === false ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
    url: document.canonicalUrl,
  } : null;
  document.jsonLd["@graph"].push(compactObject({
    "@type": "Product",
    "@id": `${document.canonicalUrl}#product`,
    name,
    description,
    image: images.map((value) => absoluteUrl(value, origin)),
    brand: { "@type": "Brand", name: SITE_NAME },
    category: Array.isArray(product?.categories) ? product.categories.slice(0, 8).map((value) => boundedText(value, 80)).filter(Boolean).join(", ") : undefined,
    offers: offer,
    url: document.canonicalUrl,
  }));
  return document;
}

export function episodeSeo(detail, origin) {
  const item = detail?.item || detail;
  const id = boundedText(item?.id, 80);
  if (!/^ep_[a-f0-9]{64}$/.test(id)) return null;
  const name = boundedText(item?.title, 180) || "Third Railify episode";
  const description = metaDescription(item?.description, `Watch ${name}, a completed Third Railify transmission from the retained public episode archive.`);
  const canonicalPath = `/watch/v/${id}`;
  const image = safeUrl(item?.thumbnailUrl) || DEFAULT_SOCIAL_IMAGE_PATH;
  const document = createSeoDocument(route(canonicalPath, `episode:${id}`, `${name} | Third Railify Watch`, description, {
    label: name,
    parent: ["Episodes", "/watch/episodes"],
    schemaType: "WebPage",
    pageType: "video.other",
    imagePath: image,
    imageAlt: `${name} episode artwork`,
  }), origin);
  const uploadDate = isoDate(item?.publishedAt || item?.archiveDate || item?.actualStart);
  const video = compactObject({
    "@type": "VideoObject",
    "@id": `${document.canonicalUrl}#video`,
    name,
    description,
    thumbnailUrl: [absoluteUrl(image, origin)],
    uploadDate,
    contentUrl: safeHttpsUrl(item?.watchUrl),
    embedUrl: safeHttpsUrl(item?.embedUrl),
    url: document.canonicalUrl,
  });
  document.jsonLd["@graph"].push(video);
  document.publishedTime = uploadDate || undefined;
  return document;
}

export function goatSeo(item, origin) {
  const slug = slugValue(item?.slug);
  if (!slug) return null;
  const displayName = boundedText(item?.displayName, 100) || "Third Railify community member";
  const productName = boundedText(item?.product?.name, 120) || "Third Railify merch";
  const location = boundedText(item?.location?.label, 140);
  const description = metaDescription(item?.description, `${displayName}${location ? ` in ${location}` : ""}, wearing ${productName} in an approved GOATS in the Wild community story.`);
  const image = safeUrl(item?.media?.main?.url || item?.media?.profile?.url || item?.product?.image) || "/social/farm1.webp";
  const canonicalPath = `/goats/${slug}`;
  const title = `${displayName} · GOATS in the Wild | Third Railify`;
  const document = createSeoDocument(route(canonicalPath, `goat:${slug}`, title, description, {
    label: displayName,
    parent: ["GOATS in the Wild", "/goats"],
    schemaType: "WebPage",
    pageType: "article",
    imagePath: image,
    imageAlt: `${displayName} wearing ${productName}`,
  }), origin);
  const publishedAt = isoDate(item?.publishedAt);
  document.publishedTime = publishedAt || undefined;
  document.jsonLd["@graph"].push(compactObject({
    "@type": "SocialMediaPosting",
    "@id": `${document.canonicalUrl}#post`,
    headline: `${displayName} in GOATS in the Wild`,
    articleBody: boundedText(item?.description, 2000) || description,
    image: absoluteUrl(image, origin),
    datePublished: publishedAt,
    author: { "@type": "Person", name: displayName },
    about: { "@type": "Product", name: productName },
    contentLocation: location ? { "@type": "Place", name: location } : undefined,
    mainEntityOfPage: document.canonicalUrl,
  }));
  return document;
}

export function wheelSeo(wheel, origin, mode = "view") {
  const slug = slugValue(wheel?.slug);
  if (!slug || !new Set(["view", "edit", "present"]).has(mode)) return null;
  const name = boundedText(wheel?.title, 100) || "Third Railify competition wheel";
  const canonicalPath = `/wheels/${slug}`;
  const description = metaDescription(wheel?.description, `Spin ${name}, a public Third Railify competition wheel with practice outcomes kept separate from recorded official draws.`);
  const presentation = mode === "present";
  const editing = mode === "edit";
  const path = mode === "view" ? canonicalPath : `${canonicalPath}/${mode}`;
  const title = presentation ? `Present ${name} | Third Railify` : editing ? `Edit ${name} | Third Railify` : `${name} | Third Railify Wheels`;
  const image = safeUrl(wheel?.media?.background?.url || wheel?.media?.centre?.url) || DEFAULT_SOCIAL_IMAGE_PATH;
  const document = createSeoDocument(route(path, `wheel:${slug}:${mode}`, title, description, {
    label: presentation ? "Present" : editing ? "Edit" : name,
    parent: ["Wheels", "/wheels"],
    canonicalPath,
    index: mode === "view",
    schemaType: "WebPage",
    imagePath: image,
    imageAlt: `${name} competition wheel`,
  }), origin);
  if (mode === "view" && (wheel?.visibility !== "public" || wheel?.lifecycle !== "active")) document.robots = NOINDEX_ROBOTS;
  if (mode === "view") document.jsonLd["@graph"].push(compactObject({
    "@type": "WebApplication",
    "@id": `${document.canonicalUrl}#wheel`,
    name,
    description,
    applicationCategory: "GameApplication",
    operatingSystem: "Web",
    url: document.canonicalUrl,
    isAccessibleForFree: true,
  }));
  return document;
}

export function applySeoPresentationOverride(document, override) {
  if (!document || !override || typeof override !== "object" || Array.isArray(override)) return document;
  const title = boundedText(override.title, 120) || document.title;
  const description = metaDescription(override.description, document.description);
  const imageUrl = safeUrl(override.imageUrl) ? absoluteUrl(override.imageUrl, new URL(document.canonicalUrl).origin) : document.imageUrl;
  const imageAlt = boundedText(override.imageAlt, 180) || document.imageAlt;
  const next = { ...document, title, description, imageUrl, imageAlt, jsonLd: structuredCloneSafe(document.jsonLd) };
  for (const node of next.jsonLd["@graph"] || []) {
    if (node?.["@id"] === `${document.canonicalUrl}#webpage`) {
      node.name = title;
      node.description = description;
      node.primaryImageOfPage = { "@type": "ImageObject", url: imageUrl };
    }
  }
  return next;
}

export function renderSeoHead(document) {
  const tags = [
    `<title>${html(document.title)}</title>`,
    meta("name", "description", document.description),
    meta("name", "author", SITE_NAME),
    meta("name", "robots", document.robots),
    meta("name", "googlebot", document.robots),
    meta("property", "og:locale", "en_CA"),
    meta("property", "og:type", document.pageType),
    meta("property", "og:site_name", SITE_NAME),
    meta("property", "og:title", document.title),
    meta("property", "og:description", document.description),
    meta("property", "og:url", document.canonicalUrl),
    meta("property", "og:image", document.imageUrl),
    meta("property", "og:image:secure_url", document.imageUrl),
    meta("property", "og:image:alt", document.imageAlt),
    meta("property", "og:image:type", imageMime(document.imageUrl)),
    meta("name", "twitter:card", "summary_large_image"),
    meta("name", "twitter:site", "@ThirdRailify"),
    meta("name", "twitter:title", document.title),
    meta("name", "twitter:description", document.description),
    meta("name", "twitter:image", document.imageUrl),
    meta("name", "twitter:image:alt", document.imageAlt),
    document.publishedTime ? meta("property", "article:published_time", document.publishedTime) : "",
    `<link data-thirdrailify-seo="true" rel="canonical" href="${html(document.canonicalUrl)}" />`,
    `<link data-thirdrailify-seo="true" rel="sitemap" type="application/xml" href="${html(new URL("/sitemap.xml", document.canonicalUrl).href)}" />`,
    `<script data-thirdrailify-seo="true" type="application/ld+json">${jsonForHtml(document.jsonLd)}</script>`,
  ].filter(Boolean);
  return `<!--thirdrailify-seo:start-->\n    ${tags.join("\n    ")}\n    <!--thirdrailify-seo:end-->`;
}

export function injectSeoHead(htmlSource, document) {
  const block = renderSeoHead(document);
  if (/<!--thirdrailify-seo:start-->[\s\S]*?<!--thirdrailify-seo:end-->/.test(htmlSource)) return htmlSource.replace(/<!--thirdrailify-seo:start-->[\s\S]*?<!--thirdrailify-seo:end-->/, block);
  return htmlSource.replace("</head>", `    ${block}\n  </head>`);
}

export function canonicalRedirectPath(pathname) {
  const path = normalizePath(pathname);
  const exact = new Map([
    ["/store", "/shop"], ["/merch", "/shop"], ["/products/all", "/shop"],
    ["/wheel", "/wheels"],
    ["/gift", "/gift-cards"], ["/support", "/donate"], ["/donate-1", "/donate"],
    ["/pricing-plans/list", "/vip"], ["/members-home", "/vip"], ["/cart-page", "/cart"], ["/goatgate", "/goats/submit"],
  ]).get(path);
  if (exact) return exact;
  const oldProduct = path.match(/^\/product-page\/([a-z0-9]+(?:-[a-z0-9]+)*)$/) || path.match(/^\/products\/[a-z0-9]+(?:-[a-z0-9]+)*\/([a-z0-9]+(?:-[a-z0-9]+)*)$/);
  return oldProduct ? `/shop/${oldProduct[1]}` : null;
}

export function staticSitemapPaths() {
  return STATIC_ROUTES.filter((item) => item.index !== false && item.canonicalPath !== "/account").map((item) => item.path);
}

function route(path, key, title, description, options = {}) {
  return { path, key, title, description, ...options };
}

function createSeoDocument(definition, originValue) {
  const origin = safeOrigin(originValue);
  const canonicalPath = definition.canonicalPath || definition.path;
  const canonicalUrl = absoluteUrl(canonicalPath, origin);
  const imageUrl = absoluteUrl(definition.imagePath || DEFAULT_SOCIAL_IMAGE_PATH, origin);
  const imageAlt = definition.imageAlt || "Third Railify podcast artwork";
  const breadcrumbs = breadcrumbItems(definition, origin);
  const webPage = compactObject({
    "@type": definition.schemaType || "WebPage",
    "@id": `${canonicalUrl}#webpage`,
    url: canonicalUrl,
    name: definition.title,
    description: definition.description,
    inLanguage: SITE_LANGUAGE,
    isPartOf: { "@id": `${origin}/#website` },
    primaryImageOfPage: { "@type": "ImageObject", url: imageUrl },
    breadcrumb: breadcrumbs.length > 1 ? { "@id": `${canonicalUrl}#breadcrumb` } : undefined,
  });
  const graph = [webPage];
  if (breadcrumbs.length > 1) graph.push({
    "@type": "BreadcrumbList",
    "@id": `${canonicalUrl}#breadcrumb`,
    itemListElement: breadcrumbs.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.name, item: item.url })),
  });
  if (definition.home) {
    graph.push(
      { "@type": "WebSite", "@id": `${origin}/#website`, url: `${origin}/`, name: SITE_NAME, alternateName: BRAND_NAME, description: definition.description, inLanguage: SITE_LANGUAGE, publisher: { "@id": `${origin}/#organization` } },
      { "@type": "Organization", "@id": `${origin}/#organization`, name: SITE_NAME, url: `${origin}/`, image: imageUrl },
      podcastSchema(origin, imageUrl),
    );
  } else if (definition.podcast) graph.push(podcastSchema(origin, imageUrl));
  if (definition.person) graph.push({
    "@type": "Person",
    "@id": `${canonicalUrl}#person`,
    name: definition.person.name,
    jobTitle: definition.person.jobTitle,
    image: imageUrl,
    url: canonicalUrl,
    worksFor: { "@id": `${origin}/#organization` },
  });
  return {
    key: definition.key,
    title: definition.title,
    description: definition.description,
    canonicalUrl,
    imageUrl,
    imageAlt,
    pageType: definition.pageType || "website",
    robots: definition.index === false ? NOINDEX_ROBOTS : INDEX_ROBOTS,
    jsonLd: { "@context": "https://schema.org", "@graph": graph },
  };
}

function podcastSchema(origin, image) {
  return { "@type": "PodcastSeries", "@id": `${origin}/watch#podcast`, name: SITE_NAME, url: `${origin}/watch`, description: DEFAULT_DESCRIPTION, image, inLanguage: SITE_LANGUAGE };
}

function breadcrumbItems(definition, origin) {
  if (definition.home) return [{ name: "Home", url: `${origin}/` }];
  const values = [{ name: "Home", url: `${origin}/` }];
  if (definition.parent) values.push({ name: definition.parent[0], url: absoluteUrl(definition.parent[1], origin) });
  values.push({ name: definition.label || SITE_NAME, url: absoluteUrl(definition.canonicalPath || definition.path, origin) });
  return values;
}

function canonicalProductSlug(path) {
  const match = path.match(/^\/shop\/([a-z0-9]+(?:-[a-z0-9]+)*)$/) || path.match(/^\/product-page\/([a-z0-9]+(?:-[a-z0-9]+)*)$/) || path.match(/^\/products\/[a-z0-9]+(?:-[a-z0-9]+)*\/([a-z0-9]+(?:-[a-z0-9]+)*)$/);
  return match?.[1] || "";
}

function safeOrigin(value) {
  try { const url = new URL(String(value || "https://thirdrailify.com")); if (url.protocol === "https:" || new Set(["localhost", "127.0.0.1"]).has(url.hostname)) return url.origin; } catch { /* use production fallback */ }
  return "https://thirdrailify.com";
}

function normalizePath(value) {
  let path = String(value || "/").split(/[?#]/, 1)[0] || "/";
  try { path = decodeURI(path); } catch { return "/404"; }
  if (!path.startsWith("/")) path = `/${path}`;
  path = path.replace(/\/{2,}/g, "/");
  return path.length > 1 ? path.replace(/\/+$/, "") : "/";
}

function absoluteUrl(value, originValue) {
  const origin = safeOrigin(originValue);
  try { const url = new URL(String(value || DEFAULT_SOCIAL_IMAGE_PATH), `${origin}/`); return url.protocol === "https:" || new Set(["localhost", "127.0.0.1"]).has(url.hostname) ? url.href : new URL(DEFAULT_SOCIAL_IMAGE_PATH, `${origin}/`).href; }
  catch { return new URL(DEFAULT_SOCIAL_IMAGE_PATH, `${origin}/`).href; }
}

function safeUrl(value) {
  const text = boundedText(value, 4096);
  if (text.startsWith("/") && !text.startsWith("//")) return text;
  return safeHttpsUrl(text) || "";
}

function safeHttpsUrl(value) {
  try { const url = new URL(String(value || "")); return url.protocol === "https:" && !url.username && !url.password ? url.href : undefined; }
  catch { return undefined; }
}

function uniqueUrls(values) { return [...new Set(values.map(safeUrl).filter(Boolean))].slice(0, 12); }
function boundedText(value, maximum) { return Array.from(String(value || "")).filter((character) => { const code = character.charCodeAt(0); return code >= 32 && code !== 127; }).join("").replace(/\s+/g, " ").trim().slice(0, maximum); }
function metaDescription(value, fallback) { const text = boundedText(value, 300) || boundedText(fallback, 300); return text.length <= 165 ? text : `${text.slice(0, 162).trimEnd()}…`; }
function slugValue(value) { const text = boundedText(value, 180).toLowerCase(); return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(text) ? text : ""; }
function minorUnits(value) { const number = Number(value); return Number.isSafeInteger(number) && number > 0 && number <= 100_000_000 ? number : null; }
function money(value) { return (value / 100).toFixed(2); }
function isoDate(value) { const timestamp = Date.parse(String(value || "")); return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : ""; }
function titleCase(value) { return value.split("-").filter(Boolean).map((part) => `${part[0]?.toUpperCase() || ""}${part.slice(1)}`).join(" "); }
function compactObject(value) { return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined && entry !== null && entry !== "")); }
function structuredCloneSafe(value) { return JSON.parse(JSON.stringify(value)); }
function imageMime(value) { const pathname = (() => { try { return new URL(value).pathname.toLowerCase(); } catch { return String(value).toLowerCase(); } })(); return pathname.endsWith(".jpg") || pathname.endsWith(".jpeg") ? "image/jpeg" : pathname.endsWith(".png") ? "image/png" : pathname.endsWith(".webp") ? "image/webp" : ""; }
function meta(attribute, key, content) { return content ? `<meta data-thirdrailify-seo="true" ${attribute}="${html(key)}" content="${html(content)}" />` : ""; }
function html(value) { return String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]); }
function jsonForHtml(value) { return JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026"); }
