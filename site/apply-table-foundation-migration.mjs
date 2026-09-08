import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const siteRoot = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(siteRoot, "..");
const read = (path) => readFileSync(resolve(repoRoot, path), "utf8").replace(/\r\n?/g, "\n");
const write = (path, content) => writeFileSync(resolve(repoRoot, path), content, "utf8");

function replaceOnce(path, before, after) {
  const source = read(path);
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`${path}: expected source not found:\n${before}`);
  if (source.indexOf(before, first + before.length) >= 0) throw new Error(`${path}: source is ambiguous:\n${before}`);
  write(path, source.slice(0, first) + after + source.slice(first + before.length));
}

const replacements = {
  "site/styles.css": [
    [
      `:root {\n  --mfl-pager-block-padding: 12px;\n\n  /* Uniform Width. This is the only numeric column-width contract. */`,
      `:root {\n  --mfl-pager-block-padding: 12px;\n\n  /* Shared Table-domain visual language. Responsive geometry remains specialist-owned. */\n  --mfl-table-surface: var(--surface);\n  --mfl-table-border-color: var(--border);\n  --mfl-table-radius: 8px;\n  --mfl-table-header-background: var(--header-bg);\n  --mfl-table-header-text-color: var(--text);\n  --mfl-table-sort-hover-background: var(--surface-muted);\n  --mfl-table-row-hover-background: var(--row-hover);\n  --mfl-table-header-font-size: 12px;\n  --mfl-table-row-font-size: 14px;\n\n  /* Uniform Width. This is the only numeric column-width contract. */`,
    ],
    [
      `  #progressionPage .playerTableScroller th.col-name {\n    z-index: 6;\n    background: var(--header-bg);\n  }`,
      `  #progressionPage .playerTableScroller th.col-name {\n    z-index: 6;\n    background: var(--mfl-table-header-background);\n  }`,
    ],
    [
      `    background: var(--surface);\n    background-image: linear-gradient(var(--surface), var(--surface));\n    background-clip: border-box;`,
      `    background: var(--mfl-table-surface);\n    background-image: linear-gradient(var(--mfl-table-surface), var(--mfl-table-surface));\n    background-clip: border-box;`,
    ],
    [
      `    background: var(--row-hover);\n    background-image: linear-gradient(var(--row-hover), var(--row-hover));`,
      `    background: var(--mfl-table-row-hover-background);\n    background-image: linear-gradient(var(--mfl-table-row-hover-background), var(--mfl-table-row-hover-background));`,
    ],
  ],
  "site/styles-base.css": [
    [
      `.advancedPlayerTable {\n  position: relative;\n  z-index: 1;\n  overflow: visible;\n  border: 1px solid var(--border);\n  border-radius: 8px;\n  border-collapse: separate;\n  border-spacing: 0;\n  background: var(--surface);\n  font-size: 12px;\n  isolation: isolate;\n}`,
      `.advancedPlayerTable {\n  position: relative;\n  z-index: 1;\n  overflow: visible;\n  border: 1px solid var(--mfl-table-border-color);\n  border-radius: var(--mfl-table-radius);\n  border-collapse: separate;\n  border-spacing: 0;\n  background: var(--mfl-table-surface);\n  font-size: 12px;\n  isolation: isolate;\n}`,
    ],
    [
      `.advancedPlayerTable th,\n.advancedPlayerTable td {\n  height: 32px;\n  vertical-align: middle;\n  padding: 4px 5px;\n  border-bottom: 1px solid var(--border);`,
      `.advancedPlayerTable th,\n.advancedPlayerTable td {\n  height: 32px;\n  vertical-align: middle;\n  padding: 4px 5px;\n  border-bottom: 1px solid var(--mfl-table-border-color);`,
    ],
    [
      `.advancedPlayerTable thead {\n  position: sticky;\n  top: 0;\n  z-index: 30;\n  background: var(--header-bg);\n}`,
      `.advancedPlayerTable thead {\n  position: sticky;\n  top: 0;\n  z-index: 30;\n  background: var(--mfl-table-header-background);\n}`,
    ],
    [
      `  background: var(--header-bg);\n  border-bottom: 1px solid var(--border);\n  pointer-events: none;`,
      `  background: var(--mfl-table-header-background);\n  border-bottom: 1px solid var(--mfl-table-border-color);\n  pointer-events: none;`,
    ],
    [`.advancedPlayerTable thead tr {\n  background: var(--header-bg);\n}`, `.advancedPlayerTable thead tr {\n  background: var(--mfl-table-header-background);\n}`],
    [
      `.advancedPlayerTable th {\n  background: var(--header-bg);\n  color: var(--text);\n  font-size: inherit;`,
      `.advancedPlayerTable th {\n  background: var(--mfl-table-header-background);\n  color: var(--mfl-table-header-text-color);\n  font-size: inherit;`,
    ],
    [`.advancedPlayerTable tbody th {\n  border-bottom-color: var(--header-bg);\n}`, `.advancedPlayerTable tbody th {\n  border-bottom-color: var(--mfl-table-header-background);\n}`],
    [`.advancedPlayerTable tbody tr:hover th {\n  background: var(--header-bg);\n}`, `.advancedPlayerTable tbody tr:hover th {\n  background: var(--mfl-table-header-background);\n}`],
    [
      `.tableShell {\n  position: relative;\n  background: var(--surface);\n  border: 1px solid var(--border);\n  border-radius: 8px;\n  overflow: hidden;\n}`,
      `.tableShell {\n  position: relative;\n  background: var(--mfl-table-surface);\n  border: 1px solid var(--mfl-table-border-color);\n  border-radius: var(--mfl-table-radius);\n  overflow: hidden;\n}`,
    ],
    [
      `  border-bottom: 1px solid var(--border);\n  padding: 0 6px;\n  text-align: left;`,
      `  border-bottom: 1px solid var(--mfl-table-border-color);\n  padding: 0 6px;\n  text-align: left;`,
    ],
    [`td {\n  font-size: 14px;\n}`, `td {\n  font-size: var(--mfl-table-row-font-size);\n}`],
    [
      `th {\n  background: var(--header-bg);\n  color: var(--text);\n  font-size: 12px;\n  text-transform: uppercase;`,
      `th {\n  background: var(--mfl-table-header-background);\n  color: var(--mfl-table-header-text-color);\n  font-size: var(--mfl-table-header-font-size);\n  text-transform: uppercase;`,
    ],
    [`th.sortable:hover {\n  background: var(--surface-muted);\n}`, `th.sortable:hover {\n  background: var(--mfl-table-sort-hover-background);\n}`],
    [
      `#tableBody tr.tableRowHovered > td,\n#tableBody tr.tableRowHovered > th {\n  background: var(--row-hover);\n  background-image: linear-gradient(var(--row-hover), var(--row-hover));\n}`,
      `#tableBody tr.tableRowHovered > td,\n#tableBody tr.tableRowHovered > th {\n  background: var(--mfl-table-row-hover-background);\n  background-image: linear-gradient(var(--mfl-table-row-hover-background), var(--mfl-table-row-hover-background));\n}`,
    ],
  ],
  "site/validate-table-header-typography.mjs": [
    [`const base = read("styles-base.css");\nconst responsive = read("responsive.css");`, `const base = read("styles-base.css");\nconst styles = read("styles.css");\nconst responsive = read("responsive.css");`],
    [
      `assert.ok(\n  base.includes("th {\\n  background: var(--header-bg);\\n  color: var(--text);\\n  font-size: 12px;")\n    && base.includes("td {\\n  font-size: 14px;\\n}"),\n  "Shared desktop tables must keep 12px headers against 14px row text.",\n);`,
      `assert.ok(\n  styles.includes("--mfl-table-header-font-size: 12px;")\n    && styles.includes("--mfl-table-row-font-size: 14px;")\n    && base.includes("th {\\n  background: var(--mfl-table-header-background);\\n  color: var(--mfl-table-header-text-color);\\n  font-size: var(--mfl-table-header-font-size);")\n    && base.includes("td {\\n  font-size: var(--mfl-table-row-font-size);\\n}"),\n  "Shared desktop tables must consume the 12px header / 14px row Table-domain typography foundations.",\n);`,
    ],
    [
      `base.includes("background: var(--surface);\\n  font-size: 12px;\\n  isolation: isolate;")\n    && base.includes(".advancedPlayerTable th {\\n  background: var(--header-bg);\\n  color: var(--text);\\n  font-size: inherit;")`,
      `base.includes("background: var(--mfl-table-surface);\\n  font-size: 12px;\\n  isolation: isolate;")\n    && base.includes(".advancedPlayerTable th {\\n  background: var(--mfl-table-header-background);\\n  color: var(--mfl-table-header-text-color);\\n  font-size: inherit;")`,
    ],
  ],
  "site/validate-domain-table.mjs": [
    [`  "validate-table-column-layout.mjs",\n  "validate-table-progression-spacing.mjs",`, `  "validate-table-column-layout.mjs",\n  "validate-table-foundations.mjs",\n  "validate-table-progression-spacing.mjs",`],
  ],
  "docs/ui-foundations.md": [
    [`| Table geometry and Uniform Width | \`site/styles.css\` |`, `| Table visual foundations, geometry, and Uniform Width | \`site/styles.css\` |`],
    [
      `## Tables\n\nUniform Width remains the only numeric player-table column-width contract.\n\n- Header height: \`38px\`\n- Body row height: \`34px\`\n- Outer row pitch: \`39px\`\n- Column percentages remain owned by the \`--mfl-table-col-*\` variables\n- Responsive table geometry may scale at its existing breakpoints`,
      `## Tables\n\nTable visual foundations are specialist Table-domain contracts owned by \`site/styles.css\`; they do not collapse tables into the ordinary panel/control surface language.\n\n- Table surface: \`var(--surface)\` (\`--mfl-table-surface\`)\n- Table border/divider color: \`var(--border)\` (\`--mfl-table-border-color\`)\n- Table radius: \`8px\` (\`--mfl-table-radius\`)\n- Header background/text: \`var(--header-bg)\` / \`var(--text)\` (\`--mfl-table-header-background\` / \`--mfl-table-header-text-color\`)\n- Sortable-header hover background: \`var(--surface-muted)\` (\`--mfl-table-sort-hover-background\`)\n- Row-hover background: \`var(--row-hover)\` (\`--mfl-table-row-hover-background\`)\n- Standard desktop header/body typography: \`12px\` / \`14px\` (\`--mfl-table-header-font-size\` / \`--mfl-table-row-font-size\`)\n\nThe shared player table and equivalent Advanced Settings surface/header/divider roles consume these foundations. Advanced Settings retains its smaller row/header typography, sticky cells, and Contracts-cell hover behavior. Mobile sticky Name cells reuse the same table surface/header/row-hover tokens while retaining their stronger stuck separator and responsive geometry.\n\nUniform Width remains the only numeric player-table column-width contract.\n\n- Header height: \`38px\`\n- Body row height: \`34px\`\n- Outer row pitch: \`39px\`\n- Column percentages remain owned by the \`--mfl-table-col-*\` variables\n- Responsive table typography and geometry remain in the responsive owner and may scale at the existing breakpoints\n- Evaluation-specific geometry, loading surfaces, table action controls, sticky mechanics, and specialist cell states remain domain-owned`,
    ],
    [
      `14. View, Filters, Search, and refresh-first-paint View controls consume shared ordinary resting/hover surface-state contracts, while navigation, Stats, Player, dropdown, destructive, opt-in, and other specialist states remain locally owned.`,
      `14. View, Filters, Search, and refresh-first-paint View controls consume shared ordinary resting/hover surface-state contracts, while navigation, Stats, Player, dropdown, destructive, opt-in, and other specialist states remain locally owned.\n15. Equivalent table surfaces, headers, dividers, sortable-header hover, row hover, and standard desktop table typography consume Table-domain semantic foundations from \`styles.css\`; Uniform Width, responsive geometry, Advanced Settings specialist interactions, Evaluation geometry, loading surfaces, and table action controls keep their existing owners.`,
    ],
  ],
};

for (const [path, pairs] of Object.entries(replacements)) {
  for (const [before, after] of pairs) replaceOnce(path, before, after);
}

for (const tempPath of ["site/apply-table-foundation-migration.mjs", ".github/workflows/apply-table-foundation-migration.yml"]) {
  const absolute = resolve(repoRoot, tempPath);
  if (existsSync(absolute)) unlinkSync(absolute);
}

console.log("Applied shared table foundation migration and removed temporary migration files.");
