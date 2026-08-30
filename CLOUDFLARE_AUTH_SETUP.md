# Public account client setup

The Public site is not an account authority. `ThirdRailify-Admin` owns the D1 schema, credentials, verification/reset email, OAuth callbacks, abuse protection, audit, roles, and profile-media object storage. Public owns its account UI plus same-origin session, one-time handoff, logout, and a narrow avatar request proxy; the proxy forwards a live session cookie and CSRF proof to Admin and never receives the Admin-only `THIRDRAILIFY_PROFILE_MEDIA` binding.

Both Pages projects must bind the same real D1 database as `THIRDRAILIFY_AUTH_DB`. No database ID exists in this checkout, so the checked-in Public Wrangler file intentionally has no D1 binding. Create and migrate the database from `ThirdRailify-Admin`, then add the proven real ID to both projects. Do not create a second Public account database.

For production, keep `THIRDRAILIFY_AUTH_COOKIE_DOMAIN` empty, use `https://thirdrailify.com` and `https://admin.thirdrailify.com` as the exact origins, set `THIRDRAILIFY_PROFILE_MEDIA_ORIGIN=https://admin.thirdrailify.com`, and set the safe Vite build value `VITE_THIRDRAILIFY_ADMIN_ORIGIN=https://admin.thirdrailify.com`. Preview retains the Pages origins. Public must never receive the profile-media R2 binding, Admin passwords, provider client secrets, the Turnstile secret, the rate-limit secret, or the Resend key.

The Admin project must deploy first because it owns configuration, credential/OAuth initiation, provider callbacks, and handoff creation. The Public `/api/auth/handoff` endpoint consumes the bounded one-time code and issues its own host session cookie.

See `../ThirdRailify-Admin/CLOUDFLARE_AUTH_SETUP.md` and `../ThirdRailify-Admin/docs/DOMAIN_CUTOVER.md` for preview separation, exact production callback URLs, Cloudflare Access caveats, and rollback.
