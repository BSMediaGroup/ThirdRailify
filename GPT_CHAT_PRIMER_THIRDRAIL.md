WE ARE PERFORMING A CODEX PROMPTING SESSION RUN LOCALLY IN VSCODE - LOCAL WORKSPACE PARENT ROOT= C:\NEPTUNE LOCAL\GIT\

YOU MUST ALWAYS PROVIDE THE CODEX PROMPT FOR EACH TASK IN A SINGLE CODEBLOCK, FOLLOWED BY ANOTHER SEPARATE CODEBLOCK CONTAINING THE GITHUB COMMIT TITLE TEXT, AND ANOTHER THIRD CODEBLOCK CONTAINING THE GITHUB COMMIT DESCRIPTION TEXT.

WE WILL PLAN AND DISCUSS EACH TASK AND DESIGN THE BEST WAY FORWARD HERE IN CHAT BEFORE PROCEEDING WITH CODEX PROMPTS TO COMPLETE THE TASKS. DO NOT EVER ASK CODEX TO REPRINT FILES IN FULL OR LARGE DIFFS IN ITS SUMMARY AS THIS WASTES CREDIT AND IS NOT NECESSARY BECAUSE LOCAL CODEX CAN INSPECT THE WORKSPACE DIRECTLY.

YOU MUST SPECIFY EVERY WRITABLE WORKSPACE/REPO ROOT RELEVANT TO THE TASK IN EACH PROMPT. REFERENCE REPOSITORIES MAY BE INSPECTED FOR EXISTING IMPLEMENTATIONS, DESIGN PATTERNS, ARCHITECTURE, OR REUSABLE APPROACHES, BUT MUST NEVER BE MODIFIED UNLESS I EXPLICITLY CHANGE THEIR STATUS.

THE REPO MAP FOR THE PROJECT IS AS FOLLOWS=

Repository Map:

WRITABLE / AUTHORITATIVE THIRD RAILIFY REPOSITORIES:

ThirdRailify — Main public Third Railify website and merch-store project. This will replace the current Wix Studio site at https://thirdrailify.com when the new implementation is complete. It is intended for Cloudflare Pages and will initially deploy only to its default Cloudflare Pages `.pages.dev` development/staging URL. The production `thirdrailify.com` domain must remain on the existing Wix site until an explicit final cutover task. The site serves primarily as the professional public home for the Third Railify daily podcast, host/about content, social and platform links, and a major first-class merchandise storefront including `/shop`. Merch integrations are expected to use APIs rather than Wix plugins, including Printful and potentially Printify as requirements are established.
LOCAL ROOT= C:\NEPTUNE LOCAL\GIT\ThirdRailify

ThirdRailify-Admin — Dedicated administrative web application for managing Third Railify site content, merchandise/products, integrations, operational settings, and other privileged website functionality. Intended final hostname is https://admin.thirdrailify.com, but no production Cloudflare/domain configuration exists yet and it must initially use a development/staging deployment.
LOCAL ROOT= C:\NEPTUNE LOCAL\GIT\ThirdRailify-Admin

REFERENCE-ONLY REPOSITORIES — INSPECT FREELY, NEVER MODIFY:

StreamSuites-Public — Existing polished Cloudflare Pages public web implementation at https://streamsuites.app. Use as reference for public-facing layout quality, responsive design, component patterns, visual polish, animation/effects, Cloudflare Pages structure, routing, and other relevant frontend approaches.
REFERENCE-ONLY ROOT= C:\NEPTUNE LOCAL\GIT\StreamSuites-Public

StreamSuites-Dashboard — Existing StreamSuites administrative dashboard at https://admin.streamsuites.app. Use as reference for sophisticated admin-dashboard layout, information architecture, navigation, cards, tables, controls, responsive behavior, states, and dashboard UX.
REFERENCE-ONLY ROOT= C:\NEPTUNE LOCAL\GIT\StreamSuites-Dashboard

DanielClancy — Personal website at https://danielclancy.net, including an existing API-backed Printful store implementation at https://danielclancy.net/shop and other public/site architecture that may be relevant to Third Railify. Use the public/link-oriented and merchandise/store portions as references. The unrelated engineering portfolio/CV material on the main personal site is NOT relevant to Third Railify and should not influence the new site.
REFERENCE-ONLY ROOT= C:\NEPTUNE LOCAL\GIT\DanielClancy

DanielClancy-Admin — Administrative dashboard for the DanielClancy website. Use as reference where helpful for site-management architecture, authenticated administration, merchandise/product management, APIs, content operations, or patterns that can sensibly be adapted to ThirdRailify-Admin.
REFERENCE-ONLY ROOT= C:\NEPTUNE LOCAL\GIT\DanielClancy-Admin

PROJECT / DEPLOYMENT BOUNDARIES:

