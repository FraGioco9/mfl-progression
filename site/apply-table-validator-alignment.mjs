import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const siteRoot = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(siteRoot, "..");
const read = (path) => readFileSync(resolve(repoRoot, path), "utf8").replace(/\r\n?/g, "\n");
const write = (path, source) => writeFileSync(resolve(repoRoot, path), source, "utf8");

function replaceOnce(path, before, after) {
  const source = read(path);
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`${path}: expected source not found:\n${before}`);
  if (source.indexOf(before, first + before.length) >= 0) throw new Error(`${path}: source is ambiguous:\n${before}`);
  write(path, source.slice(0, first) + after + source.slice(first + before.length));
}

replaceOnce(
  "site/validate-ui-foundations.mjs",
  `includes(stylesBase, ".tableShell {\\n  position: relative;\\n  background: var(--surface);\\n  border: 1px solid var(--border);\\n  border-radius: 8px;", "Table radius must remain table-owned rather than consuming the generic panel radius.");`,
  `includes(styles, "--mfl-table-radius: 8px;", "Table radius must remain table-owned rather than consuming the generic panel radius.");\nincludes(stylesBase, ".tableShell {\\n  position: relative;\\n  background: var(--mfl-table-surface);\\n  border: 1px solid var(--mfl-table-border-color);\\n  border-radius: var(--mfl-table-radius);", "Table shell must consume the Table-domain surface/border/radius contract rather than generic panel foundations.");`,
);

replaceOnce(
  "site/validate-mobile-sticky-name-column.mjs",
  `"#progressionPage .playerTableScroller th.col-name {\\n    z-index: 6;\\n    background: var(--header-bg);",`,
  `"#progressionPage .playerTableScroller th.col-name {\\n    z-index: 6;\\n    background: var(--mfl-table-header-background);",`,
);
replaceOnce(
  "site/validate-mobile-sticky-name-column.mjs",
  `"z-index: 5;\\n    isolation: isolate;\\n    container-type: scroll-state;\\n    container-name: mfl-sticky-name;\\n    background: var(--surface);\\n    background-image: linear-gradient(var(--surface), var(--surface));\\n    background-clip: border-box;",`,
  `"z-index: 5;\\n    isolation: isolate;\\n    container-type: scroll-state;\\n    container-name: mfl-sticky-name;\\n    background: var(--mfl-table-surface);\\n    background-image: linear-gradient(var(--mfl-table-surface), var(--mfl-table-surface));\\n    background-clip: border-box;",`,
);
replaceOnce(
  "site/validate-mobile-sticky-name-column.mjs",
  `"background: var(--row-hover);\\n    background-image: linear-gradient(var(--row-hover), var(--row-hover));",`,
  `"background: var(--mfl-table-row-hover-background);\\n    background-image: linear-gradient(var(--mfl-table-row-hover-background), var(--mfl-table-row-hover-background));",`,
);

for (const tempPath of ["site/apply-table-validator-alignment.mjs", ".github/workflows/apply-table-validator-alignment.yml"]) {
  const absolute = resolve(repoRoot, tempPath);
  if (existsSync(absolute)) unlinkSync(absolute);
}

console.log("Aligned existing foundation and sticky-Name validators with the new Table-domain semantic ownership.");
