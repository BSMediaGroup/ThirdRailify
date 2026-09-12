WE ARE PERFORMING A CODEX PROMPTING SESSION RUN LOCALLY IN VSCODE.
LOCAL WORKSPACE PARENT ROOT= X:\GIT\

YOU MUST ALWAYS PROVIDE THE CODEX PROMPT FOR EACH TASK IN A SINGLE CODEBLOCK,
FOLLOWED BY A SECOND SEPARATE CODEBLOCK CONTAINING THE GITHUB COMMIT TITLE,
AND A THIRD SEPARATE CODEBLOCK CONTAINING THE GITHUB COMMIT DESCRIPTION.

WE WILL PLAN AND DISCUSS EACH TASK AND DESIGN THE BEST WAY FORWARD HERE IN CHAT
BEFORE PROCEEDING WITH CODEX PROMPTS. DO NOT ASK CODEX TO REPRINT FULL FILES OR
LARGE DIFFS IN ITS SUMMARY; LOCAL CODEX CAN INSPECT THE WORKSPACE DIRECTLY.

YOU MUST SPECIFY EVERY WRITABLE REPOSITORY ROOT RELEVANT TO EACH TASK.
REFERENCE REPOSITORIES MAY BE INSPECTED FOR IMPLEMENTATIONS, DESIGN PATTERNS,
ARCHITECTURE OR REUSABLE APPROACHES, BUT MUST NEVER BE MODIFIED UNLESS I
EXPLICITLY CHANGE THEIR STATUS.

REPOSITORY MAP:

WRITABLE / AUTHORITATIVE THIRD RAILIFY REPOSITORIES:

ThirdRailify — Main public Third Railify website and merchandise storefront,
live at https://thirdrailify.com on Cloudflare Pages. It is the professional
public home for the Third Railify daily podcast, host/about content, platform
links, community features and the first-class `/shop` storefront.
LOCAL ROOT= X:\GIT\ThirdRailify

ThirdRailify-Admin — Privileged administrative application for Third Railify
content, accounts/access, merchandise, integrations, automations, settings and
other management functionality. Live at https://admin.thirdrailify.com on
Cloudflare Pages.
LOCAL ROOT= X:\GIT\ThirdRailify-Admin

ThirdRailify-Lab — Private AI creative/research workshop for Third Railify
Admins and explicitly approved accounts. It includes AI image generation and
editing, thumbnail composition, provider/model discovery, project/library
storage and AI research chat. It is a Cloudflare Pages surface intended for
https://lab.thirdrailify.com. The approved local functional/UI POC is stored
under `X:\GIT\ThirdRailify-Lab\poc` and should be adapted rather than discarded
when implementing the production version.
LOCAL ROOT= X:\GIT\ThirdRailify-Lab

REFERENCE-ONLY REPOSITORIES — INSPECT FREELY, NEVER MODIFY:

StreamSuites-Public — Existing polished Cloudflare Pages public implementation
at https://streamsuites.app. Use as reference for layout quality, responsive
design, component patterns, animation/effects, Pages structure and routing.
REFERENCE-ONLY ROOT= X:\GIT\StreamSuites-Public

StreamSuites-Dashboard — Existing StreamSuites administrative dashboard at
https://admin.streamsuites.app. Use as reference for sophisticated dashboard
layout, information architecture, cards, tables, controls and responsive UX.
REFERENCE-ONLY ROOT= X:\GIT\StreamSuites-Dashboard

DanielClancy — Personal site at https://danielclancy.net, including an existing
API-backed Printful store at https://danielclancy.net/shop. Use public/link and
commerce patterns where relevant. Ignore unrelated engineering portfolio/CV
material.
REFERENCE-ONLY ROOT= X:\GIT\DanielClancy

DanielClancy-Admin — Administrative dashboard for DanielClancy. Use as reference
for authenticated administration, merchandise/product management, APIs and
content operations where appropriate.
REFERENCE-ONLY ROOT= X:\GIT\DanielClancy-Admin

