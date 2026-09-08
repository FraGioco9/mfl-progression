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
  "site/styles.css",
  `  border: 1px solid var(--border-strong);\n  border-radius: var(--mfl-radius-dialog);\n  background: var(--surface);\n  color: var(--text);\n  box-shadow: var(--mfl-dropdown-shadow);`,
  `  border: var(--mfl-dropdown-border);\n  border-radius: var(--mfl-radius-dropdown);\n  background: var(--mfl-dropdown-background);\n  color: var(--mfl-dropdown-text-color);\n  box-shadow: var(--mfl-shadow-dropdown);`,
);

replaceOnce(
  "site/validate-database-stats-lazy-runtime.mjs",
  `  "border: 1px solid var(--border-strong);",\n  "border-radius: var(--mfl-radius-dialog);",\n  "box-shadow: var(--mfl-dropdown-shadow);",`,
  `  "border: var(--mfl-dropdown-border);",\n  "border-radius: var(--mfl-radius-dropdown);",\n  "background: var(--mfl-dropdown-background);",\n  "color: var(--mfl-dropdown-text-color);",\n  "box-shadow: var(--mfl-shadow-dropdown);",`,
);

replaceOnce(
  "site/responsive-sources/evaluation-phone.css.inc",
  `    max-height: calc(100dvh - 16px - env(safe-area-inset-top) - env(safe-area-inset-bottom));\n    border-radius: 8px;`,
  `    max-height: calc(100dvh - 16px - env(safe-area-inset-top) - env(safe-area-inset-bottom));`,
);

replaceOnce(
  "docs/ui-foundations.md",
  `- Watchlist active rows/actions, Account wallet semantic colors, destructive items, Player action geometry/icons, and Database Stats Custom layout remain specialist-owned.`,
  `- Watchlist active rows/actions, Account wallet semantic colors, destructive items, Player action geometry/icons, and Database Stats Custom layout remain specialist-owned.\n- Database Stats Custom keeps specialist layout/positioning while its ordinary menu shell consumes the shared dropdown visual foundations.`,
);

replaceOnce(
  "docs/ui-foundations.md",
  `- Search, Filters, saved Evaluation, Watchlist chooser/add/delete, Advanced Settings, and Bug Report consume those generic structural classes while retaining their domain-specific widths, bodies, controls, and responsive geometry.`,
  `- Search, Filters, saved Evaluation, Watchlist chooser/add/delete, Advanced Settings, and Bug Report consume those generic structural classes while retaining their domain-specific widths, bodies, controls, and responsive geometry.\n- Responsive dialog owners may change dimensions but must not re-declare the shared dialog shell radius/surface/border/shadow.`,
);

replaceOnce(
  "docs/ui-foundations.md",
  `15. Equivalent table surfaces, headers, dividers, sortable-header hover, row hover, and standard desktop table typography consume Table-domain semantic foundations from \`styles.css\`; Uniform Width, responsive geometry, Advanced Settings specialist interactions, Evaluation geometry, loading surfaces, and table action controls keep their existing owners.\n\n## What must remain intentionally separate`,
  `15. Equivalent table surfaces, headers, dividers, sortable-header hover, row hover, and standard desktop table typography consume Table-domain semantic foundations from \`styles.css\`; Uniform Width, responsive geometry, Advanced Settings specialist interactions, Evaluation geometry, loading surfaces, and table action controls keep their existing owners.\n16. Ordinary modal/dialog shells consume shared backdrop, surface, border/divider, radius, and shadow foundations; responsive owners keep dimensions and layout only.\n17. Ordinary dropdown/menu shells and option states consume shared dropdown visual foundations while \`dropdowns.css\` keeps mechanics and specialist menu geometry.\n18. Tooltip, dropdown, modal, and mobile-navigation shadows each have one semantic source and canonical consumer.\n19. The final ownership audit removes retired semantic-token references and rejects responsive re-ownership of shared dialog visuals.\n\n## What must remain intentionally separate`,
);

replaceOnce(
  "site/validate-domain-shared-ui.mjs",
  `  "validate-shadow-foundations.mjs",\n  "validate-evaluation-mfl-usd-focus.mjs",`,
  `  "validate-shadow-foundations.mjs",\n  "validate-ui-foundations-final-audit.mjs",\n  "validate-evaluation-mfl-usd-focus.mjs",`,
);

console.log("Applied final UI foundations ownership audit migration.");
