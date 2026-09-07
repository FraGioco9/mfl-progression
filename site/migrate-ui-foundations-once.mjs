import { readFile, writeFile } from "node:fs/promises";

const path = new URL("./styles-base.css", import.meta.url);
let source = String(await readFile(path, "utf8")).replace(/\r\n?/g, "\n");

const replaceOnce = (label, from, to) => {
  if (source.includes(to)) return;
  const matches = source.split(from).length - 1;
  if (matches !== 1) {
    throw new Error(`${label}: expected one canonical source match, found ${matches}.`);
  }
  source = source.replace(from, to);
};

replaceOnce(
  "checkbox focus",
  `input[type="checkbox"]:focus-visible {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 2px var(--surface), 0 0 0 4px var(--primary);
}`,
  `input[type="checkbox"]:focus-visible {
  outline: none;
  border-color: var(--mfl-focus-ring-color);
  box-shadow:
    0 0 0 var(--mfl-focus-ring-offset) var(--surface),
    0 0 0 calc(var(--mfl-focus-ring-offset) + var(--mfl-focus-ring-width)) var(--mfl-focus-ring-color);
}`,
);

replaceOnce(
  "changelog metadata",
  `.changelogMinorMeta {
  display: flex;
  align-items: center;
  align-self: center;
  height: 100%;
  color: var(--text-soft);
  font-size: 12px;
  font-weight: 700;
  line-height: 1.1;
}`,
  `.changelogMinorMeta {
  display: flex;
  align-items: center;
  align-self: center;
  height: 100%;
  color: var(--text-soft);
  font-size: var(--mfl-metadata-font-size);
  font-weight: var(--mfl-metadata-font-weight);
  line-height: var(--mfl-metadata-line-height);
}`,
);

replaceOnce(
  "home stat surface",
  `.homeStats div {
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
}`,
  `.homeStats div {
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: var(--mfl-radius-panel);
  background: var(--surface);
}`,
);

replaceOnce(
  "home stat metadata",
  `.homeStats label {
  display: block;
  margin-top: 4px;
  color: var(--text-soft);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}`,
  `.homeStats label {
  display: block;
  margin-top: 4px;
  color: var(--text-soft);
  font-size: var(--mfl-metadata-font-size);
  font-weight: var(--mfl-metadata-font-weight);
  text-transform: uppercase;
}`,
);

replaceOnce(
  "watchlist switcher metadata",
  `.watchlistSwitcherLabel {
  color: var(--text-soft);
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
}`,
  `.watchlistSwitcherLabel {
  color: var(--text-soft);
  font-size: var(--mfl-metadata-font-size);
  font-weight: var(--mfl-metadata-font-weight);
  line-height: 1;
  white-space: nowrap;
}`,
);

replaceOnce(
  "rows field metadata",
  `.field.rowsField span {
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 800;
  line-height: 40px;
  text-transform: uppercase;
}`,
  `.field.rowsField span {
  color: var(--text-muted);
  font-size: var(--mfl-metadata-compact-font-size);
  font-weight: var(--mfl-metadata-strong-font-weight);
  line-height: 40px;
  text-transform: uppercase;
}`,
);

replaceOnce(
  "field metadata",
  `.field span {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
}`,
  `.field span {
  font-size: var(--mfl-metadata-font-size);
  font-weight: var(--mfl-metadata-font-weight);
  color: var(--text-muted);
  text-transform: uppercase;
}`,
);

replaceOnce(
  "stats filter panel surface",
  `.mflStatsFilters {
  display: grid;
  gap: 5px;
  margin-bottom: 7px;
  padding: 7px 9px;
  border: 1px solid var(--border-strong);
  border-radius: 8px;
  background: var(--surface);
}`,
  `.mflStatsFilters {
  display: grid;
  gap: 5px;
  margin-bottom: 7px;
  padding: 7px 9px;
  border: 1px solid var(--border-strong);
  border-radius: var(--mfl-radius-panel);
  background: var(--surface);
}`,
);

replaceOnce(
  "stats filter metadata",
  `.mflStatsFilters > span {
  color: var(--text-soft);
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
}`,
  `.mflStatsFilters > span {
  color: var(--text-soft);
  font-size: var(--mfl-metadata-font-size);
  font-weight: var(--mfl-metadata-strong-font-weight);
  text-transform: uppercase;
}`,
);

replaceOnce(
  "stats card surfaces",
  `.mflStatsCards article,
.mflStatsDistribution {
  border: 1px solid var(--border-strong);
  border-radius: 8px;
  background: var(--surface);
}`,
  `.mflStatsCards article,
.mflStatsDistribution {
  border: 1px solid var(--border-strong);
  border-radius: var(--mfl-radius-panel);
  background: var(--surface);
}`,
);

replaceOnce(
  "stats card metadata",
  `.mflStatsCards span {
  display: block;
  color: var(--text-soft);
  font-size: 11px;
  font-weight: 800;
  line-height: 1.1;
  text-transform: uppercase;
}`,
  `.mflStatsCards span {
  display: block;
  color: var(--text-soft);
  font-size: var(--mfl-metadata-compact-font-size);
  font-weight: var(--mfl-metadata-strong-font-weight);
  line-height: var(--mfl-metadata-line-height);
  text-transform: uppercase;
}`,
);

replaceOnce(
  "settings surfaces",
  `.settingsIdentity div,
.settingsSection {
  border: 1px solid var(--border-strong);
  border-radius: 8px;
  background: var(--surface);
  padding: 14px;
}`,
  `.settingsIdentity div,
.settingsSection {
  border: 1px solid var(--border-strong);
  border-radius: var(--mfl-radius-panel);
  background: var(--surface);
  padding: 14px;
}`,
);

replaceOnce(
  "settings metadata",
  `.settingsIdentity span {
  color: var(--text-soft);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}`,
  `.settingsIdentity span {
  color: var(--text-soft);
  font-size: var(--mfl-metadata-font-size);
  font-weight: var(--mfl-metadata-font-weight);
  text-transform: uppercase;
}`,
);

replaceOnce(
  "settings email focus",
  `.settingsEmailAddressInput:focus {
  outline: none;
}`,
  `.settingsEmailAddressInput:focus:not(:focus-visible) {
  outline: none;
}

.settingsEmailAddressInput:focus-visible {
  outline: var(--mfl-focus-ring-width) solid var(--mfl-focus-ring-color);
  outline-offset: var(--mfl-focus-ring-offset);
}`,
);

replaceOnce(
  "date picker focus",
  `.siteDatePickerButton:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 1px;
}`,
  `.siteDatePickerButton:focus-visible {
  outline: var(--mfl-focus-ring-width) solid var(--mfl-focus-ring-color);
  outline-offset: 1px;
}`,
);

replaceOnce(
  "privacy surface",
  `.privacySection {
  padding: 14px 16px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
}`,
  `.privacySection {
  padding: 14px 16px;
  border: 1px solid var(--border);
  border-radius: var(--mfl-radius-panel);
  background: var(--surface);
}`,
);

await writeFile(path, source, "utf8");
console.log("One-time UI foundation source migration applied idempotently.");