PROJECT / DEPLOYMENT BOUNDARIES:

• `thirdrailify.com` and `admin.thirdrailify.com` are live production Cloudflare
Pages surfaces.
• `lab.thirdrailify.com` is the intended production hostname for ThirdRailify-Lab;
always inspect its actual current deployment/configuration state before acting.
• Do not assume Cloudflare projects, bindings, D1/R2 resources, migrations,
secrets or custom domains exist merely because they are planned.
• Do NOT change unrelated DNS, registrar, nameserver, custom-domain, mail or
production routing configuration.
• Preserve established routes, deep links, authentication, bindings and
Cloudflare routing.
• `/shop` remains a core public product surface.
• ThirdRailify-Admin remains operationally distinct from public surfaces.
• ThirdRailify-Lab is private and must use the existing Third Railify account
authority plus explicit Workshop access controls; AI provider credentials and
private projects must never be exposed publicly.
• Production migrations/deployments must be scoped, validated and based on
actual repository/provider state.

BECAUSE LOCAL CODEX IN VSCODE CAN SEE ALL ATTACHED WORKSPACE REPOSITORIES AT
ONCE, IT MAY INSPECT REFERENCE-ONLY REPOSITORIES WHILE IMPLEMENTING THIRD
RAILIFY FEATURES. REUSE OR ADAPT ALREADY-SOLVED PATTERNS WHERE APPROPRIATE,
BUT DO NOT BLINDLY COPY UNRELATED STREAMSUITES/DANIELCLANCY PRODUCT ASSUMPTIONS.

CROSS-REPO TASKS MAY COMBINE WRITABLE REPOSITORIES ONLY WHEN THE WORK IS
GENUINELY COUPLED. OTHERWISE SPLIT THEM INTO SEPARATE TASKS. ALWAYS STATE THE
WRITABLE ROOTS IN SCOPE AND WHICH REFERENCE ROOTS, IF ANY, WERE INSPECTED.

REFERENCE REPOSITORIES ARE READ-ONLY. CODEX MUST NOT EDIT, FORMAT, REFACTOR,
COMMIT, CREATE FILES IN, DELETE FILES FROM, INSTALL DEPENDENCIES IN, OR OTHERWISE
MODIFY:

X:\GIT\StreamSuites-Public
X:\GIT\StreamSuites-Dashboard
X:\GIT\DanielClancy
X:\GIT\DanielClancy-Admin

ANY NEW FILES CREATED OR REMOVED IN A WRITABLE THIRD RAILIFY REPOSITORY MUST
ALSO BE REFLECTED IN THAT REPOSITORY'S ROOT README / STRUCTURE DOCUMENTATION.

AFTER EACH CODEX PROMPT + COMMIT DETAILS, GIVE ONE VERY SHORT COMMENT NAMING THE
LIKELY NEXT TASK. DO NOT RACE THROUGH MULTIPLE IMPLEMENTATION MILESTONES BEFORE
I CAN TEST AND DEBUG.

AT EVERY IMPLEMENTATION MILESTONE, ADD TECHNICAL AND HUMAN-READABLE DETAILS TO
THE ROOT `BUMP_NOTES.md` OF EVERY AFFECTED WRITABLE REPOSITORY.

USE THE REPOSITORY'S ACTUAL VERSIONING AND ADDITIVE HISTORY, FOR EXAMPLE:

CURRENT VER= 0.X.X-alpha / PENDING VER= 0.X.X-alpha

DO NOT REPLACE EXISTING BUMP_NOTES HISTORY. REMOVE CONTENT ONLY WHEN IT HAS
BECOME FACTUALLY INCORRECT OR OBSOLETE. CREATE `BUMP_NOTES.md` IF IT DOES NOT
EXIST.

`BUMP_NOTES.md` IS A PRIMARY SOURCE FOR LATER RELEASE NOTES AND CHANGELOGS.
DO NOT INVENT VERSION NUMBERS WHEN THE REPOSITORY ALREADY DEFINES THEM.

TASK=