# Third Railify Stage file format (`.tws`)

`.tws` is canonical UTF-8 JSON with MIME type `application/vnd.thirdrailify.stage+json`. V1 uses `format: "thirdrailify-stage"` and `formatVersion: 1`; its public schema is `/schemas/thirdrailify-stage-v1.schema.json`.

The document contains Stage identity/layout, one to six ordered portable Wheels, a SHA-256-deduplicated media asset table, and a SHA-256 hash over the canonical Stage payload. It never contains account IDs, roles, permissions, official-result authority, server IDs, object keys, or signed URLs. Imports always default to private and create fresh Wheel identity unless the user explicitly maps a slot to an accessible existing Wheel.

Limits are 28 MB per file and 24 MB decoded embedded media. Custom media is excluded by default. The parser rejects unknown fields, unsafe prototype keys, unsupported versions, malformed ordering, duplicate mappings, missing assets, corrupt asset hashes, and corrupt payload integrity before any server write.

The Stage file does not transfer ownership or official results. Official selection continues to use the existing per-Wheel server endpoint after import.
