# Third Railify Live-Site Audit and Version 2 Direction

Scan date: **2026-08-11**

## Scope and method

The audit reviewed the live Third Railify Wix site, its indexed home and shop information, accessible public subpages, navigation/route inventory, current Wix-hosted brand imagery, current membership offers, community/support surfaces, policy routes, the Third Railify Rumble channel, and relevant reference-repository patterns.

The Wix renderer intermittently timed out when attempting direct full-page browser retrieval of the home and shop pages. Accordingly, this audit does **not** claim a pixel-perfect capture of every Wix section. It combines live indexed content, accessible route markup, linked routes, static Wix media, public channel information, and reference-code inspection. The later Codex production pass must perform its own fresh workspace and live-site inspection.

## Current public proposition

Third Railify is presented as a daily podcast built around news, crime, pop culture, live-community energy, and intentionally ADHD-style conversational detours. The site currently functions as a combined show home, host directory, link hub, membership/community entry point, support surface, and merchandise store.

The two principal host/content lanes are:

- **Shawn / Third Railify** — daily news-hangout and recurring-show-lore identity.
- **Gina / Just Gina** — conspiracies, culture, humor, and a visibly distinct host brand that still belongs inside the shared Third Railify universe.

## Current public route families discovered

### Primary navigation and brand content

- Home
- Shawn
- Gina
- Shop
- About
- Friends
- Wild Goats
- Gift Cards
- Donate
- Policies

### Membership/community surfaces

- VIP plan list
- VIP Home
- Groups
- Join VIP

### Legacy/privileged surfaces exposed through the current navigation model

- Admin-only Status
- Listings
- Approvals

These privileged or operational concepts should not remain mixed into the future public navigation. The new `ThirdRailify-Admin` application should own authenticated management workflows.

## Current commerce information discovered

The current Wix shop advertises Third Railify Official and Just Gina merchandise. The following current category vocabulary was found and is represented in the POC filters:

1. All Products
2. Apparel
3. Sportswear
4. Underwear
5. Accessories & Other
6. Third Railify™ Branded
7. Third Rail Lore
8. Just Gina™ Branded
9. Aboot Nothing
10. Pop Culture Beat Down
11. Christmas Shit

A current men's tee listing was indexed at **CA$47.50**, with XS–2XL shown in the indexed result. That price is the only live-store price treated as verified in POC V1. All other POC prices are visibly labelled as samples.

## Current membership information discovered

The current VIP plan surface includes:

- Baby GOAT — CA$3/month
- Blossom GOAT — CA$9/month
- Mega GOAT — CA$18/month
- Improbable GOAT — CA$99/month

Benefits currently described include sponsor attribution, VIP content, community/show participation benefits, an Aboot Nothing battle-selection concept, and a top-tier monthly merch voucher. These plans are sufficiently developed to justify a dedicated, polished `/vip` or membership route in Version 2 rather than burying them in generic navigation.

## Current content and UX issues identified

### 1. Public information architecture is too mixed

Show discovery, host pages, commerce, community, membership, donations, legal pages, member areas, and privileged/admin concepts are currently interleaved. Version 2 should use clearer route families and a much smaller global navigation.

### 2. The About surface is unfinished

The accessible About page still exposes generic Wix FAQ placeholder copy. Version 2 should replace it with real show history, format, host relationship, schedule/platform context, community identity, and contact/media information.

### 3. The store needs to behave like a dedicated product

The shop is the most commercially important surface. It should not feel like a plugin catalogue. It needs intentional collection storytelling, search/filter/sort, product detail routes, robust cart UX, provider-aware states, mobile polish, promotions, fulfillment explanations, and clear checkout boundaries.

### 4. Host identities need connection and separation

Shawn and Gina should be clearly legible as separate personalities/content lanes without making the site feel like two unrelated brands. POC V1 uses shared structure with separate gold and magenta visual signatures.

### 5. Community routes need hierarchy

Friends, Wild Goats, VIP, and Donate are meaningful but should sit beneath the primary watch/show/shop journey. The homepage can preview them; dedicated routes can provide depth.

## Recommended Version 2 information architecture

This is a design recommendation, not a claim that these routes already exist in the new repositories.

### Public/show

- `/` — show-first landing page
- `/watch` — latest/live/archive viewing hub
- `/shawn` — Shawn host/content lane
- `/gina` — Gina / Just Gina lane
- `/about` — actual show and host background
- `/friends` — creator/community directory
- `/goats` — community gallery
- `/vip` — membership plans and benefits
- `/donate` — one-time/recurring support
- `/contact` — show, product, sponsorship, and support contact paths

### Commerce

- `/shop` — premium storefront landing/catalogue
- `/products/all`
- `/products/:category`
- `/products/:category/:slug`
- `/cart`
- `/shop/success`
- `/shop/cancel`
- `/gift-cards`

### Legal

- `/policies`
- `/privacy`
- `/terms`
- `/refund-policy`
- `/accessibility`
- `/vip-policy`

### Privileged administration

- separate `ThirdRailify-Admin` application
- eventual hostname: `admin.thirdrailify.com`
- authenticated content, product, integration, membership, operational, and publishing controls only

## POC V1 design decisions

### Homepage

The homepage is reorganized around a direct conversion sequence:

1. understand the show immediately
2. watch the latest content
3. recognize Shawn and Gina
4. enter the merch store
5. discover VIP/community/support paths

The visual language uses a black broadcast environment, high-voltage rail gold, restrained grid/signal effects, cyan support accents, and a separate magenta Just Gina lane. The result is intended to feel like a premium creator/media property rather than a Linktree clone.

### Shop

The shop concept treats commerce as a first-class product:

- collection-led hero
- current category vocabulary
- search, sorting, and filter chips
- product quick-view
- persistent prototype cart drawer
- editorial drop storytelling
- explicit production-commerce architecture section
- clear verified-versus-sample inventory labels

The original product SVGs in this POC demonstrate presentation only. Production products, copy, images, prices, variants, stock, and fulfillment information must come from real provider/admin data.

## Source surfaces reviewed

- https://thirdrailify.com/
- https://thirdrailify.com/shop
- https://thirdrailify.com/about
- https://thirdrailify.com/friends
- https://thirdrailify.com/donate-1
- https://thirdrailify.com/policies
- https://thirdrailify.com/pricing-plans/list
- https://rumble.com/ThirdRailify
- `BSMediaGroup/ThirdRailify`
- `BSMediaGroup/DanielClancy` — shop/API architecture reference only
- `BSMediaGroup/StreamSuites-Public` — public design/POC methodology reference only

## Migration boundary

The existing Wix site remains production. POC V1 makes no Cloudflare, GoDaddy, DNS, registrar, nameserver, custom-domain, payment, provider, or Wix-disconnection changes. Production cutover must remain a later explicit, validated, and reversible task.
