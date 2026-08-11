# Third Railify live-site audit

Audit date: 2026-08-11 (Australia/Sydney)

Source: the rendered public Wix site at `https://www.thirdrailify.com` and its browser-visible storefront responses. This is a migration reference, not a claim that Wix is the future authority. No Wix content, settings, accounts, orders, DNS, or domains were changed.

## Method and limits

The site was inspected in a real Chromium session at desktop and mobile-representative sizes. Navigation, footer links, rendered route content, outbound destinations, and the current storefront response were inspected. Wix is heavily client-rendered, so items that could not be read reliably are marked unresolved.

- Both apex and `www` addresses resolve to the Wix experience.
- The shop response reported 49 products, but only the first eight returned items were captured and verified for this milestone.
- Product descriptions, complete option values, SKU/provider IDs, inventory quantities, shipping, tax, and checkout rules were not captured and are not represented in V2.
- A direct fresh load of `/gina` intermittently rendered blank. Gina facts used in V2 are limited to copy also visible on the home page.
- The current About page contains generic Wix FAQ/template copy; it should be rewritten from approved source material, not migrated as fact.
- Logged-in member/admin surfaces and private data were not inspected.

## Current route inventory

| Path | Observed surface | V2 treatment |
| --- | --- | --- |
| `/` | Main show, schedule, hosts, platform links | Implemented |
| `/shawn` | Shawn/Third Rail show lane | Intentional migration shell |
| `/gina` | Just Gina lane; direct load unreliable | Intentional migration shell |
| `/shop` | Wix Stores catalogue | Implemented from bounded snapshot |
| `/about` | About/FAQ; generic template content observed | Intentional migration shell |
| `/friends` | Friends directory | Intentional migration shell; no profiles copied |
| `/goats` | Wild Goats community/gallery | Alias to `/community` |
| `/gift` | Gift card purchase | Alias to `/gift-cards` |
| `/donate-1` | Donation flow | Alias to `/support` |
| `/policies` | Legal/policy index | Intentional migration shell |
| `/terms` | Terms | Intentional migration shell |
| `/privacy` | Privacy | Intentional migration shell |
| `/refunds` | Refund policy | Intentional migration shell |
| `/accessibility` | Accessibility statement | Intentional migration shell |
| `/vip` | Membership plans and benefits | Intentional migration shell |
| `/pricing-plans/list` | Wix pricing-plan entry | Alias to `/vip` |
| `/members-home` | Member home | Alias to `/community` |
| `/members/my-rewards` | Member rewards | Future authenticated migration; not linked in V2 |
| `/groups` | Member/community groups | Future authenticated migration; not linked in V2 |
| `/cart-page` | Wix cart page | Alias to `/shop`; V2 cart is local-only |
| `/product-page/:slug` | Wix product deep link | Client-side alias to `/products/:slug` |
| `/admin` | Legacy/admin link | Not exposed in public V2 navigation |
| `/status` | Legacy status surface | Not exposed in public V2 navigation |
| `/admin/friends-list` | Legacy admin surface | Not exposed in public V2 navigation |
| `/admin/approvals` | Legacy admin surface | Not exposed in public V2 navigation |

The V2 also reserves `/watch`, `/community`, `/support`, and `/gift-cards` as concise canonical public paths.

## Navigation and footer

The current desktop header presents Shawn, Gina, Shop, and More, plus Log In and a Watch on Rumble action. More expands to About, Friends, Wild Goats, Gift, Donate, Policies, Admin, and Members. This mixes primary audience journeys, secondary content, account surfaces, and legacy administration.

The current footer carries show identity, navigation, platform/social links, and legal links. V2 retains a compact show/watch/shop/community hierarchy and the legal destinations, while excluding legacy admin links and avoiding a fake login state.

## Brand and content findings

- Core appearance: black/near-black foundations, bright yellow/gold emphasis, white text, bold display typography, logos/wordmarks, show portraits, goat lore, and recurring rail/electrical language.
- Reliable show proposition: Third Railify is presented as a daily podcast/creator show covering news, crime, pop culture, and ADHD-inflected commentary.
- Shawn schedule visible on the home surface: 10 PM Eastern, Sunday through Friday.
- Show schedule visible on the home surface: Sunday Aboot Nothing at 8 PM; Monday Pop Culture Beat Down at 10 PM; Tuesday News Hangout at 10 PM; Wednesday Aboot Nothing at 10 PM; Thursday and Friday News Hangout at 10 PM. Times are presented as Eastern on the source page.
- Gina/Just Gina home copy presents sass, smarts, humor, and conspiracies, every Saturday at 9 PM Eastern.
- No episode titles, audience metrics, sponsors, testimonials, or social statistics were migrated because this audit did not establish durable current values.

