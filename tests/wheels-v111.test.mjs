import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const wheelPage = await readFile(new URL("../src/pages/WheelPage.tsx", import.meta.url), "utf8");
const stagePage = await readFile(new URL("../src/pages/WheelStagePage.tsx", import.meta.url), "utf8");
const stageEditor = await readFile(new URL("../src/wheels/StageEditorDialog.tsx", import.meta.url), "utf8");
const directory = await readFile(new URL("../src/pages/WheelsPage.tsx", import.meta.url), "utf8");
const galleryOwner = await readFile(new URL("../src/wheels/GalleryOwnerInfo.tsx", import.meta.url), "utf8");
const ownerStyles = await readFile(new URL("../src/styles/wheels-v110.css", import.meta.url), "utf8");
const styles = await readFile(new URL("../src/styles/wheels-v111.css", import.meta.url), "utf8");

test("regular Wheel detail owns its wide composition instead of inheriting the shared container", () => {
  assert.match(wheelPage, /"wheel-control-layout wheel-detail-shell"/);
  assert.doesNotMatch(wheelPage, /"container wheel-control-layout"/);
  assert.match(styles, /--wheels-detail-max:\s*1720px/);
  assert.match(styles, /\.wheel-control-page:not\(\.wheel-control-page--presentation\) \.wheel-detail-shell\s*\{[^}]*width:\s*min\(calc\(100vw - clamp\(32px, 5vw, 104px\)\), var\(--wheels-detail-max\)\)/s);
  assert.match(wheelPage, /wheel-control-heading__meta/);
});

test("regular and Presentation owner identity rests as an avatar and expands for hover or keyboard focus", () => {
  assert.equal((wheelPage.match(/<WheelOwnerDetails wheel=\{wheel\} access=\{access\} disabled=\{!interactive\} \/>/g) || []).length, 2);
  assert.match(styles, /\.wheel-owner--identity\s*\{[^}]*height:\s*38px;[^}]*min-height:\s*38px;/s);
  assert.match(styles, /\.wheel-owner--identity \.wheel-owner__trigger\s*\{[^}]*height:\s*38px;[^}]*max-height:\s*38px;/s);
  assert.match(styles, /\.wheel-owner--identity > \.wheel-owner__trigger > \.wheel-owner__avatar\s*\{[^}]*width:\s*28px;[^}]*height:\s*28px;/s);
  assert.doesNotMatch(styles, /\.wheel-owner--identity \.wheel-owner__avatar\s*\{/);
  assert.match(ownerStyles, /\.wheel-owner__avatar\{[^}]*width:28px;height:28px;[^}]*aspect-ratio:1\/1/);
  assert.match(ownerStyles, /\.wheel-owner__avatar img\{[^}]*width:100%;height:100%;[^}]*object-fit:cover;object-position:50% 50%/);
  assert.match(ownerStyles, /\.wheel-owner__panel>header \.wheel-owner__avatar\{width:38px;height:38px;[^}]*flex-basis:38px\}/);
  assert.match(styles, /\.wheel-owner--identity \.wheel-owner__trigger\s*\{[^}]*max-width:\s*38px[^}]*cubic-bezier\(\.22, 1, \.36, 1\)/s);
  assert.match(styles, /\.wheel-owner--identity:hover \.wheel-owner__trigger,[\s\S]*\.wheel-owner--identity:focus-within \.wheel-owner__trigger,[\s\S]*max-width:\s*270px/);
  assert.match(styles, /prefers-reduced-motion:\s*reduce[\s\S]*\.wheel-owner--identity \.wheel-owner__trigger/);
});

test("pointer target reader stays anchored to the wheel in regular and Presentation layouts", () => {
  assert.match(styles, /\.wheel-control-page:not\(\.wheel-control-page--presentation\) \.pointer-target-hud,[\s\S]*\.wheel-control-page--presentation \.pointer-target-hud--presentation\s*\{[^}]*right:\s*auto[^}]*left:\s*calc\(50% \+ var\(--wheel-target-radius\) \+ 4px\)/);
  assert.match(styles, /\.wheel-control-page--presentation \.wheel-visual-wrap\s*\{[^}]*--wheel-target-radius:\s*min\(35vh, calc\(50dvh - 175px\), 36vw, 430px\)/s);
  assert.match(styles, /@media \(max-width: 1060px\)[\s\S]*\.wheel-control-page:not\(\.wheel-control-page--presentation\) \.pointer-target-hud\s*\{[^}]*position:\s*relative[^}]*left:\s*auto/s);
  assert.match(styles, /@media \(max-width: 720px\)[\s\S]*\.wheel-control-page--presentation \.pointer-target-hud--presentation[\s\S]*left:\s*auto/);
});

