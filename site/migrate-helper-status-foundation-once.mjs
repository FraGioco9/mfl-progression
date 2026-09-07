import { readFile, writeFile } from "node:fs/promises";

const read = async (path) => String(await readFile(path, "utf8")).replace(/\r\n?/g, "\n");
const write = async (path, source) => writeFile(path, source, "utf8");
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
  "Add Watchlist error feedback",
  `.addWatchlistError {\n  min-height: 18px;\n  margin: 6px 0 0;\n  color: var(--danger);\n  font-size: 12px;\n  font-weight: 700;\n}`,
  `.addWatchlistError {\n  min-height: 18px;\n  margin: 6px 0 0;\n  color: var(--mfl-helper-error-color);\n  font-size: var(--mfl-helper-text-font-size);\n  font-weight: var(--mfl-helper-error-font-weight);\n  line-height: var(--mfl-helper-text-line-height);\n}`,
);
await write(stylesPath, styles);

const validatorPath = new URL("./validate-ui-foundations.mjs", import.meta.url);
let validator = await read(validatorPath);
validator = replaceExact(
  validator,
  "Helper foundation token validation",
  `  "--mfl-metadata-line-height: 1.1;",\n  "--mfl-focus-ring-color: var(--primary);",`,
  `  "--mfl-metadata-line-height: 1.1;",\n  "--mfl-helper-text-font-size: 12px;",\n  "--mfl-helper-text-line-height: 1.25;",\n  "--mfl-helper-text-font-weight: 400;",\n  "--mfl-helper-error-font-weight: 700;",\n  "--mfl-helper-text-color: var(--text-soft);",\n  "--mfl-helper-error-color: var(--danger);",\n  "--mfl-focus-ring-color: var(--primary);",`,
);
validator = replaceExact(
  validator,
  "Add Watchlist helper consumer validation",
  `  ".addWatchlistError {\\n  min-height: 18px;\\n  margin: 6px 0 0;\\n  color: var(--danger);",`,
  `  ".addWatchlistError {\\n  min-height: 18px;\\n  margin: 6px 0 0;\\n  color: var(--mfl-helper-error-color);\\n  font-size: var(--mfl-helper-text-font-size);\\n  font-weight: var(--mfl-helper-error-font-weight);\\n  line-height: var(--mfl-helper-text-line-height);",`,
);
validator = replaceExact(
  validator,
  "Bug Report helper consumer validation",
  `includes(footer, ".bugReportStatus.isError {\\n  color: var(--danger);", "Bug Report error feedback must derive from --danger.");`,
  `includes(footer, ".bugReportStatus {\\n  min-height: 16px;\\n  margin: 0;\\n  color: var(--mfl-helper-text-color);\\n  font-size: var(--mfl-helper-text-font-size);\\n  font-weight: var(--mfl-helper-text-font-weight);\\n  line-height: var(--mfl-helper-text-line-height);", "Bug Report ordinary status feedback must consume the shared helper-text foundation.");\nincludes(footer, ".bugReportStatus.isError {\\n  color: var(--mfl-helper-error-color);\\n  font-weight: var(--mfl-helper-error-font-weight);", "Bug Report error feedback must consume the shared helper error foundation.");`,
);
validator = replaceExact(
  validator,
  "Helper documentation validation",
  `  "Standard metadata/small-label size: \`12px\` (\`--mfl-metadata-font-size\`)",\n  "Canonical ordinary content-panel radius: \`8px\` (\`--mfl-radius-panel\`)",`,
  `  "Standard metadata/small-label size: \`12px\` (\`--mfl-metadata-font-size\`)",\n  "Ordinary helper/status text size: \`12px\` (\`--mfl-helper-text-font-size\`)",\n  "Canonical ordinary content-panel radius: \`8px\` (\`--mfl-radius-panel\`)",`,
);
validator = validator.replace(
  "Global UI foundations validation passed with semantic page layout/title/rhythm, section-title, content-panel, keyboard-focus, metadata, destructive/error, and dialog ownership contracts.",
  "Global UI foundations validation passed with semantic page layout/title/rhythm, section-title, content-panel, keyboard-focus, metadata, helper/status feedback, destructive/error, and dialog ownership contracts.",
);
await write(validatorPath, validator);

console.log("One-time helper/status foundation migration applied idempotently.");
