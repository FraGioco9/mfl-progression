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
  "Control typography tokens",
  `  --mfl-control-height: 40px;\n  --mfl-control-compact-height: 36px;\n  --mfl-radius-control: 6px;`,
  `  --mfl-control-height: 40px;\n  --mfl-control-compact-height: 36px;\n  --mfl-control-label-font-size: 14px;\n  --mfl-control-font-weight: 700;\n  --mfl-control-line-height: 1;\n  --mfl-radius-control: 6px;`,
);
await write(foundationsPath, foundations);

const stylesBasePath = new URL("./styles-base.css", import.meta.url);
let stylesBase = await read(stylesBasePath);
stylesBase = updateRule(stylesBase, "View control typography", ".viewButton {", [
  ["  font-size: 14px;", "  font-size: var(--mfl-control-label-font-size);"],
  ["  font-weight: 700;", "  font-weight: var(--mfl-control-font-weight);"],
]);
await write(stylesBasePath, stylesBase);

const controlsPath = new URL("./controls.css", import.meta.url);
let controls = await read(controlsPath);
controls = updateRule(
  controls,
  "Shared selector-control line height",
  `:is(\n  .viewButton:not([hidden]),\n  .filtersViewButton,\n  .mflStatsFilterButton,\n  .mflStatsDistributionModeButton,\n  .playerAttributeViewButton\n) {`,
  [["  line-height: 1;", "  line-height: var(--mfl-control-line-height);"]],
);
controls = updateRule(controls, "Filters control typography", ".filtersViewButton {", [
  ["  font-size: 14px;", "  font-size: var(--mfl-control-label-font-size);"],
  ["  font-weight: 700;", "  font-weight: var(--mfl-control-font-weight);"],
  ["  line-height: 1;", "  line-height: var(--mfl-control-line-height);"],
]);
await write(controlsPath, controls);

const validatorPath = new URL("./validate-ui-foundations.mjs", import.meta.url);
let validator = await read(validatorPath);
validator = replaceOnce(
  validator,
  "Control typography token validation",
  `  "--mfl-control-height: 40px;",\n  "--mfl-control-compact-height: 36px;",\n  "--mfl-radius-control: 6px;",`,
  `  "--mfl-control-height: 40px;",\n  "--mfl-control-compact-height: 36px;",\n  "--mfl-control-label-font-size: 14px;",\n  "--mfl-control-font-weight: 700;",\n  "--mfl-control-line-height: 1;",\n  "--mfl-radius-control: 6px;",`,
);
validator = replaceOnce(
  validator,
  "Control typography consumer validation",
  `includes(stacking, '@import url("/ui-foundations.css");', "Global UI foundations must load before shared stacking/base styles.");\n`,
  `includes(stacking, '@import url("/ui-foundations.css");', "Global UI foundations must load before shared stacking/base styles.");\n\nconst viewControlTypography = exactRule(stylesBase, ".viewButton");\nincludes(viewControlTypography, "font-size: var(--mfl-control-label-font-size);", "View controls must consume the shared standard control-label size.");\nincludes(viewControlTypography, "font-weight: var(--mfl-control-font-weight);", "View controls must consume the shared ordinary-control weight.");\nconst filtersControlTypography = exactRule(controls, ".filtersViewButton");\nincludes(filtersControlTypography, "font-size: var(--mfl-control-label-font-size);", "Filters must consume the shared standard control-label size.");\nincludes(filtersControlTypography, "font-weight: var(--mfl-control-font-weight);", "Filters must consume the shared ordinary-control weight.");\nincludes(filtersControlTypography, "line-height: var(--mfl-control-line-height);", "Filters must consume the shared ordinary-control line height.");\nconst playerAttributeTypography = exactRule(stylesBase, ".playerAttributeViewButton");\nif (!playerAttributeTypography) throw new Error("Expected Player Attribute control typography owner.");\nexcludes(playerAttributeTypography, "font-size: var(--mfl-control-label-font-size);", "Player Attribute control size must remain Player-owned.");\nincludes(controls, ".mflStatsFilterButton,\\n  .mflStatsDistributionModeButton,\\n  .playerAttributeViewButton\\n) {\\n  display: inline-flex;\\n  align-items: center;\\n  justify-content: center;\\n  line-height: var(--mfl-control-line-height);", "Equivalent selector controls must consume the shared ordinary-control line-height foundation.");\n`,
);
validator = validator.replace(
  "Global UI foundations validation passed with semantic icon sizing, page layout/title/rhythm, section-title, content-panel, keyboard-focus, metadata, helper/status feedback, destructive/error, and dialog ownership contracts.",
  "Global UI foundations validation passed with semantic icon sizing, control typography, page layout/title/rhythm, section-title, content-panel, keyboard-focus, metadata, helper/status feedback, destructive/error, and dialog ownership contracts.",
);
await write(validatorPath, validator);

const docsPath = new URL("../docs/ui-foundations.md", import.meta.url);
let docs = await read(docsPath);
docs = replaceOnce(
  docs,
  "Control typography documentation",
  `- Standard control height: \`40px\` (\`--mfl-control-height\`)\n- Compact control height: \`36px\` (\`--mfl-control-compact-height\`)\n- Standard control radius: \`6px\` (\`--mfl-radius-control\`)`,
  `- Standard control height: \`40px\` (\`--mfl-control-height\`)\n- Compact control height: \`36px\` (\`--mfl-control-compact-height\`)\n- Standard View/Filters label size: \`14px\` (\`--mfl-control-label-font-size\`)\n- Shared ordinary selector-control weight: \`700\` (\`--mfl-control-font-weight\`)\n- Shared ordinary selector-control line-height: \`1\` (\`--mfl-control-line-height\`)\n- Standard control radius: \`6px\` (\`--mfl-radius-control\`)`,
);
docs = replaceOnce(
  docs,
  "Control typography boundary documentation",
  `Specialized tiny steppers, table action buttons, mobile-only touch geometry, and other domain-specific controls keep their own sizes.`,
  `Specialized tiny steppers, table action buttons, mobile-only touch geometry, and other domain-specific controls keep their own sizes. View and Filters share the standard 14px label size and 700 weight; smaller Stats and Player controls retain locally owned font sizes and may share only the selector-control line-height when the interaction role matches.`,
);
docs = replaceOnce(
  docs,
  "Control typography normalization documentation",
  `11. Sidebar/mobile navigation icons consume the shared 18px navigation-icon contract, while Search and Filters consume the shared 17px ordinary-control icon contract; numerically similar specialist icons remain locally owned.`,
  `11. Sidebar/mobile navigation icons consume the shared 18px navigation-icon contract, while Search and Filters consume the shared 17px ordinary-control icon contract; numerically similar specialist icons remain locally owned.\n12. Standard View/Filters controls consume one 14px control-label size and 700 weight, while equivalent selector controls consume the shared line-height foundation without flattening smaller Stats or Player-specific sizes.`,
);
await write(docsPath, docs);

console.log("One-time ordinary control typography foundation migration applied idempotently on the icon-foundation main base.");
