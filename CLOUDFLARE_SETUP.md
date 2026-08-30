# Cloudflare Pages and public-state setup

The production target is the Cloudflare Pages project `thirdrailify`, built from `main` and served canonically at `https://thirdrailify.com`. The `thirdrailify.pages.dev` alias is retained only as a permanent path/query-preserving redirect after the custom domain is healthy.

The account milestone adds a second independent shared-D1 prerequisite. Follow `CLOUDFLARE_AUTH_SETUP.md` for the Public client boundary and the Admin repository's detailed setup guide. No account database ID or binding is claimed by the checked-in Wrangler file.

## Project values

| Setting | Value |
| --- | --- |
| Repository | `ThirdRailify` |
| Production branch | `main` |
| Root directory | repository root |
| Build command | `npm run build` |
| Build output | `dist` |
| Node | `22.16.0` from `.node-version` |
| Pages project | `thirdrailify` |
| State Worker | `thirdrailify-public-state` |
| Durable Object class | `ThirdRailifyPublicState` |
| Stable object name | `thirdrailify-public-state` |

Cloudflare Pages Functions can bind to a Durable Object but cannot host its class. The class therefore lives in the small `thirdrailify-public-state` Worker, with `workers_dev` disabled and no second public domain. Root `wrangler.jsonc` supplies the external binding to Pages. `cloudflare/state-worker/wrangler.jsonc` owns the SQLite class migration and the legacy KV bootstrap binding.

## Bindings and environment names

| Name | Location/type | Purpose |
| --- | --- | --- |
| `THIRDRAILIFY_PUBLIC_STATE` | Pages external DO binding and Worker DO binding | One stable community/broadcast state object |
| `THIRDRAILIFY_COMMUNITY_KV` | State Worker KV binding only | Read-only legacy migration source |
| `THIRDRAILIFY_COMMUNITY_INGEST_SECRET` | Existing encrypted Pages secret | Verifies both signed bot ingest routes |
| `THIRDRAILIFY_COMMUNITY_CHECKPOINT_SECONDS` | Optional Pages variable | Community unchanged checkpoint; default/minimum 600 |
| `THIRDRAILIFY_BROADCAST_LIVE_CHECKPOINT_SECONDS` | Optional Pages variable | Live unchanged checkpoint; default/minimum 150 |
| `THIRDRAILIFY_BROADCAST_UPCOMING_CHECKPOINT_SECONDS` | Optional Pages variable | Upcoming unchanged checkpoint; default/minimum 150 |
| `THIRDRAILIFY_BROADCAST_INACTIVE_CHECKPOINT_SECONDS` | Optional Pages variable | Offline unchanged checkpoint; default/minimum 600 |

The former `*_KV_*_CHECKPOINT_SECONDS` names remain accepted as temporary fallbacks, but no checkpoint writes to KV. Never prefix the secret with `VITE_`, copy it into browser source, return it from GET, place it in Git, or paste a local `.env` into Cloudflare.

## SQLite latest-state contract

The single object stores two bounded rows:

```sql
CREATE TABLE snapshots (
  key TEXT PRIMARY KEY,
  schema_version INTEGER,
  semantic_hash TEXT,
  payload_json TEXT,
  producer_observed_at TEXT,
  persisted_at TEXT
);
```

The keys are `community` and `broadcast`. A tiny `metadata(key PRIMARY KEY, value)` table records the schema and legacy migration state. No history row is created per request or poll.

On first initialization, the object reads `discord:community:snapshot:v1` and `broadcast:current:snapshot:v1` only when their corresponding SQLite rows are absent. Both values pass through the current public normalizers before seeding. Existing SQLite rows are never overwritten. The object then records `legacy_kv_migration_completed=true` in SQLite. KV is never mutated, and the marker prevents normal requests from reading it again.

## Deployment order

Run all local gates first. Then deploy only these exact targets:

```powershell
npx wrangler deploy --config cloudflare/state-worker/wrangler.jsonc
npm run build
npx wrangler pages deploy dist --project-name thirdrailify --branch main
```

The Worker must deploy first so the Pages external binding resolves. Do not create or attach a route/custom domain for it. Do not recreate, rename, clear, or delete `thirdrailify-community`; its exact existing namespace remains the read-only migration source during the audit window. Preserve the existing Pages ingest secret.

After deployment, run the double-clickable `Verify-Cloudflare-State-Backend.cmd` or:

```powershell
npm run verify:state-backend
```

The verifier performs GET requests only. It checks the community and Watch endpoints plus `/api/state-backend`, requires `state_backend=durable_object_sqlite`, a completed read-only legacy migration, zero steady-state KV writes, and exact local/live release fingerprint parity. Results are `CURRENT`, `STALE`, `UNREACHABLE`, or `INCOMPATIBLE`; a live KV-backed contract is a failure.

## Acceptance and rollback

Do not issue a production write probe or manipulate Discord/provider state for testing. Normal signed bot publications will update the object after Pages cutover. Confirm the three public GET endpoints remain schema-compatible and that `/api/watch/thumbnail` retains its key-bound redirect behavior.

Keep the legacy namespace for the migration/audit window. Prefer rolling forward if a fault appears. A code rollback to KV would immediately reintroduce account-level PUT consumption and could serve stale data because updates accepted after cutover exist only in SQLite. Removing the migration KV binding is a later cleanup after the audit window, not part of this milestone.

Cloudflare analytics will continue showing historical monthly KV totals until retention ages them out. Do not attempt to reset the counter. The success signal is zero new live operations on `thirdrailify-community` after bootstrap, backed by the production-source mutation scan and storage contract.

The conservative busy-day projection is 11,209 object requests, at most 33,627 billable rows read, at most 2,226 billable rows written, and no more than 200 KiB stored. Against the current Free allowances of 100,000 object requests/day, 5 million rows read/day, 100,000 rows written/day, and 5 GB total SQLite Durable Object storage, that uses approximately 11.209%, 0.673%, 2.226%, and 0.004%. Even the deliberately extreme model of a meaningful Discord change every five seconds for 24 hours plus continuous live broadcast polling and 10,000 public reads stays at 19.792% requests, 1.188% rows read, and 18.432% rows written. The row estimates apply 3× read and 2× write margins for activation/metadata/index work. These are ThirdRailify projections, not claims about unrelated account usage.

Official references: [Pages Functions bindings](https://developers.cloudflare.com/pages/functions/bindings/), [Pages Wrangler configuration](https://developers.cloudflare.com/pages/functions/wrangler-configuration/), [Durable Object migrations](https://developers.cloudflare.com/durable-objects/reference/durable-objects-migrations/), [Durable Object pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/), [Durable Object limits](https://developers.cloudflare.com/durable-objects/platform/limits/), and [Pages build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/).