## Watch and social destinations

The current site exposes these outbound platform concepts:

- Rumble: `https://rumble.com/ThirdRailify`
- YouTube: `https://www.youtube.com/@ThirdRailify`
- Pilled
- X
- TikTok (the observed destination contains the spelling `@thirdrailifyoffical`; verify ownership and spelling before promoting it in V2)
- Pickax
- Discord

Gina also has separate Rumble, YouTube, Pilled, and X destinations on the current site. Only destinations whose exact URLs were confirmed are linked in the initial V2; the remaining platform names are represented as migration-stage concepts, not guessed links.

## Community, VIP, support, and legal

- Friends is a categorized profile directory. No profile/account records were copied.
- Wild Goats is a member/community gallery. No member submissions were copied.
- Gift cards expose CA$15, CA$25, CA$50, CA$100, CA$150, CA$250, and custom values, scheduling, and a never-expires statement. No V2 purchase flow is implemented.
- Donate supports one-time, monthly, and yearly cadence in CAD. No V2 donation flow is implemented.
- VIP plans observed: Baby GOAT CA$3/month, Blossom CA$9/month, Mega CA$18/month, and Improbable CA$99/month. Benefits and billing are not migrated because V2 has no authenticated membership or payment backend.
- Policies links to Terms, Privacy, Refunds, and Accessibility. These paths are preserved as route shells pending legal-owner-approved content.

## Shop audit

### Categories observed

The shop displayed 13 category/collection labels:

1. All Products
2. Aboot Nothing
3. Accessories & Other
4. Apparel
5. Christmas Shit
6. For Patriots
7. Just Gina Lore
8. Just Gina™ Branded
9. Pop Culture Beat Down
10. Sportswear
11. Third Rail Lore
12. Third Railify™ Branded
13. Underwear

These labels are recorded for later migration. The initial snapshot uses only broad UI facets that can be derived from the eight verified product names (apparel/headwear and brand); it does not assert complete Wix collection membership.

### Verified bounded product snapshot

All visible prices were CAD. The browser storefront response reported 49 products total; these were the first eight verified records captured on 2026-08-11.

| Product | Price | Option concepts | Wix slug |
| --- | ---: | --- | --- |
| BLEH \| Unisex classic tee | CA$30.50 | Color, Size | `bleh-unisex-classic-tee` |
| Third Railify™ Icon \| Dad hat | CA$39.00 | Color | `third-railify-icon-dad-hat` |
| Third Railify™ Logo V2 \| Unisex classic tee | CA$30.50 | Color, Size | `third-railify-logo-v2-unisex-classic-tee` |
| Third Railify™ Logo \| Short Sleeve T-shirt | CA$43.50 | Color, Size | `third-railify-logo-short-sleeve-t-shirt` |
| Just Gina™ Icon \| Short Sleeve T-shirt | CA$43.00 | Size | `just-gina-icon-basic-short-sleeve-t-shirt` |
| Just Gina™ Icon \| Unisex tee | CA$30.50 | Size | `just-gina-icon-classic-unisex-tee` |
| Just Gina™ Wordmark \| Dad hat | CA$45.00 | Color | `just-gina-wordmark-basic-dad-hat` |
| Third Railify™ Wordmark \| Dad hat | CA$45.00 | Color | `third-rail-wordmark-basic-dad-hat` |

The associated Third Railify product mockups were downloaded from the current Wix-owned catalogue response into `assets/catalogue/` so V2 has no Wix image hotlinks. They are migration-source assets, not new product or availability claims.

### Deliberately omitted

- The other 41 products reported by Wix.
- Descriptions, compare-at pricing, sale state, detailed option values, SKU/provider identifiers, quantities, and physical inventory.
- Printful/Printify ownership per item, fulfillment state, shipping, tax, and checkout behavior.
- Gift cards in the merchandise grid.

These omissions prevent a partial scrape from masquerading as production authority.

## UX and content issues to correct

- Primary navigation is overloaded by legacy admin/member destinations.
- Generic Wix placeholder FAQ content weakens the About surface.
- The Gina route was unreliable in a fresh direct load.
- Wix generated a large volume of browser warnings and repeated unused-preload warnings during shop inspection.
- The site splits closely related concepts across Wix-specific route names and account surfaces.
- Product and policy content needs explicit ownership and a durable API/CMS source before cutover.
- The observed TikTok spelling should be verified rather than normalized silently.

## Migration strategy

Keep Wix production until each destination has an approved content/data owner and end-to-end acceptance. V2 uses canonical routes and preserves known deep links with Pages redirects or React Router aliases. Before domain cutover, expand the redirect map from current analytics and a complete crawl, implement real legal content, validate all social destinations, establish secured commerce/community providers, and test URLs on the staging `pages.dev` project.