test("Wheel segments open participant details in regular and Presentation modes", () => {
  assert.match(wheelPage, /onSegmentSelect=\{interactive \? \(entry, trigger\) => props\.onParticipant\(entry, trigger\) : undefined\}/);
  assert.doesNotMatch(wheelPage, /onSegmentSelect=\{!props\.presentation/);
  assert.match(wheelPage, /\{participantDetail \? <ParticipantDetails/);
});

test("Presentation owner clears the navigator at the mobile breakpoint only", () => {
  assert.match(styles, /@media \(max-width: 620px\)\s*\{\s*\.wheel-control-page--presentation \.wheel-presentation-owner\s*\{[^}]*top:\s*132px/s);
  assert.doesNotMatch(styles, /@media \(min-width:[^)]+\)[\s\S]*\.wheel-presentation-owner/);
});

test("Stage overview avatars and focused info controls intentionally differ", () => {
  assert.match(stagePage, /<WheelOwnerDetails\s+wheel=\{wheel\}\s+access=\{props\.item\.access\}\s+variant="avatar"/);
  assert.match(stagePage, /<WheelOwnerDetails\s+wheel=\{wheel\}\s+access=\{props\.item\.access\}\s+variant="info"/);
  assert.match(styles, /--wheels-focus-rail:\s*286px/);
  assert.match(styles, /\.stage-focus-spin\s*\{[^}]*min-height:\s*52px/s);
  assert.match(styles, /\.stage-focus-sound\s*\{[^}]*min-height:\s*38px/s);
  assert.match(styles, /\.wheel-owner--avatar \.wheel-owner__trigger\s*\{[^}]*width:\s*32px;[^}]*height:\s*32px;[^}]*max-height:\s*32px/s);
  assert.match(styles, /\.wheel-owner--avatar > \.wheel-owner__trigger > \.wheel-owner__avatar\s*\{[^}]*width:\s*28px;[^}]*height:\s*28px/s);
  assert.match(ownerStyles, /\.wheel-owner--info \.wheel-owner__trigger\{[^}]*width:30px;height:30px;[^}]*max-height:30px/);
});

test("Wheel and Stage listings share one fixed card and artwork footprint", () => {
  assert.match(directory, /className="wheel-card wheel-card--single"/);
  assert.match(directory, /className="wheel-card wheel-card--stage"/);
  assert.match(directory, /<p className="eyebrow">WHEEL<\/p>/);
  assert.match(directory, /<p className="eyebrow">STAGE<\/p>/);
  assert.match(styles, /\.wheel-card\s*\{[^}]*grid-template-rows:\s*184px minmax\(0, 1fr\)[^}]*height:\s*458px/s);
  assert.match(directory, /Array\.from\(\{ length: 3 \}/);
  assert.doesNotMatch(directory, /Math\.random/);
});

test("Wheel and Stage gallery cards use circular owner avatars with hover and focus tooltips", () => {
  assert.equal((directory.match(/<GalleryOwnerInfo /g) || []).length, 2);
  assert.match(directory, /owner=\{wheel\.owner\}[\s\S]*itemType="Wheel"/);
  assert.match(directory, /owner=\{stage\.owner\}[\s\S]*itemType="Stage"/);
  assert.match(galleryOwner, /className="gallery-owner-info__trigger"/);
  assert.match(galleryOwner, /role="tooltip"/);
  assert.match(styles, /\.gallery-owner-info__trigger\s*\{[^}]*width:\s*34px;[^}]*height:\s*34px;[^}]*max-height:\s*34px/s);
  assert.match(styles, /\.gallery-owner-info__trigger > \.wheel-owner__avatar\s*\{[^}]*display:\s*grid;[^}]*width:\s*28px;[^}]*height:\s*28px;[^}]*overflow:\s*hidden;[^}]*border-radius:\s*50%/s);
  assert.match(styles, /\.gallery-owner-info__trigger > \.wheel-owner__avatar img\s*\{[^}]*width:\s*100%;[^}]*height:\s*100%;[^}]*object-fit:\s*cover;[^}]*object-position:\s*50% 50%/s);
  assert.match(styles, /\.gallery-owner-info:hover \.gallery-owner-info__tooltip,[\s\S]*\.gallery-owner-info:focus-within \.gallery-owner-info__tooltip/);
  assert.doesNotMatch(galleryOwner, /wheel-owner--identity/);
});

test("Stage entry points request owned Wheels and hide Add to Stage for non-owners", () => {
  assert.match(stageEditor, /listAccessibleWheels\(search, scope\)/);
  assert.match(wheelPage, /canCreateStage:\s*Boolean\(canCreateStage && access\.role === "owner"\)/);
});
