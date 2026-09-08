import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const siteRoot = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(siteRoot, "..");
const read = (path) => String(readFileSync(resolve(repoRoot, path), "utf8")).replace(/\r\n?/g, "\n");
const write = (path, content) => writeFileSync(resolve(repoRoot, path), content, "utf8");

function replaceOnce(path, before, after) {
  const source = read(path);
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`${path}: expected source not found:\n${before}`);
  if (source.indexOf(before, first + before.length) >= 0) throw new Error(`${path}: source is ambiguous:\n${before}`);
  write(path, source.slice(0, first) + after + source.slice(first + before.length));
}

replaceOnce(
  "site/ui-foundations.css",
  ` * - dropdown mechanics: dropdowns.css`,
  ` * - dropdown mechanics/geometry: dropdowns.css`,
);

replaceOnce(
  "site/ui-foundations.css",
  `  --mfl-panel-border-strong: 1px solid var(--border-strong);\n  --mfl-radius-panel: 8px;\n\n  /* Shared ordinary modal/dialog language. */`,
  `  --mfl-panel-border-strong: 1px solid var(--border-strong);\n  --mfl-radius-panel: 8px;\n\n  /* Shared ordinary dropdown/menu visual language. */\n  --mfl-dropdown-background: var(--surface);\n  --mfl-dropdown-border: 1px solid var(--border-strong);\n  --mfl-dropdown-text-color: var(--text);\n  --mfl-radius-dropdown: 8px;\n  --mfl-shadow-dropdown: 0 12px 36px rgba(0, 0, 0, 0.16);\n  --mfl-dropdown-option-background: transparent;\n  --mfl-dropdown-option-text-color: var(--text);\n  --mfl-radius-dropdown-option: 6px;\n  --mfl-dropdown-option-hover-border-color: var(--border);\n  --mfl-dropdown-option-hover-background: var(--row-hover);\n  --mfl-dropdown-option-hover-text-color: var(--text);\n  --mfl-dropdown-option-selected-background: color-mix(in srgb, var(--primary) 12%, var(--surface));\n  --mfl-dropdown-option-selected-text-color: var(--primary);\n\n  /* Shared ordinary modal/dialog language. */`,
);

replaceOnce(
  "site/dropdowns.css",
  `:root {\n  --mfl-dropdown-gap: 8px;\n  --mfl-dropdown-shadow: 0 12px 36px rgba(0, 0, 0, 0.16);`,
  `:root {\n  --mfl-dropdown-gap: 8px;`,
);

replaceOnce(
  "site/dropdowns.css",
  `    border: 1px solid var(--border-strong);\n    border-radius: 8px;\n    background: var(--surface);\n    color: var(--text);\n    box-shadow: var(--mfl-dropdown-shadow);`,
  `    border: var(--mfl-dropdown-border);\n    border-radius: var(--mfl-radius-dropdown);\n    background: var(--mfl-dropdown-background);\n    color: var(--mfl-dropdown-text-color);\n    box-shadow: var(--mfl-shadow-dropdown);`,
);

replaceOnce(
  "site/dropdowns.css",
  `    border-radius: 6px;\n    background: transparent;\n    color: var(--text);\n    font: inherit;\n    font-weight: 600;`,
  `    border-radius: var(--mfl-radius-dropdown-option);\n    background: var(--mfl-dropdown-option-background);\n    color: var(--mfl-dropdown-option-text-color);\n    font: inherit;\n    font-weight: 600;`,
);

replaceOnce(
  "site/dropdowns.css",
  `    outline: 0;\n    background: var(--row-hover);\n    color: var(--text);`,
  `    outline: 0;\n    background: var(--mfl-dropdown-option-hover-background);\n    color: var(--mfl-dropdown-option-hover-text-color);`,
);

replaceOnce(
  "site/dropdowns.css",
  `    outline: 0;\n    border-color: var(--border);\n    background: var(--row-hover);\n    color: var(--text);`,
  `    outline: 0;\n    border-color: var(--mfl-dropdown-option-hover-border-color);\n    background: var(--mfl-dropdown-option-hover-background);\n    color: var(--mfl-dropdown-option-hover-text-color);`,
);

