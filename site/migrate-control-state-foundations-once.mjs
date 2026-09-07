import { readFile, writeFile } from "node:fs/promises";

const read = async (url) => String(await readFile(url, "utf8")).replace(/\r\n?/g, "\n");
const write = async (url, source) => writeFile(url, source, "utf8");

const replaceOnce = (source, label, from, to) => {
  if (source.includes(to)) return source;
  const count = source.split(from).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one source match, found ${count}.`);
  return source.replace(from, to);
};

const updateRule = (source, label, selector, replacements) => {
  const anchor = `${selector} {`;
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
  "Ordinary control state tokens",
  `  --mfl-control-line-height: 1;\n  --mfl-radius-control: 6px;`,
  `  --mfl-control-line-height: 1;\n  --mfl-control-border-color: var(--border-strong);\n  --mfl-control-background: var(--surface);\n  --mfl-control-text-color: var(--text);\n  --mfl-control-hover-border-color: var(--primary-hover);\n  --mfl-control-hover-background: var(--row-hover);\n  --mfl-control-hover-text-color: var(--text);\n  --mfl-radius-control: 6px;`,
);
await write(foundationsPath, foundations);

const stylesBasePath = new URL("./styles-base.css", import.meta.url);
let stylesBase = await read(stylesBasePath);
stylesBase = updateRule(stylesBase, "View resting state", ".viewButton", [
  ["  border-color: var(--border-strong);", "  border-color: var(--mfl-control-border-color);"],
  ["  background: var(--surface);", "  background: var(--mfl-control-background);"],
  ["  color: var(--text);", "  color: var(--mfl-control-text-color);"],
]);
await write(stylesBasePath, stylesBase);

const controlsPath = new URL("./controls.css", import.meta.url);
let controls = await read(controlsPath);
controls = updateRule(controls, "Search resting state", ".searchButton", [
  ["  border-color: var(--border-strong);", "  border-color: var(--mfl-control-border-color);"],
  ["  background: var(--surface);", "  background: var(--mfl-control-background);"],
  ["  color: var(--text);", "  color: var(--mfl-control-text-color);"],
]);
controls = updateRule(
  controls,
  "Search hover state",
  ".searchButton:hover:not(:disabled),\n.searchButton:focus-visible:not(:disabled)",
  [
    ["  border-color: var(--primary-hover);", "  border-color: var(--mfl-control-hover-border-color);"],
    ["  background: var(--row-hover);", "  background: var(--mfl-control-hover-background);"],
    ["  color: var(--text);", "  color: var(--mfl-control-hover-text-color);"],
  ],
);
controls = updateRule(controls, "Filters resting state", ".filtersViewButton", [
  ["  border-color: var(--border-strong);", "  border-color: var(--mfl-control-border-color);"],
  ["  background: var(--surface);", "  background: var(--mfl-control-background);"],
  ["  color: var(--text);", "  color: var(--mfl-control-text-color);"],
]);
controls = updateRule(controls, "Filters open state", "body.filtersOpen .filtersViewButton", [
  ["  border-color: var(--primary-hover);", "  border-color: var(--mfl-control-hover-border-color);"],
  ["  background: var(--row-hover);", "  background: var(--mfl-control-hover-background);"],
  ["  color: var(--text);", "  color: var(--mfl-control-hover-text-color);"],
]);
controls = replaceOnce(
  controls,
  "Ordinary versus specialist control hover ownership",
  `:is(\n  .themeButton,\n  .navButton,\n  .viewButton:not([hidden]),\n  .filtersViewButton,\n  .mflStatsFilterButton,\n  .mflStatsDistributionModeButton,\n  .playerAttributeViewButton\n):not(.active):hover:not(:disabled) {\n  border-color: var(--primary-hover);\n  background: var(--row-hover);\n  color: var(--text);\n}`,
  `:is(\n  .viewButton:not([hidden]),\n  .filtersViewButton\n):not(.active):hover:not(:disabled) {\n  border-color: var(--mfl-control-hover-border-color);\n  background: var(--mfl-control-hover-background);\n  color: var(--mfl-control-hover-text-color);\n}\n\n:is(\n  .themeButton,\n  .navButton,\n  .mflStatsFilterButton,\n  .mflStatsDistributionModeButton,\n  .playerAttributeViewButton\n):not(.active):hover:not(:disabled) {\n  border-color: var(--primary-hover);\n  background: var(--row-hover);\n  color: var(--text);\n}`,
);
await write(controlsPath, controls);

const firstPaintPath = new URL("./html-sources/first-paint.html", import.meta.url);
let firstPaint = await read(firstPaintPath);
firstPaint = replaceOnce(
  firstPaint,
  "First-paint View resting state",
  `\${routeSelector} #progressionPage .views > .viewButton:not(:hover) { border-color: var(--border-strong); background: var(--surface); color: var(--text); }`,
  `\${routeSelector} #progressionPage .views > .viewButton:not(:hover) { border-color: var(--mfl-control-border-color); background: var(--mfl-control-background); color: var(--mfl-control-text-color); }`,
);
await write(firstPaintPath, firstPaint);

const staticValidatorPath = new URL("./validate-static-route-ui.mjs", import.meta.url);
let staticValidator = await read(staticValidatorPath);
staticValidator = replaceOnce(
  staticValidator,
  "First-paint control state validation",
  `indexHtml.includes('#progressionPage .views > .viewButton:not(:hover) { border-color: var(--border-strong); background: var(--surface); color: var(--text); }')`,
  `indexHtml.includes('#progressionPage .views > .viewButton:not(:hover) { border-color: var(--mfl-control-border-color); background: var(--mfl-control-background); color: var(--mfl-control-text-color); }')`,
);
await write(staticValidatorPath, staticValidator);

const validatorPath = new URL("./validate-ui-foundations.mjs", import.meta.url);
let validator = await read(validatorPath);
validator = replaceOnce(
  validator,
  "Control state token validation",
  `  "--mfl-control-line-height: 1;",\n  "--mfl-radius-control: 6px;",`,
  `  "--mfl-control-line-height: 1;",\n  "--mfl-control-border-color: var(--border-strong);",\n  "--mfl-control-background: var(--surface);",\n  "--mfl-control-text-color: var(--text);",\n  "--mfl-control-hover-border-color: var(--primary-hover);",\n  "--mfl-control-hover-background: var(--row-hover);",\n  "--mfl-control-hover-text-color: var(--text);",\n  "--mfl-radius-control: 6px;",`,
);
validator = replaceOnce(
  validator,
  "Ordinary control state consumer validation",
  `includes(filtersControlTypography, "line-height: var(--mfl-control-line-height);", "Filters must consume the shared ordinary-control line height.");\nconst playerAttributeTypography = exactRule(stylesBase, ".playerAttributeViewButton");`,
  `includes(filtersControlTypography, "line-height: var(--mfl-control-line-height);", "Filters must consume the shared ordinary-control line height.");\nfor (const [label, rule] of [["View", viewControlTypography], ["Filters", filtersControlTypography]]) {\n  includes(rule, "border-color: var(--mfl-control-border-color);", label + " controls must consume the shared resting border color.");\n  includes(rule, "background: var(--mfl-control-background);", label + " controls must consume the shared resting background.");\n  includes(rule, "color: var(--mfl-control-text-color);", label + " controls must consume the shared resting text color.");\n}\nconst searchControlState = exactRule(controls, ".searchButton");\nincludes(searchControlState, "border-color: var(--mfl-control-border-color);", "Search must consume the shared resting border color.");\nincludes(searchControlState, "background: var(--mfl-control-background);", "Search must consume the shared resting background.");\nincludes(searchControlState, "color: var(--mfl-control-text-color);", "Search must consume the shared resting text color.");\nconst searchHoverState = exactRule(controls, ".searchButton:hover:not(:disabled),\\n.searchButton:focus-visible:not(:disabled)");\nincludes(searchHoverState, "border-color: var(--mfl-control-hover-border-color);", "Search hover/focus must consume the shared hover border color.");\nincludes(searchHoverState, "background: var(--mfl-control-hover-background);", "Search hover/focus must consume the shared hover background.");\nincludes(searchHoverState, "color: var(--mfl-control-hover-text-color);", "Search hover/focus must consume the shared hover text color.");\nconst ordinaryControlHover = exactRule(controls, ":is(\\n  .viewButton:not([hidden]),\\n  .filtersViewButton\\n):not(.active):hover:not(:disabled)");\nincludes(ordinaryControlHover, "border-color: var(--mfl-control-hover-border-color);", "View/Filters hover must consume the shared hover border color.");\nincludes(ordinaryControlHover, "background: var(--mfl-control-hover-background);", "View/Filters hover must consume the shared hover background.");\nincludes(ordinaryControlHover, "color: var(--mfl-control-hover-text-color);", "View/Filters hover must consume the shared hover text color.");\nconst filtersOpenState = exactRule(controls, "body.filtersOpen .filtersViewButton");\nincludes(filtersOpenState, "border-color: var(--mfl-control-hover-border-color);", "Open Filters must consume the shared hover border color.");\nincludes(filtersOpenState, "background: var(--mfl-control-hover-background);", "Open Filters must consume the shared hover background.");\nconst specialistControlHover = exactRule(controls, ":is(\\n  .themeButton,\\n  .navButton,\\n  .mflStatsFilterButton,\\n  .mflStatsDistributionModeButton,\\n  .playerAttributeViewButton\\n):not(.active):hover:not(:disabled)");\nincludes(specialistControlHover, "border-color: var(--primary-hover);", "Specialist control hover border must remain locally owned.");\nincludes(specialistControlHover, "background: var(--row-hover);", "Specialist control hover background must remain locally owned.");\nexcludes(specialistControlHover, "var(--mfl-control-hover-", "Navigation/Stats/Player specialist hover states must not consume ordinary control-state tokens.");\nconst playerAttributeTypography = exactRule(stylesBase, ".playerAttributeViewButton");`,
);
validator = replaceOnce(
  validator,
  "Control state docs validation",
  `  "Ordinary helper/status text size: \`12px\` (\`--mfl-helper-text-font-size\`)",\n  "Canonical ordinary content-panel radius: \`8px\` (\`--mfl-radius-panel\`)",`,
  `  "Ordinary helper/status text size: \`12px\` (\`--mfl-helper-text-font-size\`)",\n  "Ordinary control resting border: \`var(--border-strong)\` (\`--mfl-control-border-color\`)",\n  "Ordinary control hover background: \`var(--row-hover)\` (\`--mfl-control-hover-background\`)",\n  "Canonical ordinary content-panel radius: \`8px\` (\`--mfl-radius-panel\`)",`,
);
validator = validator.replace(
  "Global UI foundations validation passed with semantic icon sizing, control typography, page layout/title/rhythm, ordinary content-surface, section-title, keyboard-focus, metadata, helper/status feedback, destructive/error, and dialog ownership contracts.",
  "Global UI foundations validation passed with semantic icon sizing, control typography/state, page layout/title/rhythm, ordinary content-surface, section-title, keyboard-focus, metadata, helper/status feedback, destructive/error, and dialog ownership contracts.",
);
await write(validatorPath, validator);

const docsPath = new URL("../docs/ui-foundations.md", import.meta.url);
let docs = await read(docsPath);
docs = replaceOnce(
  docs,
  "Control state documentation",
  `- Shared ordinary selector-control line-height: \`1\` (\`--mfl-control-line-height\`)\n- Standard control radius: \`6px\` (\`--mfl-radius-control\`)`,
  `- Shared ordinary selector-control line-height: \`1\` (\`--mfl-control-line-height\`)\n- Ordinary control resting border: \`var(--border-strong)\` (\`--mfl-control-border-color\`)\n- Ordinary control resting background: \`var(--surface)\` (\`--mfl-control-background\`)\n- Ordinary control resting text: \`var(--text)\` (\`--mfl-control-text-color\`)\n- Ordinary control hover border: \`var(--primary-hover)\` (\`--mfl-control-hover-border-color\`)\n- Ordinary control hover background: \`var(--row-hover)\` (\`--mfl-control-hover-background\`)\n- Ordinary control hover text: \`var(--text)\` (\`--mfl-control-hover-text-color\`)\n- Standard control radius: \`6px\` (\`--mfl-radius-control\`)`,
);
docs = replaceOnce(
  docs,
  "Control state ownership documentation",
  `Specialized tiny steppers, table action buttons, mobile-only touch geometry, and other domain-specific controls keep their own sizes. View and Filters share the standard 14px label size and 700 weight; smaller Stats and Player controls retain locally owned font sizes and may share only the selector-control line-height when the interaction role matches.`,
  `Specialized tiny steppers, table action buttons, mobile-only touch geometry, and other domain-specific controls keep their own sizes. View and Filters share the standard 14px label size and 700 weight; View, Filters, Search, and refresh-first-paint View controls share the ordinary resting/hover state language. Smaller Stats and Player controls retain locally owned font sizes, and navigation, Stats, Player, dropdown, destructive, opt-in, and other specialist states remain independently owned even when their current colors match.`,
);
docs = replaceOnce(
  docs,
  "Control state normalization documentation",
  `13. Equivalent ordinary Home, Stats, Settings, and Privacy panels consume shared surface background and normal/strong border contracts alongside the shared panel radius; specialist surfaces keep local ownership.`,
  `13. Equivalent ordinary Home, Stats, Settings, and Privacy panels consume shared surface background and normal/strong border contracts alongside the shared panel radius; specialist surfaces keep local ownership.\n14. View, Filters, Search, and refresh-first-paint View controls consume shared ordinary resting/hover surface-state contracts, while navigation, Stats, Player, dropdown, destructive, opt-in, and other specialist states remain locally owned.`,
);
await write(docsPath, docs);

console.log("One-time ordinary control-state foundation migration applied idempotently.");
