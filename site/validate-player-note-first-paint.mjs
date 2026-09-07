import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8").replace(/\r\n?/g, "\n");
const playerSource = read("./html-sources/player.html");
const noteSource = read("./html-sources/player-note-first-paint.html");
const generatedIndex = read("./index.html");
const responsive = read("./responsive.css");
const mobilePlacement = read("./responsive-sources/player-note-tablet.css.inc");
const desktopPlacement = read("./responsive-sources/player-note-desktop.css.inc");

assert.ok(
  playerSource.includes('if (notesPanel instanceof HTMLElement) notesPanel.hidden = root.dataset.storedWalletOptIn !== "true";'),
  "The canonical Player shell must keep its proven stored-opt-in Notes visibility owner.",
);
assert.ok(
  playerSource.includes('style="visibility:hidden" aria-hidden="true" disabled')
    && playerSource.includes('class="playerNotesCount" style="visibility:hidden"'),
  "The base Player shell must remain passive until the dedicated Notes first-paint fragment synchronizes it.",
);

const iconSyncIndex = noteSource.indexOf("const syncPlayerNoteIcons = () => {");
const initialRouteGuardIndex = noteSource.indexOf('if (root.dataset.initialEntityRoute !== "player") return;');
assert.ok(
  iconSyncIndex >= 0 && initialRouteGuardIndex > iconSyncIndex,
  "The Note icon normalizer must initialize globally before the direct-refresh-only first-paint data branch.",
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
    "First-paint Notes synchronization must be idempotent so its pending observer cannot self-trigger indefinitely.",
  );
  assert.ok(
    source.includes('const syncPlayerNoteIcons = () => {')
      && source.includes('const svg = document.createElementNS(namespace, "svg");')
      && source.includes('svg.classList.add("playerNoteIconSvg");')
      && source.includes('svg.setAttribute("viewBox", "0 0 24 24");')
      && source.includes('page.setAttribute("d", "M6 2h7l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z");')
      && source.includes('fold.setAttribute("d", "M13 2v5h5");')
      && source.includes('lineOne.setAttribute("d", "M8 11h6");')
      && source.includes('lineTwo.setAttribute("d", "M8 15h6");'),
    "Player Note presentation must use the recreated inline document/note SVG rather than an emoji or cached external asset.",
  );
  assert.ok(
    source.includes('note.querySelector(":scope > .playerNoteIconSvg")')
      && source.includes('note.replaceChildren(createPlayerNoteSvg());')
      && source.includes('iconObserver.observe(playerDetail, { childList: true, subtree: true });'),
    "Pending and hydrated Note renderers must be normalized idempotently to the recreated SVG.",
  );
  assert.ok(
    source.includes('note.className = "playerNoteIcon";')
      && source.includes('note.dataset.tooltip = cachedPlayerNote;')
      && source.includes('note.setAttribute("aria-label", "Player note");')
      && source.includes('note.appendChild(createPlayerNoteSvg());')
      && !source.includes('note.textContent = "📝";'),
    "A cached Player note must render the recreated SVG synchronously during first paint.",
  );
  assert.ok(
    source.includes('observer.observe(playerDetail, { childList: true, subtree: true });')
      && source.includes('if (root.dataset.playerFirstPaintContentReady === "true")')
      && source.includes('observer.disconnect();'),
    "The isolated first-paint Notes observer must preserve pending note data only until authoritative Player content is ready.",
  );
}

for (const token of [
  '.playerHeroIdentity .playerTitle > .playerTitleNoteIcon:not(:empty) {\n    position: absolute;\n    top: var(--mfl-player-panel-padding);\n    right: var(--mfl-player-panel-padding);',
  'width: 14px;\n    min-width: 14px;\n    max-width: 14px;\n    height: 14px;',
  '.playerHeroIdentity .playerTitle:has(> .playerListingBadge) > .playerTitleNoteIcon:not(:empty) {\n    right: calc(var(--mfl-player-panel-padding) + 22px);',
  '.playerHeroIdentity .playerTitle > .playerTitleNoteIcon > .playerNoteIcon > .playerNoteIconSvg {',
  'flex: 0 0 14px;',
  'stroke: currentColor;',
  'stroke-width: 1.8;',
]) {
  assert.ok(mobilePlacement.includes(token), `Canonical mobile Player Note placement/redesign is missing: ${token}`);
  assert.ok(responsive.includes(token), `Generated responsive mobile Player Note placement/redesign is missing: ${token}`);
}

for (const token of [
  '@media (min-width: 901px) {',
  '.playerHeroIdentity .playerTitle {\n    display: flex;\n    align-items: center;\n    flex-wrap: nowrap;\n    gap: 8px;',
  '.playerHeroIdentity .playerTitle > .playerTitleName {\n    order: 0;',
  '.playerHeroIdentity .playerTitle > .playerTitleNoteIcon {\n    position: static;\n    order: 1;',
  '.playerHeroIdentity .playerTitle > .playerTitleNoteIcon > .playerNoteIcon > .playerNoteIconSvg {',
  'flex: 0 0 18px;',
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
  assert.ok(!source.includes("/player-note.svg"), "Player Note presentation must not depend on the removed external icon asset.");
}

console.log("Player Note inline SVG rendering, first-paint availability, mobile Listing-scale geometry, desktop shared title-control placement, and observer idempotency validation passed.");
