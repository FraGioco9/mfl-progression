import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8").replace(/\r\n?/g, "\n");
const playerSource = read("./html-sources/player.html");
const generatedIndex = read("./index.html");
const responsive = read("./responsive.css");
const placementSource = read("./responsive-sources/player-note-placement.css.inc");

for (const source of [playerSource, generatedIndex]) {
  assert.ok(
    source.includes('localStorage.getItem("mfl-wallet-player-notes-v1:" + wallet)'),
    "Direct Player first paint must read the current linked wallet note cache before hydration.",
  );
  assert.ok(
    source.includes('note.className = "playerNoteIcon";')
      && source.includes('note.setAttribute("aria-label", "Player note");')
      && source.includes('note.textContent = "📝";'),
    "A cached Player note must create the same title note glyph during the parser-owned first paint.",
  );
  assert.ok(
    source.includes('syncCachedNoteIcon();') && source.includes('syncCachedNotesPanel();'),
    "Pending Player synchronization must preserve the cached note icon and Notes panel until authoritative content is ready.",
  );
  assert.ok(
    source.includes('<textarea class="playerNotesInput" aria-hidden="true" disabled></textarea>')
      && source.includes('<span class="playerNotesCount">0/100</span>'),
    "The parser-owned Notes field and count must be visibly present at first paint for opted-in users.",
  );
  assert.ok(
    !source.includes('class="playerNotesInput" style="visibility:hidden"')
      && !source.includes('class="playerNotesCount" style="visibility:hidden"'),
    "The parser-owned Notes field/count must not be hidden until hydration.",
  );
  assert.ok(
    source.includes('panel.hidden = !optedIn;')
      && source.includes('input.value !== cachedPlayerNote')
      && source.includes('count.textContent = cachedPlayerNote.length + "/100";'),
    "Notes first paint must still respect stored opt-in while projecting cached note text and count.",
  );
}

for (const token of [
  '@media (min-width: 901px) {',
  '.playerHeroIdentity .playerTitle > .playerTitleName {\n    order: 0;',
  '.playerHeroIdentity .playerTitle > .playerTitleNoteIcon {\n    order: 1;',
  '.playerHeroIdentity .playerTitle > .playerListingBadge {\n    order: 2;',
  '@media (max-width: 900px) {',
  '.playerHeroIdentity .playerTitle > .playerTitleNoteIcon:not(:empty) {\n    position: absolute;\n    top: var(--mfl-player-panel-padding);\n    right: var(--mfl-player-panel-padding);',
  'width: 14px;\n    min-width: 14px;\n    max-width: 14px;\n    height: 14px;',
  '.playerHeroIdentity .playerTitle:has(> .playerListingBadge) > .playerTitleNoteIcon:not(:empty) {\n    right: calc(var(--mfl-player-panel-padding) + 22px);',
]) {
  assert.ok(placementSource.includes(token), `Canonical Player Note placement is missing: ${token}`);
  assert.ok(responsive.includes(token), `Generated responsive Player Note placement is missing: ${token}`);
}

assert.ok(
  placementSource.includes('.playerHeroIdentity .playerTitle > .playerTitleNoteIcon:empty {\n    display: none;'),
  "An empty note host must not reserve title gap before note data exists.",
);
assert.ok(!placementSource.includes("!important"), "Player Note placement must not use !important.");
assert.ok(!placementSource.includes("transform:"), "Player Note placement must use real layout coordinates rather than transform nudges.");

console.log("Player Note placement and first-paint Notes validation passed.");
