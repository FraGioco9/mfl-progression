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
  "site/responsive-sources/chrome-tablet.css.inc",
  `    box-shadow: 0 10px 28px rgba(0, 0, 0, 0.18);`,
  `    box-shadow: var(--mfl-shadow-mobile-navigation);`,
);

replaceOnce(
  "docs/ui-foundations.md",
  `## Dropdowns\n\n\`dropdowns.css\` remains the specialist owner:\n\n- Gap: \`8px\`\n- Picker radius: \`8px\`\n- Shadow: \`0 12px 36px rgba(0, 0, 0, 0.16)\`\n- Maximum height: \`min(320px, calc(100vh - 16px))\`\n- Chevron inset: \`10px\`\n\nInline selectors such as the Evaluation position selector may intentionally use different geometry.`,
  `## Dropdown mechanics\n\n\`dropdowns.css\` remains the specialist mechanics owner:\n\n- Gap: \`8px\`\n- Maximum height: \`min(320px, calc(100vh - 16px))\`\n- Chevron inset: \`10px\`\n- Open/close positioning, native picker enhancement, and responsive/menu-specific geometry remain local to this owner.\n- Dropdown visual surface/radius/shadow values are foundation-owned and consumed by \`dropdowns.css\`; they are not mechanics literals.\n\nInline selectors such as the Evaluation position selector may intentionally use different geometry.`,
);

replaceOnce(
  "docs/ui-foundations.md",
  `- Mobile navigation surface shadow: \`0 10px 28px rgba(0, 0, 0, 0.18)\` (\`--mfl-shadow-mobile-navigation\`)`,
  `- Mobile navigation surface shadow: \`0 10px 28px rgba(0, 0, 0, 0.18)\` (\`--mfl-shadow-mobile-navigation\`), consumed by the canonical responsive mobile navigation rail`,
);

replaceOnce(
  "site/validate-domain-shared-ui.mjs",
  `  "validate-ui-foundations.mjs",\n  "validate-evaluation-mfl-usd-focus.mjs",`,
  `  "validate-ui-foundations.mjs",\n  "validate-shadow-foundations.mjs",\n  "validate-evaluation-mfl-usd-focus.mjs",`,
);

console.log("Applied shared shadow foundation consumption migration to canonical sources.");
