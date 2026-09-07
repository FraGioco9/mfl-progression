import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8").replace(/\r\n?/g, "\n");
const playerSource = read("./html-sources/player.html");
const noteSource = read("./html-sources/player-note-first-paint.html");
const generatedIndex = read("./index.html");
const responsive = read("./responsive.css");
const mobilePlacement = read("./responsive-sources/player-note-tablet.css.inc");
const desktopPlacement = read("./responsive-sources/player-note-desktop.css.inc");
const noteSvg = read("./player-note.svg");

assert.ok(
  playerSource.includes('if (notesPanel instanceof HTMLElement) notesPanel.hidden = root.dataset.storedWalletOptIn !== "true";'),
  "The canonical Player shell must keep its proven stored-opt-in Notes visibility owner.",
);
assert.ok(
  playerSource.includes('style="visibility:hidden" aria-hidden="true" disabled')
    && playerSource.includes('class="playerNotesCount" style="visibility:hidden"'),
  "The base Player shell must remain passive until the dedicated Notes first-paint fragment synchronizes it.",
);

for (const source of [noteSource, generatedIndex]) {
  assert.ok(
    source.includes('localStorage.getItem("mfl-wallet-player-notes-v1:" + wallet)'),
    "Direct Player first paint must read the current linked wallet note cache before hydration.",
  );
  assert.ok(
    source.includes('if (input.style.visibility) input.style.removeProperty("visibility");')
      && source.includes('if (count.style.visibility) count.style.removeProperty("visibility");'),
    "Opted-in direct refreshes must reveal the existing Notes field/count during parser-owned first paint.",
  );
  assert.ok(
    source.includes('if (input.value !== cachedPlayerNote) input.value = cachedPlayerNote;')
      && source.includes('const nextCount = cachedPlayerNote.length + "/100";')
      && source.includes('if (count.textContent !== nextCount) count.textContent = nextCount;'),
    "First-paint Notes synchronization must be idempotent so its MutationObserver cannot self-trigger indefinitely.",
  );
  assert.ok(
    source.includes('note.className = "playerNoteIcon";')
      && source.includes('note.dataset.tooltip = cachedPlayerNote;')
      && source.includes('note.setAttribute("aria-label", "Player note");')
      && source.includes('note.textContent = "📝";'),
    "A cached Player note must create the shared title-note hook during parser-owned first paint.",
  );
  assert.ok(
    source.includes('observer.observe(playerDetail, { childList: true, subtree: true });')
      && source.includes('if (root.dataset.playerFirstPaintContentReady === "true")')
      && source.includes('observer.disconnect();'),
    "The isolated Notes observer must preserve pending first-paint state only until authoritative Player content is ready.",
  );
}

for (const token of [
  '.playerHeroIdentity .playerTitle > .playerTitleNoteIcon:not(:empty) {\n    position: absolute;\n    top: var(--mfl-player-panel-padding);\n    right: var(--mfl-player-panel-padding);',
  'width: 14px;\n    min-width: 14px;\n    max-width: 14px;\n    height: 14px;',
  '.playerHeroIdentity .playerTitle:has(> .playerListingBadge) > .playerTitleNoteIcon:not(:empty) {\n    right: calc(var(--mfl-player-panel-padding) + 22px);',
  '.playerHeroIdentity .playerTitle > .playerTitleNoteIcon > .playerNoteIcon {',
  'font-size: 0;',
  '-webkit-mask: url("/player-note.svg") center / 14px 14px no-repeat;',
  'mask: url("/player-note.svg") center / 14px 14px no-repeat;',
]) {
  assert.ok(mobilePlacement.includes(token), `Canonical mobile Player Note placement/redesign is missing: ${token}`);
  assert.ok(responsive.includes(token), `Generated responsive mobile Player Note placement/redesign is missing: ${token}`);
}

assert.ok(
  noteSvg.includes('viewBox="0 0 24 24"')
    && noteSvg.includes('stroke="#000"')
    && noteSvg.includes('stroke-linecap="round"')
    && noteSvg.includes('stroke-linejoin="round"')
    && noteSvg.includes('<path d="M14 2v6h6"/>')
    && noteSvg.includes('<path d="M8 13h8"/>'),
  "The Player Note asset must remain a purpose-designed monochrome document/note line icon suitable for CSS masking.",
);

for (const token of [
  '@media (min-width: 901px) {',
  '.playerHeroIdentity .playerTitle {\n    display: flex;\n    align-items: center;\n    flex-wrap: nowrap;\n    gap: 8px;',
  '.playerHeroIdentity .playerTitle > .playerTitleName {\n    order: 0;',
  '.playerHeroIdentity .playerTitle > .playerTitleNoteIcon {\n    position: static;\n    order: 1;',
  '.playerHeroIdentity .playerTitle > .playerTitleNoteIcon > .playerNoteIcon {',
  'font-size: 0;',
  '-webkit-mask: url("/player-note.svg") center / 18px 18px no-repeat;',
  '.playerHeroIdentity .playerTitle > .playerListingBadge {\n    position: static;\n    top: auto;\n    right: auto;\n    order: 2;\n    align-self: center;\n    margin-left: 0;',
]) {
  assert.ok(desktopPlacement.includes(token), `Canonical desktop Player Note/Listing placement is missing: ${token}`);
  assert.ok(responsive.includes(token), `Generated responsive desktop Player Note/Listing placement is missing: ${token}`);
}

for (const source of [mobilePlacement, desktopPlacement]) {
  assert.ok(
    source.includes('.playerHeroIdentity .playerTitle > .playerTitleNoteIcon:empty') && source.includes('display: none;'),
    "An empty note host must not reserve title gap before note data exists.",
  );
  assert.ok(!source.includes("!important"), "Player Note placement must not use !important.");
  assert.ok(!source.includes("transform:"), "Player Note placement must use real layout coordinates rather than transform nudges.");
}

console.log("Player Note redesign, mobile Listing-corner alignment, desktop shared title-control placement, isolated first-paint Notes hydration, and observer idempotency validation passed.");
