import { readFile, writeFile } from "node:fs/promises";

const read = async (url) => String(await readFile(url, "utf8")).replace(/\r\n?/g, "\n");
const write = async (url, source) => writeFile(url, source, "utf8");

const replaceOnce = (source, label, from, to) => {
  if (source.includes(to)) return source;
  const count = source.split(from).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one source match, found ${count}.`);
  return source.replace(from, to);
};

const updateRule = (source, label, anchor, replacements) => {
  const start = source.indexOf(anchor);
  if (start < 0) throw new Error(`${label}: rule anchor not found.`);
  const end = source.indexOf("\n}", start);
  if (end < 0) throw new Error(`${label}: rule end not found.`);
  let block = source.slice(start, end + 2);
  for (const [from, to] of replacements) {
    if (block.includes(to)) continue;
    const count = block.split(from).length - 1;
    if (count !== 1) throw new Error(`${label}: expected one property match for ${from}, found ${count}.`);
    block = block.replace(from, to);
  }
  return `${source.slice(0, start)}${block}${source.slice(end + 2)}`;
};

const foundationsPath = new URL("./ui-foundations.css", import.meta.url);
let foundations = await read(foundationsPath);
foundations = replaceOnce(
  foundations,
  "Ordinary content surface tokens",
  `  /* Shared application surfaces. */\n  --mfl-radius-panel: 8px;`,
  `  /* Shared application surfaces. */\n  --mfl-panel-background: var(--surface);\n  --mfl-panel-border: 1px solid var(--border);\n  --mfl-panel-border-strong: 1px solid var(--border-strong);\n  --mfl-radius-panel: 8px;`,
);
await write(foundationsPath, foundations);

const stylesBasePath = new URL("./styles-base.css", import.meta.url);
let stylesBase = await read(stylesBasePath);
for (const [label, anchor, borderFrom, borderTo] of [
  ["Home summary surface", ".homeStats div {", "  border: 1px solid var(--border);", "  border: var(--mfl-panel-border);"],
  ["Stats filters surface", ".mflStatsFilters {", "  border: 1px solid var(--border-strong);", "  border: var(--mfl-panel-border-strong);"],
  ["Stats cards surface", ".mflStatsCards article,\n.mflStatsDistribution {", "  border: 1px solid var(--border-strong);", "  border: var(--mfl-panel-border-strong);"],
  ["Settings surface", ".settingsIdentity div,\n.settingsSection {", "  border: 1px solid var(--border-strong);", "  border: var(--mfl-panel-border-strong);"],
  ["Privacy surface", ".privacySection {", "  border: 1px solid var(--border);", "  border: var(--mfl-panel-border);"],
]) {
  stylesBase = updateRule(stylesBase, label, anchor, [
    [borderFrom, borderTo],
    ["  background: var(--surface);", "  background: var(--mfl-panel-background);"],
  ]);
}
await write(stylesBasePath, stylesBase);

const validatorPath = new URL("./validate-ui-foundations.mjs", import.meta.url);
let validator = await read(validatorPath);
validator = replaceOnce(
  validator,
  "Content surface token validation",
  `  "--mfl-focus-ring-offset: 2px;",\n  "--mfl-radius-panel: 8px;",`,
  `  "--mfl-focus-ring-offset: 2px;",\n  "--mfl-panel-background: var(--surface);",\n  "--mfl-panel-border: 1px solid var(--border);",\n  "--mfl-panel-border-strong: 1px solid var(--border-strong);",\n  "--mfl-radius-panel: 8px;",`,
);
for (const [label, from, to] of [
  ["Home surface validation", `.homeStats div {\\n  padding: 10px 14px;\\n  border: 1px solid var(--border);\\n  border-radius: var(--mfl-radius-panel);`, `.homeStats div {\\n  padding: 10px 14px;\\n  border: var(--mfl-panel-border);\\n  border-radius: var(--mfl-radius-panel);\\n  background: var(--mfl-panel-background);`],
  ["Stats filters validation", `.mflStatsFilters {\\n  display: grid;\\n  gap: 5px;\\n  margin-bottom: 7px;\\n  padding: 7px 9px;\\n  border: 1px solid var(--border-strong);\\n  border-radius: var(--mfl-radius-panel);`, `.mflStatsFilters {\\n  display: grid;\\n  gap: 5px;\\n  margin-bottom: 7px;\\n  padding: 7px 9px;\\n  border: var(--mfl-panel-border-strong);\\n  border-radius: var(--mfl-radius-panel);\\n  background: var(--mfl-panel-background);`],
  ["Stats cards validation", `.mflStatsCards article,\\n.mflStatsDistribution {\\n  border: 1px solid var(--border-strong);\\n  border-radius: var(--mfl-radius-panel);`, `.mflStatsCards article,\\n.mflStatsDistribution {\\n  border: var(--mfl-panel-border-strong);\\n  border-radius: var(--mfl-radius-panel);\\n  background: var(--mfl-panel-background);`],
  ["Settings surface validation", `.settingsIdentity div,\\n.settingsSection {\\n  border: 1px solid var(--border-strong);\\n  border-radius: var(--mfl-radius-panel);`, `.settingsIdentity div,\\n.settingsSection {\\n  border: var(--mfl-panel-border-strong);\\n  border-radius: var(--mfl-radius-panel);\\n  background: var(--mfl-panel-background);`],
  ["Privacy surface validation", `.privacySection {\\n  padding: 14px 16px;\\n  border: 1px solid var(--border);\\n  border-radius: var(--mfl-radius-panel);`, `.privacySection {\\n  padding: 14px 16px;\\n  border: var(--mfl-panel-border);\\n  border-radius: var(--mfl-radius-panel);\\n  background: var(--mfl-panel-background);`],
]) {
  validator = replaceOnce(validator, label, from, to);
}
validator = replaceOnce(
  validator,
  "Specialist surface token exclusion validation",
  `includes(stylesBase, ".playerHero,\\n.playerPanel {\\n  border: 1px solid var(--border);\\n  border-radius: 8px;", "Player surface radius must remain Player-owned.");`,
  `includes(stylesBase, ".playerHero,\\n.playerPanel {\\n  border: 1px solid var(--border);\\n  border-radius: 8px;", "Player surface radius must remain Player-owned.");\nconst tableShellSurface = exactRule(stylesBase, ".tableShell");\nexcludes(tableShellSurface, "var(--mfl-panel-", "Table surfaces must remain table-owned rather than consuming ordinary panel surface tokens.");\nconst playerHeroSurface = exactRule(stylesBase, ".playerHero,\\n.playerPanel");\nexcludes(playerHeroSurface, "var(--mfl-panel-", "Player surfaces must remain Player-owned rather than consuming ordinary panel surface tokens.");`,
);
validator = validator.replace(
  "Global UI foundations validation passed with semantic icon sizing, control typography, page layout/title/rhythm, section-title, content-panel, keyboard-focus, metadata, helper/status feedback, destructive/error, and dialog ownership contracts.",
  "Global UI foundations validation passed with semantic icon sizing, control typography, page layout/title/rhythm, ordinary content-surface, section-title, keyboard-focus, metadata, helper/status feedback, destructive/error, and dialog ownership contracts.",
);
await write(validatorPath, validator);

const docsPath = new URL("../docs/ui-foundations.md", import.meta.url);
let docs = await read(docsPath);
docs = replaceOnce(
  docs,
  "Content surface documentation",
  `## Content surfaces\n\n- Canonical ordinary content-panel radius: \`8px\` (\`--mfl-radius-panel\`)\n- The panel radius is for equivalent page/content surfaces such as Home summary cards, MFL Stats content panels, Settings surfaces, and Privacy sections.`,
  `## Content surfaces\n\n- Canonical ordinary panel background: \`var(--surface)\` (\`--mfl-panel-background\`)\n- Canonical ordinary panel border: \`1px solid var(--border)\` (\`--mfl-panel-border\`)\n- Canonical strong ordinary panel border: \`1px solid var(--border-strong)\` (\`--mfl-panel-border-strong\`)\n- Canonical ordinary content-panel radius: \`8px\` (\`--mfl-radius-panel\`)\n- These panel contracts are for equivalent page/content surfaces such as Home summary cards, MFL Stats content panels, Settings surfaces, and Privacy sections.`,
);
docs = replaceOnce(
  docs,
  "Content surface ownership boundary documentation",
  `- Tables, Player cards, Evaluation surfaces, pills, and specialist visualizations keep their own geometry even when their current numeric radius also happens to be \`8px\`.`,
  `- Tables, Player cards, Evaluation surfaces, dialogs, dropdowns, controls, pills, and specialist visualizations keep their own surface ownership even when their current border, background, or radius happens to match an ordinary panel value.`,
);
docs = replaceOnce(
  docs,
  "Content surface normalization documentation",
  `12. Standard View/Filters controls consume one 14px control-label size and 700 weight, while equivalent selector controls consume the shared line-height foundation without flattening smaller Stats or Player-specific sizes.`,
  `12. Standard View/Filters controls consume one 14px control-label size and 700 weight, while equivalent selector controls consume the shared line-height foundation without flattening smaller Stats or Player-specific sizes.\n13. Equivalent ordinary Home, Stats, Settings, and Privacy panels consume shared surface background and normal/strong border contracts alongside the shared panel radius; specialist surfaces keep local ownership.`,
);
await write(docsPath, docs);

console.log("One-time ordinary content-surface foundation migration applied idempotently.");
