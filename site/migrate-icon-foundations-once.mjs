import { readFile, writeFile } from "node:fs/promises";

const read = async (url) => String(await readFile(url, "utf8")).replace(/\r\n?/g, "\n");
const write = async (url, source) => writeFile(url, source, "utf8");
const replaceExact = (source, label, from, to) => {
  if (source.includes(to)) return source;
  const count = source.split(from).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one source match, found ${count}.`);
  return source.replace(from, to);
};

const stylesPath = new URL("./styles-base.css", import.meta.url);
let styles = await read(stylesPath);
styles = replaceExact(
  styles,
  "Base navigation icon",
  `.navEmoji {\n  display: grid;\n  place-items: center;\n  align-self: center;\n  justify-self: center;\n  width: 18px;\n  height: 18px;`,
  `.navEmoji {\n  display: grid;\n  place-items: center;\n  align-self: center;\n  justify-self: center;\n  width: var(--mfl-icon-size-navigation);\n  height: var(--mfl-icon-size-navigation);`,
);
await write(stylesPath, styles);

const controlsPath = new URL("./controls.css", import.meta.url);
let controls = await read(controlsPath);
controls = replaceExact(
  controls,
  "Sidebar navigation icon",
  `#sidebar .navEmoji {\n  flex: 0 0 18px;\n  width: 18px;\n  min-width: 18px;\n  max-width: 18px;\n  height: 18px;\n  min-height: 18px;\n  max-height: 18px;\n  color: inherit;\n  font-size: 18px;\n  line-height: 18px;\n}`,
  `#sidebar .navEmoji {\n  flex: 0 0 var(--mfl-icon-size-navigation);\n  width: var(--mfl-icon-size-navigation);\n  min-width: var(--mfl-icon-size-navigation);\n  max-width: var(--mfl-icon-size-navigation);\n  height: var(--mfl-icon-size-navigation);\n  min-height: var(--mfl-icon-size-navigation);\n  max-height: var(--mfl-icon-size-navigation);\n  color: inherit;\n  font-size: var(--mfl-icon-size-navigation);\n  line-height: var(--mfl-icon-size-navigation);\n}`,
);
controls = replaceExact(
  controls,
  "Sidebar jersey icon",
  `#sidebar .navJerseyIcon {\n  width: 18px;\n  height: 18px;`,
  `#sidebar .navJerseyIcon {\n  width: var(--mfl-icon-size-navigation);\n  height: var(--mfl-icon-size-navigation);`,
);
controls = replaceExact(
  controls,
  "Search control icon",
  `.searchButton .searchIcon {\n  display: block;\n  flex: 0 0 17px;\n  width: 17px;\n  height: 17px;`,
  `.searchButton .searchIcon {\n  display: block;\n  flex: 0 0 var(--mfl-icon-size-control);\n  width: var(--mfl-icon-size-control);\n  height: var(--mfl-icon-size-control);`,
);
controls = replaceExact(
  controls,
  "Filters control icon",
  `.filtersViewIcon {\n  flex: 0 0 17px;\n  align-self: center;\n  width: 17px;\n  height: 17px;`,
  `.filtersViewIcon {\n  flex: 0 0 var(--mfl-icon-size-control);\n  align-self: center;\n  width: var(--mfl-icon-size-control);\n  height: var(--mfl-icon-size-control);`,
);
await write(controlsPath, controls);

const chromePath = new URL("./responsive-sources/chrome-tablet.css.inc", import.meta.url);
let chrome = await read(chromePath);
chrome = replaceExact(
  chrome,
  "Mobile navigation icon",
  `.menuRail .navButton .navEmoji {\n    flex: 0 0 18px;\n    width: 18px;\n    height: 18px;\n    color: inherit;\n    font-size: 18px;`,
  `.menuRail .navButton .navEmoji {\n    flex: 0 0 var(--mfl-icon-size-navigation);\n    width: var(--mfl-icon-size-navigation);\n    height: var(--mfl-icon-size-navigation);\n    color: inherit;\n    font-size: var(--mfl-icon-size-navigation);`,
);
await write(chromePath, chrome);

const sidebarValidatorPath = new URL("./validate-sidebar-lifecycle-ownership.mjs", import.meta.url);
let sidebarValidator = await read(sidebarValidatorPath);
sidebarValidator = replaceExact(
  sidebarValidator,
  "Sidebar icon validator",
  `.navEmoji {\\n  display: grid;\\n  place-items: center;\\n  align-self: center;\\n  justify-self: center;\\n  width: 18px;\\n  height: 18px;`,
  `.navEmoji {\\n  display: grid;\\n  place-items: center;\\n  align-self: center;\\n  justify-self: center;\\n  width: var(--mfl-icon-size-navigation);\\n  height: var(--mfl-icon-size-navigation);`,
);
sidebarValidator = sidebarValidator.replace(
  "Sidebar icons must use a fixed centered 18px cell instead of intrinsic SVG height.",
  "Sidebar icons must use the shared fixed centered navigation-icon cell instead of intrinsic SVG height.",
);
await write(sidebarValidatorPath, sidebarValidator);

const chromeValidatorPath = new URL("./validation/responsive-chrome.mjs", import.meta.url);
let chromeValidator = await read(chromeValidatorPath);
chromeValidator = replaceExact(
  chromeValidator,
  "Responsive navigation icon validator",
  `.menuRail .navButton .navEmoji {\\n    flex: 0 0 18px;\\n    width: 18px;\\n    height: 18px;`,
  `.menuRail .navButton .navEmoji {\\n    flex: 0 0 var(--mfl-icon-size-navigation);\\n    width: var(--mfl-icon-size-navigation);\\n    height: var(--mfl-icon-size-navigation);`,
);
await write(chromeValidatorPath, chromeValidator);

const foundationValidatorPath = new URL("./validate-ui-foundations.mjs", import.meta.url);
let foundationValidator = await read(foundationValidatorPath);
foundationValidator = replaceExact(
  foundationValidator,
  "Icon foundation token validation",
  `  "--mfl-radius-checkbox: 4px;",\n  "--mfl-page-gutter-inline: 28px;",`,
  `  "--mfl-radius-checkbox: 4px;",\n  "--mfl-icon-size-navigation: 18px;",\n  "--mfl-icon-size-control: 17px;",\n  "--mfl-page-gutter-inline: 28px;",`,
);
foundationValidator = replaceExact(
  foundationValidator,
  "Icon foundation consumer validation",
  `includes(stacking, '@import url("/ui-foundations.css");', "Global UI foundations must load before shared stacking/base styles.");\n`,
  `includes(stacking, '@import url("/ui-foundations.css");', "Global UI foundations must load before shared stacking/base styles.");\n\nincludes(stylesBase, ".navEmoji {\\n  display: grid;\\n  place-items: center;\\n  align-self: center;\\n  justify-self: center;\\n  width: var(--mfl-icon-size-navigation);\\n  height: var(--mfl-icon-size-navigation);", "Shared navigation icons must consume the navigation-icon foundation.");\nfor (const token of [\n  "#sidebar .navEmoji {\\n  flex: 0 0 var(--mfl-icon-size-navigation);\\n  width: var(--mfl-icon-size-navigation);",\n  "#sidebar .navJerseyIcon {\\n  width: var(--mfl-icon-size-navigation);\\n  height: var(--mfl-icon-size-navigation);",\n  ".searchButton .searchIcon {\\n  display: block;\\n  flex: 0 0 var(--mfl-icon-size-control);\\n  width: var(--mfl-icon-size-control);\\n  height: var(--mfl-icon-size-control);",\n  ".filtersViewIcon {\\n  flex: 0 0 var(--mfl-icon-size-control);\\n  align-self: center;\\n  width: var(--mfl-icon-size-control);\\n  height: var(--mfl-icon-size-control);",\n]) {\n  includes(controls, token, \`Equivalent ordinary UI icons must consume the shared semantic icon-size foundation: ${token}\`);\n}\nincludes(stylesBase, ".advancedSettingsIcon {\\n  flex: 0 0 16px;\\n  width: 16px;\\n  height: 16px;", "Advanced Settings icon geometry must remain specialist-owned.");\nincludes(dropdowns, ".accountButtonIcon {\\n  flex: 0 0 auto;\\n  width: 18px;\\n  height: 18px;", "Account icon geometry must remain Account-owned despite matching the navigation size numerically on desktop.");\n`,
);
foundationValidator = foundationValidator.replace(
  "Global UI foundations validation passed with semantic page layout/title/rhythm, section-title, content-panel, keyboard-focus, metadata, helper/status feedback, destructive/error, and dialog ownership contracts.",
  "Global UI foundations validation passed with semantic icon sizing, page layout/title/rhythm, section-title, content-panel, keyboard-focus, metadata, helper/status feedback, destructive/error, and dialog ownership contracts.",
);
await write(foundationValidatorPath, foundationValidator);

const docsPath = new URL("../docs/ui-foundations.md", import.meta.url);
let docs = await read(docsPath);
docs = replaceExact(
  docs,
  "Icon foundation documentation",
  `## Controls\n\nCross-site semantic values live in \`ui-foundations.css\`:\n`,
  `## Icons\n\nOnly equivalent semantic icon roles share dimensions:\n\n- Navigation icon size: \`18px\` (\`--mfl-icon-size-navigation\`)\n- Ordinary control icon size: \`17px\` (\`--mfl-icon-size-control\`)\n\nThe navigation token covers the sidebar/mobile navigation icon cell and its equivalent jersey glyph. The ordinary control token covers Search and Filters icons. Advanced Settings, Account, Evaluation, Player Note/Listing, table actions/markers, branding/social icons, flags, avatars, and game-state/data icons remain specialist-owned even when a numeric size happens to match.\n\nThere is intentionally no generic numeric icon scale: new icons should join one of these roles only when their semantic/geometry contract genuinely matches.\n\n## Controls\n\nCross-site semantic values live in \`ui-foundations.css\`:\n`,
);
docs = replaceExact(
  docs,
  "Icon normalization documentation",
  `9. Repeated small-label and secondary metadata roles consume the shared 12px/11px metadata scale with 700/800 weight variants.\n10. Ordinary helper/status feedback uses a narrow shared 12px / 1.25 contract, with soft 400-weight status text and danger-derived 700-weight error text; search hints, empty/loading states, table states, and Player/Evaluation data messages remain specialist-owned.`,
  `9. Repeated small-label and secondary metadata roles consume the shared 12px/11px metadata scale with 700/800 weight variants.\n10. Ordinary helper/status feedback uses a narrow shared 12px / 1.25 contract, with soft 400-weight status text and danger-derived 700-weight error text; search hints, empty/loading states, table states, and Player/Evaluation data messages remain specialist-owned.\n11. Sidebar/mobile navigation icons consume the shared 18px navigation-icon contract, while Search and Filters consume the shared 17px ordinary-control icon contract; numerically similar specialist icons remain locally owned.`,
);
docs = replaceExact(
  docs,
  "Icon exception documentation",
  `- normal controls and tiny steppers/table actions\n- content-panel, control, dialog/popover, table, Player/Evaluation, and pill radii`,
  `- normal controls and tiny steppers/table actions\n- shared navigation/control icons and specialist Account/Evaluation/Player/table/branding/data icons\n- content-panel, control, dialog/popover, table, Player/Evaluation, and pill radii`,
);
await write(docsPath, docs);

console.log("One-time semantic icon foundation migration applied idempotently.");
