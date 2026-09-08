# Wheel avatars and public automation controls

Manage participants accepts an optional HTTPS avatar URL for each entrant. Missing or failed images use a styled SVG fallback in the participant information card and on the wheel. Existing entries are not matched to accounts by display name.

Edit > Settings > Entrant display selects names, avatars, or both. Very narrow segments omit avatars that cannot fit. Names remain available in the participant list and information card. Portable files preserve avatars and the display mode; old clients preserve existing avatar URLs when the field is omitted.

Edit > Automations manages rules for this wheel with the shared Admin rule editor. Saves are independent of wheel appearance. Blank optional rant messages are supported. Enable, pause, edit, delete, and optional dry-run use the existing Admin rules and execution engine. Public requests use the signed gateway and authenticated wheel edit permissions; cross-wheel targets are rejected. Editing locks remain enforced.

Admin storage requires commerce migration 0037_wheel_entrant_avatars.sql. The migration was applied and both sites deployed on 2026-09-08. Local verification covers real Admin D1 persistence, permissions, old-client saves, HTTPS validation, and Public browser flows at 1440 and 390 pixels. Production checks are read-only; no synthetic production rules or participant updates are used.

## Participant manager refinement

Portrait-led participant cards expose custom HTTPS image replacement when the portrait is clicked. Use API image clears the custom override; the provider URL is stored separately by Admin migration 0038. Public rendering uses custom, then provider, then the SVG fallback. The close-button SVG selector is scoped so it cannot shrink the entrant avatar.

Bot event extraction now includes bounded HTTPS actorAvatarUrl from profile_pic_url. It remains outside event fingerprints and evidence matching. Newly created or accumulated awards retain provider avatars without overwriting custom images. The Bot runtime must load the new code at its next normal start; this change does not restart it or backfill historical entries.
