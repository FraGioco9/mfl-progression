import { readFile } from "node:fs/promises";

const read = async (path) => String(await readFile(new URL(path, import.meta.url), "utf8")).replace(/\r\n?/g, "\n");
const includes = (source, token, message) => {
  if (!source.includes(token)) throw new Error(message);
};
const excludes = (source, token, message) => {
  if (source.includes(token)) throw new Error(message);
};

const [foundations, stacking, stylesBase, controls, dropdowns, footer, docs] = await Promise.all([
  read("./ui-foundations.css"),
  read("./stacking.css"),
  read("./styles-base.css"),
  read("./controls.css"),
  read("./dropdowns.css"),
  read("./footer.css"),
  read("../docs/ui-foundations.md"),
]);

for (const token of [
  "--mfl-control-height: 40px;",
  "--mfl-control-compact-height: 36px;",
  "--mfl-radius-control: 6px;",
  "--mfl-checkbox-size: 16px;",
  "--mfl-radius-checkbox: 4px;",
  "--mfl-radius-dialog: 8px;",
  "--mfl-shadow-tooltip: 0 10px 26px rgba(0, 0, 0, 0.28);",
  "--mfl-shadow-modal: 0 20px 80px rgba(0, 0, 0, 0.28);",
  "--mfl-shadow-mobile-navigation: 0 10px 28px rgba(0, 0, 0, 0.18);",
]) {
  includes(foundations, token, `Global UI foundations are missing: ${token}`);
}

includes(stacking, '@import url("/ui-foundations.css");', "Global UI foundations must load before shared stacking/base styles.");
includes(controls, "--mfl-filter-remove-danger: var(--danger);", "Filter removal must derive from the theme-aware global danger token.");
excludes(controls, "#ff2020", "Filter controls must not retain the old one-off destructive red.");
includes(controls, "border-radius: var(--mfl-radius-control);", "Filter removal must consume the shared control radius.");

for (const token of [
  ".addWatchlistError {\n  min-height: 18px;\n  margin: 6px 0 0;\n  color: var(--danger);",
  "#addWatchlistNameInput[aria-invalid=\"true\"] {\n  border-color: var(--danger);",
  ".evaluationLoadDeleteButton {\n  border-color: var(--border);\n  background: var(--surface-muted);\n  color: var(--danger);",
  ".evaluationFooterDeleteButton {\n  align-self: center;\n  gap: 8px;\n  border-color: var(--border);\n  background: var(--surface-muted);\n  color: var(--danger);",
  ".deleteWatchlistConfirmButton {\n  border-color: var(--border);\n  background: var(--surface-muted);\n  color: var(--danger);",
  ".settingsEmailAddressInput.invalid {\n  border-color: var(--danger);",
  ".settingsEmailDiscardButton {\n  border-color: var(--border);\n  background: var(--surface-muted);\n  color: var(--danger);",
]) {
  includes(stylesBase, token, `Shared destructive/error UI must derive from --danger: ${token}`);
}

for (const token of [
  "#linkWalletButton.walletOptOut {\n  background: transparent;\n  color: var(--danger);",
  ".watchlistDropdownDelete {\n  border-color: var(--border);\n  background: var(--surface-muted);\n  color: var(--danger);",
  ".watchlistDropdownDelete:hover:not(:disabled),\n.watchlistDropdownDelete:focus-visible:not(:disabled) {\n  border-color: var(--danger);\n  background: var(--danger);\n  color: var(--surface);",
]) {
  includes(dropdowns, token, `Dropdown destructive UI must derive from --danger: ${token}`);
}

includes(footer, "border-radius: var(--mfl-radius-dialog);", "Bug Report must consume the canonical 8px dialog radius.");
includes(footer, "box-shadow: var(--mfl-shadow-modal);", "Bug Report must consume the canonical modal shadow.");
includes(footer, "border-radius: var(--mfl-radius-control);", "Bug Report fields must consume the shared control radius where the semantic role matches.");
includes(footer, ".bugReportStatus.isError {\n  color: var(--danger);", "Bug Report error feedback must derive from --danger.");
excludes(footer, ".bugReportDialog {\n  display: flex;\n  flex-direction: column;\n  width: min(620px, calc(100vw - 24px));\n  max-height: min(760px, calc(100dvh - 24px));\n  min-width: 0;\n  border: 1px solid var(--border);\n  border-radius: 10px;", "Bug Report must not reintroduce its former 10px dialog radius.");

for (const [name, source] of [
  ["styles-base.css", stylesBase],
  ["controls.css", controls],
  ["dropdowns.css", dropdowns],
  ["footer.css", footer],
]) {
  for (const forbidden of ["#e06b6b", "#ff8a8a", "#c92a2a", "#fff7f7", "#d84b4b", "#ff6b6b", "#e95656"]) {
    excludes(source, forbidden, `${name} must not retain legacy destructive/error literal ${forbidden}.`);
  }
}

for (const token of [
  "# MFL Front Office UI foundations",
  "## Ownership map",
  "`--danger` is the only global destructive/error-color source.",
  "Canonical dialog radius: `8px`",
  "Uniform Width remains the only numeric player-table column-width contract.",
  "Semantic destructive/error UI uses `--danger` end to end.",
  "data visualization/game-state colors",
  "Do not globalize a value merely because two numbers or colors match.",
]) {
  includes(docs, token, `UI foundations documentation is missing: ${token}`);
}

for (const source of [foundations, stacking, stylesBase, controls, dropdowns, footer]) {
  excludes(source, "!important", "Global UI foundation work must not add !important overrides.");
}

console.log("Global UI foundations validation passed with semantic ownership, unified theme-aware destructive/error danger, and the canonical 8px dialog contract.");
