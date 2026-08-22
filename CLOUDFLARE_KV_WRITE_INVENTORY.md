# ThirdRailify Workers KV inventory

This is the deterministic pre-migration inventory for the three local ThirdRailify repositories at the recorded milestone heads. It records the active calls that existed before the SQLite Durable Object replacement; the production-source regression scan now requires every mutation count to remain zero.

| Repository | File | Function | Key | Read/write | Trigger | Expected cadence before migration |
| --- | --- | --- | --- | --- | --- | --- |
| ThirdRailify | `functions/api/_snapshot-persistence.js` | `readRecord` | caller-selected community or broadcast key | GET | Every accepted signed ingest before semantic comparison | One per accepted community or Watch POST |
| ThirdRailify | `functions/api/_snapshot-persistence.js` | `persistSemanticSnapshot` | caller-selected community or broadcast key | PUT | Semantic change or bounded freshness checkpoint | Community: change plus 1,800 s unchanged checkpoint; broadcast: change plus 150/600/1,800 s live/upcoming/inactive checkpoint |
| ThirdRailify | `functions/api/community/discord.js` | `onRequest` | `discord:community:snapshot:v1` | GET | Public `GET /api/community/discord` | Per public request |
| ThirdRailify | `functions/api/watch.js` | `onRequest` | `broadcast:current:snapshot:v1` | GET | Public `GET /api/watch` | Per public request |
| ThirdRailify | `functions/api/watch/thumbnail.js` | `onRequest` | `broadcast:current:snapshot:v1` | GET | Public `GET /api/watch/thumbnail` | Per permitted thumbnail request |
| THIRD-RAIL-BOT | `thirdrailify_bot/publisher.py` | `CommunityPublisher.publish_snapshot` | none; signed HTTPS producer | POST to `/api/community/discord/ingest` | Startup, Discord presence/member/channel events, whitelist force, retry, freshness heartbeat | Previously 300 s change floor and 600 s heartbeat; now semantic change after 5 s debounce, 600 s heartbeat, 30 s retry |
| THIRD-RAIL-BOT | `thirdrailify_bot/publisher.py` | `BroadcastPublisher._publish_snapshot` | none; signed HTTPS producer | POST to `/api/watch/ingest` | Startup, YouTube/Rumble state polling changes, manual publish, retry, freshness heartbeat | Semantic changes immediately; unchanged live/upcoming/offline 75/150/600 s producer heartbeats |
| ThirdRailify-Admin | all production source | none | none | none | No binding, key, endpoint, REST mutation, or Wrangler KV command match | Zero |

There were no KV DELETE or LIST calls, no Cloudflare KV REST mutation, and no Wrangler KV mutation command in production source. The thumbnail path was read-only. Retries and startup/reconnect paths did not call KV directly; they caused signed producer POSTs which reached the shared Pages persistence function.

The earlier community-only optimization could not guarantee namespace-wide usage because the later Watch system added another caller to the same `persistSemanticSnapshot` PUT seam under `broadcast:current:snapshot:v1`. At the prior server checkpoints, quiet community plus quiet broadcast produced exactly 96 KV PUTs/day; community plus continuously live broadcast produced 624/day before additional semantic transitions. Raw producer cadence could reach 144 community idle POSTs/day, 288 community change-floor POSTs/day, 144 broadcast offline POSTs/day, 576 upcoming POSTs/day, or 1,152 live POSTs/day. Cloudflare's namespace graph aggregates both keys and therefore could show continued operations after the community-only change.

After migration, `THIRDRAILIFY_COMMUNITY_KV` exists only on `thirdrailify-public-state` for at most two first-initialization GETs. The SQLite migration marker stops subsequent reads. Production source contains zero KV PUT, DELETE, LIST, REST mutation, or Wrangler mutation paths.
