import { readFile } from "node:fs/promises";

const read = async (path) => String(await readFile(new URL(path, import.meta.url), "utf8")).replace(/\r\n?/g, "\n");
const includes = (source, token, message) => {
  if (!source.includes(token)) throw new Error(message);
};
const excludes = (source, token, message) => {
  if (source.includes(token)) throw new Error(message);
};

const [
  foundations,
  stacking,
  stylesBase,
  styles,
  controls,
  dropdowns,
  footer,
  phoneTables,
  phoneStatic,
  compact,
  docs,
] = await Promise.all([
  read("./ui-foundations.css"),
  read("./stacking.css"),
  read("./styles-base.css"),
  read("./styles.css"),
  read("./controls.css"),
  read("./dropdowns.css"),
  read("./footer.css"),
  read("./responsive-sources/tables-phone.css.inc"),
  read("./responsive-sources/static-phone.css.inc"),
  read("./responsive-sources/compact.css.inc"),
  read("../docs/ui-foundations.md"),
]);

for (const token of [
  "--mfl-control-height: 40px;",
  "--mfl-control-compact-height: 36px;",
  "--mfl-radius-control: 6px;",
  "--mfl-checkbox-size: 16px;",
  "--mfl-radius-checkbox: 4px;",
  "--mfl-page-title-font-size: 20px;",
  "--mfl-page-title-min-height: 32px;",
  "--mfl-page-title-margin-block-start: 6px;",
  "--mfl-page-title-margin-block-end: 8px;",
  "--mfl-page-title-line-height: 1.2;",
  "--mfl-page-section-gap: 6px;",
  "--mfl-radius-dialog: 8px;",
  "--mfl-shadow-tooltip: 0 10px 26px rgba(0, 0, 0, 0.28);",
  "--mfl-shadow-modal: 0 20px 80px rgba(0, 0, 0, 0.28);",
  "--mfl-shadow-mobile-navigation: 0 10px 28px rgba(0, 0, 0, 0.18);",
]) {
  includes(foundations, token, `Global UI foundations are missing: ${token}`);
}

includes(stacking, '@import url("/ui-foundations.css");', "Global UI foundations must load before shared stacking/base styles.");

for (const duplicate of [
  "--mfl-page-title-font-size: 20px;",
  "--mfl-page-title-min-height: 32px;",
  "--mfl-page-title-margin-block-start: 6px;",
  "--mfl-page-title-margin-block-end: 8px;",
  "--mfl-page-title-line-height: 1.2;",
  "--mfl-page-section-gap: 6px;",
]) {
  excludes(styles, duplicate, `Page foundation value must be owned only by ui-foundations.css: ${duplicate}`);
}

for (const token of [
  "min-height: var(--mfl-page-title-min-height);",
  "margin: var(--mfl-page-title-margin-block-start) 0 var(--mfl-page-title-margin-block-end);",
  "line-height: var(--mfl-page-title-line-height);",
  "font-size: var(--mfl-page-title-font-size);",
  "#progressionPage .views {\n  margin-bottom: var(--mfl-page-section-gap);",
  ".quickFilters {\n  margin-bottom: var(--mfl-page-section-gap);",
  "top: calc(var(--mfl-page-title-margin-block-start) + var(--mfl-page-title-min-height) + var(--mfl-page-title-margin-block-end));",
]) {
  includes(styles, token, `Page chrome must consume the shared page foundation: ${token}`);
}
excludes(
  styles,
  "top: calc(var(--mfl-page-title-margin-block-start) + 32px + var(--mfl-page-title-margin-block-end));",
  "First-paint page controls must not duplicate the shared 32px page-title height.",
);

for (const token of [
  "--mfl-page-title-font-size: 18px;",
  "--mfl-page-section-gap: 5px;",
]) {
  includes(phoneTables, token, `Phone page foundations must override the shared semantic token: ${token}`);
}
excludes(phoneTables, ".tablePageTitle {\n    font-size: 18px;", "Phone title sizing must use the shared page-title token.");

for (const selector of [
  ".mflStatsViews",
  ".mflStatsFilters",
  ".mflStatsCards",
  ".mflStatsDistributionHeader",
]) {
  const start = phoneStatic.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`Expected small-screen Stats section ${selector}.`);
  const end = phoneStatic.indexOf("}", start);
  includes(
    phoneStatic.slice(start, end),
    "var(--mfl-page-section-gap)",
    `${selector} must use the shared page section gap.`,
  );
}
excludes(phoneStatic, ".mflStatsPage .tablePageTitle", "Stats pages must not own a separate phone title size.");
includes(compact, "--mfl-page-title-font-size: 17px;", "Compact screens must override the shared page-title token.");
excludes(compact, ".tablePageTitle {\n    font-size: 17px;", "Compact title sizing must use the shared page-title token.");

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
  "Shared page/table title size: `20px` (`--mfl-page-title-font-size`)",
  "Repeated desktop page-section rhythm: `6px` (`--mfl-page-section-gap`)",
  "Canonical dialog radius: `8px`",
  "Uniform Width remains the only numeric player-table column-width contract.",
  "Semantic destructive/error UI uses `--danger` end to end.",
  "Page/table title typography and repeated page-section vertical rhythm use the shared",
  "data visualization/game-state colors",
  "Do not globalize a value merely because two numbers or colors match.",
]) {
  includes(docs, token, `UI foundations documentation is missing: ${token}`);
}

for (const source of [foundations, stacking, stylesBase, styles, controls, dropdowns, footer, phoneTables, phoneStatic, compact]) {
  excludes(source, "!important", "Global UI foundation work must not add !important overrides.");
}

console.log("Global UI foundations validation passed with semantic ownership, shared page title/rhythm contracts, unified theme-aware destructive/error danger, and the canonical 8px dialog contract.");