• The existing live Wix Studio website at https://thirdrailify.com remains the live production website until an explicit migration/cutover task.
• Nothing has yet been configured on Cloudflare for the new Third Railify project.
• During development, use the default Cloudflare Pages `.pages.dev` deployment URLs once Cloudflare setup is performed.
• Do NOT attach, redirect, transfer, or otherwise cut over `thirdrailify.com` or `admin.thirdrailify.com` during ordinary development tasks.
• The `thirdrailify.com` domain currently requires a later deliberate migration from its existing GoDaddy nameserver/DNS arrangement to Cloudflare when the replacement website is approved for production.
• Do not make DNS, registrar, nameserver, custom-domain, Wix-disconnection, or production-cutover changes unless the task explicitly requests that migration.
• The new site is a version-2 replacement, not a requirement to reproduce Wix pixel-for-pixel. Existing thirdrailify.com content, branding, products, links, and business requirements are source material, while layout and UX may be substantially redesigned and polished.
• `/shop` is a primary product surface, not a minor secondary page. It should ultimately be treated as a polished, intuitive, top-tier merchandise storefront.
• The future admin application must be operationally distinct from the public site and must not expose privileged management functionality publicly.

BECAUSE LOCAL CODEX IN VSCODE CAN SEE ALL ATTACHED WORKSPACE REPOSITORIES AT ONCE, IT IS ACCEPTABLE TO INSPECT THE REFERENCE-ONLY REPOSITORIES WHILE IMPLEMENTING THIRD RAILIFY FEATURES. REUSE OR ADAPT ALREADY SOLVED PATTERNS WHERE THIS IS APPROPRIATE RATHER THAN NEEDLESSLY REINVENTING THEM, BUT DO NOT BLINDLY COPY IMPLEMENTATIONS OR IMPORT UNRELATED STREAMSUITES/DANIELCLANCY PRODUCT ASSUMPTIONS.

CROSS-REPO TASKS MAY COMBINE ThirdRailify AND ThirdRailify-Admin ONLY WHEN THE WORK IS GENUINELY COUPLED. IF MULTIPLE WRITABLE REPOSITORIES REQUIRE INDEPENDENT WORK, SPLIT THEM INTO SEPARATE TASKS. ALWAYS STATE WHICH WRITABLE ROOTS ARE IN SCOPE AND WHICH REFERENCE ROOTS, IF ANY, WERE INSPECTED.

REFERENCE REPOSITORIES ARE READ-ONLY. CODEX MUST NOT EDIT, FORMAT, REFACTOR, COMMIT, CREATE FILES IN, DELETE FILES FROM, OR OTHERWISE MODIFY:
C:\NEPTUNE LOCAL\GIT\StreamSuites-Public
C:\NEPTUNE LOCAL\GIT\StreamSuites-Dashboard
C:\NEPTUNE LOCAL\GIT\DanielClancy
C:\NEPTUNE LOCAL\GIT\DanielClancy-Admin

ANY NEW FILES CREATED OR REMOVED IN A WRITABLE THIRD RAILIFY REPOSITORY MUST ALSO BE REFLECTED IN THE REPO TREE / RELEVANT STRUCTURE DOCUMENTATION CONTAINED IN THAT REPOSITORY'S ROOT README.md.

AFTER PROVIDING EACH SET OF CODEX PROMPT + GITHUB COMMIT DETAILS, GIVE A VERY SHORT COMMENT OUTLINING THE LIKELY NEXT TASK SO I CAN KEEP TRACK OF WHERE WE ARE. DO NOT RACE AHEAD THROUGH MANY CONSECUTIVE TASKS BECAUSE I WILL TEST AND DEBUG BETWEEN MILESTONES AND THEN PROMPT YOU TO CONTINUE. KEEP THE PROCESS METHODICAL AND TESTABLE WITHOUT REDUCING IT TO NEEDLESSLY TINY STEPS.

AT THE PROGRESS MILESTONE OF EACH IMPLEMENTATION TASK, ADD TECHNICAL AND HUMAN-READABLE DETAILS OF WHAT WAS COMPLETED TO THE ROOT `BUMP_NOTES.md` OF EVERY AFFECTED WRITABLE REPOSITORY.

USE AN ADDITIVE ACCUMULATIVE FORMAT UNDER THE HEADING FOR THE CURRENT AND NEXT/PENDING VERSION, FOR EXAMPLE:

CURRENT VER= 0.X.X-alpha / PENDING VER= 0.X.X-alpha

DO NOT REPLACE THE EXISTING DOCUMENT. UPDATE OR APPEND TO IT. REMOVE EXISTING CONTENT ONLY WHEN IT HAS BECOME FACTUALLY INCORRECT, SUPERSEDED, OR NO LONGER RELEVANT. IF `BUMP_NOTES.md` DOES NOT EXIST IN AN AFFECTED WRITABLE REPOSITORY, CREATE IT.

`BUMP_NOTES.md` WILL SERVE AS A PRIMARY SOURCE FOR LATER DETAILED RELEASE NOTES AND CHANGELOG GENERATION. DO NOT INVENT VERSION NUMBERS IF THE REPOSITORY ALREADY DEFINES A VERSIONING SCHEME; INSPECT THE REPOSITORY FIRST.

TASK=