replaceOnce(
  "site/dropdowns.css",
  `    background: color-mix(in srgb, var(--primary) 12%, var(--surface));\n    color: var(--primary);`,
  `    background: var(--mfl-dropdown-option-selected-background);\n    color: var(--mfl-dropdown-option-selected-text-color);`,
);

replaceOnce(
  "site/dropdowns.css",
  `  border: 1px solid var(--border-strong);\n  border-radius: 8px;\n  background: var(--surface);\n  color: var(--text);\n  box-shadow: var(--mfl-dropdown-shadow);`,
  `  border: var(--mfl-dropdown-border);\n  border-radius: var(--mfl-radius-dropdown);\n  background: var(--mfl-dropdown-background);\n  color: var(--mfl-dropdown-text-color);\n  box-shadow: var(--mfl-shadow-dropdown);`,
);

replaceOnce(
  "site/dropdowns.css",
  `  border: 0;\n  border-radius: 6px;\n  background: transparent;\n  color: var(--text);\n  font: inherit;`,
  `  border: 0;\n  border-radius: var(--mfl-radius-dropdown-option);\n  background: var(--mfl-dropdown-option-background);\n  color: var(--mfl-dropdown-option-text-color);\n  font: inherit;`,
);

replaceOnce(
  "site/dropdowns.css",
  `  border-color: var(--border);\n  outline: 0;\n  background: var(--row-hover);\n  color: var(--text);\n  box-shadow: none;`,
  `  border-color: var(--mfl-dropdown-option-hover-border-color);\n  outline: 0;\n  background: var(--mfl-dropdown-option-hover-background);\n  color: var(--mfl-dropdown-option-hover-text-color);\n  box-shadow: none;`,
);

replaceOnce(
  "site/dropdowns.css",
  `.playerTableActionItem:hover:not(:disabled),\n.playerTableActionItem:focus-visible:not(:disabled) {\n  outline: 0;\n  border-color: var(--border);\n  background: var(--row-hover);\n  color: var(--text);`,
  `.playerTableActionItem:hover:not(:disabled),\n.playerTableActionItem:focus-visible:not(:disabled) {\n  outline: 0;\n  border-color: var(--mfl-dropdown-option-hover-border-color);\n  background: var(--mfl-dropdown-option-hover-background);\n  color: var(--mfl-dropdown-option-hover-text-color);`,
);

replaceOnce(
  "docs/ui-foundations.md",
  `## Dialogs and overlays`,
  `## Dropdowns and menus\n\n- Ordinary dropdown/menu surface: \`var(--surface)\` (\`--mfl-dropdown-background\`)\n- Ordinary dropdown/menu border: \`1px solid var(--border-strong)\` (\`--mfl-dropdown-border\`)\n- Ordinary dropdown/menu radius: \`8px\` (\`--mfl-radius-dropdown\`)\n- Ordinary dropdown/menu shadow: \`0 12px 36px rgba(0, 0, 0, 0.16)\` (\`--mfl-shadow-dropdown\`)\n- Ordinary option radius: \`6px\` (\`--mfl-radius-dropdown-option\`)\n- Ordinary option rest/hover/selected colors are semantic foundation tokens; enhanced native pickers and generic custom menus consume them where their visual role matches.\n- \`dropdowns.css\` remains the sole owner of dropdown mechanics: positioning, gaps, max-height, z-index, chevrons, transitions, native picker enhancement, and responsive/menu-specific geometry.\n- Watchlist active rows/actions, Account wallet semantic colors, destructive items, Player action geometry/icons, and Database Stats Custom layout remain specialist-owned.\n\n## Dialogs and overlays`,
);

replaceOnce(
  "site/validate-domain-shared-ui.mjs",
  `  "validate-dropdown-style-ownership.mjs",\n  "validate-dropdown-trigger-open-highlight.mjs",`,
  `  "validate-dropdown-style-ownership.mjs",\n  "validate-dropdown-foundations.mjs",\n  "validate-dropdown-trigger-open-highlight.mjs",`,
);

console.log("Applied shared dropdown/menu visual foundation migration to canonical sources.");
