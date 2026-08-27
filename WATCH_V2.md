# Watch V2 architecture

Watch V2 keeps the existing signed broadcast publisher and `THIRDRAILIFY_PUBLIC_STATE` binding. The SQLite-backed `thirdrailify-public-state` Durable Object is authoritative for both the latest `broadcast` snapshot and a distinct `broadcast_archive` record. No D1, R2, KV, static JSON, browser storage, provider crawl, or new secret participates in archive persistence.

## Natural archive population

`POST /api/watch/ingest` validates the existing `thirdrailify-broadcast-v1` body and HMAC before sending one ingest operation to the Durable Object. The object serializes mutations and commits current snapshot and semantic archive changes in one SQLite transaction. It does not rewrite the archive when no eligible episode or metadata/visibility change exists.

Only the accepted snapshot's canonical `primary` candidate is considered. It is retained when its presentation state is `episode` or `archive` and its provider state is not `upcoming`, `live`, `blocked`, or `unknown`. The ordering date is the first valid value from actual end, published time, actual start, then observed time. No date is invented and no secondary platform candidate is independently archived.

The stable public episode ID is `ep_` plus the SHA-256 digest of the immutable normalized platform and provider content ID. Upserts refresh safe metadata without changing identity or Admin visibility. Ordering is archive date descending then episode ID ascending. At most 24 records are retained, including hidden records; a 25th unique record permanently prunes the deterministic oldest. Empty state is supported and the archive fills only when later real signed snapshots identify completed episodes.

## Public boundary

- `GET /api/watch` preserves the current broadcast contract.
- `GET /api/watch/episodes` returns at most 24 visible episodes and public slot counts.
- `GET /api/watch/episodes/:episodeId` returns one visible episode plus visible-only previous/next context. Hidden and unknown IDs return 404.
- `GET /api/watch/thumbnail?episode=:episodeId` keeps historical Rumble art behind the existing bounded, provider-allowlisted proxy.
- `/watch`, `/watch/live`, `/watch/episodes`, and `/watch/v/:episodeId` are the canonical pages.
- `/live` is an edge redirect to `/watch/live` only for a fresh effective live candidate; otherwise it redirects to `/watch`. The query string is retained and the redirect is not cached.

The main page always renders six featured positions and the gallery always renders 24 positions. Visible real episodes replace newest-first positions. Every other position is a branded, non-clickable placeholder with no fabricated identity, title, date, duration, or provider claim.

## Admin management boundary

`POST /api/watch/manage` is an internal Pages Function, not a browser API. It accepts only the existing community HMAC format and shared encrypted `THIRDRAILIFY_COMMUNITY_API_SECRET`, enforces the replay window and bounded actions, and forwards atomic read/visibility operations through the Durable Object binding. The standalone state Worker exposes only health publicly; archive operations are reachable only through service binding requests.

The Admin browser calls its own authenticated `/api/admin/watch` Function. ThirdRailify-Admin enforces Master Admin session, exact origin, CSRF, body validation, rate limit, and audit, then signs the server-to-server request. No secret, internal revision, audit record, or hidden episode enters a Public browser response. No new Cloudflare resource or secret is required.

## Safety and operation

Provider watch/embed/thumbnail URLs continue through the existing YouTube/Rumble allowlists. Archive population contains no YouTube, Rumble, RSS, HTML, search, or provider API fetch. Hidden records still count toward retention but appear publicly only as empty visual slots. Deploy the existing state Worker before Pages when its source fingerprint changes. Wix and `thirdrailify.com` remain production and are outside this staging architecture.
