import { readFile, writeFile } from "node:fs/promises";

const path = new URL("./validate-css-ownership-consolidation.mjs", import.meta.url);
let source = String(await readFile(path, "utf8")).replace(/\r\n?/g, "\n");

const from = `const canonicalHoverSelector = \`:is(\n  .themeButton,\n  .navButton,\n  .viewButton:not([hidden]),\n  .filtersViewButton,\n  .mflStatsFilterButton,\n  .mflStatsDistributionModeButton,\n  .playerAttributeViewButton\n):not(.active):hover:not(:disabled)\`;\nconst canonicalHoverRule = exactRule(controls, canonicalHoverSelector);\ninvariant(canonicalHoverRule, "controls.css must retain the canonical shared hover-control rule, including the theme toggle.");\nfor (const required of ["border-color: var(--primary-hover);", "background: var(--row-hover);"]) {\n  invariant(canonicalHoverRule.includes(required), \`controls.css shared hover-control rule is missing \${required}\`);\n}`;

const to = `const ordinaryHoverSelector = \`:is(\n  .viewButton:not([hidden]),\n  .filtersViewButton\n):not(.active):hover:not(:disabled)\`;\nconst ordinaryHoverRule = exactRule(controls, ordinaryHoverSelector);\ninvariant(ordinaryHoverRule, "controls.css must retain the canonical ordinary View/Filters hover-control rule.");\nfor (const required of [\n  "border-color: var(--mfl-control-hover-border-color);",\n  "background: var(--mfl-control-hover-background);",\n  "color: var(--mfl-control-hover-text-color);",\n]) {\n  invariant(ordinaryHoverRule.includes(required), \`controls.css ordinary hover-control rule is missing \${required}\`);\n}\n\nconst specialistHoverSelector = \`:is(\n  .themeButton,\n  .navButton,\n  .mflStatsFilterButton,\n  .mflStatsDistributionModeButton,\n  .playerAttributeViewButton\n):not(.active):hover:not(:disabled)\`;\nconst specialistHoverRule = exactRule(controls, specialistHoverSelector);\ninvariant(specialistHoverRule, "controls.css must retain the specialist Theme/Nav/Stats/Player hover-control rule.");\nfor (const required of ["border-color: var(--primary-hover);", "background: var(--row-hover);", "color: var(--text);"]) {\n  invariant(specialistHoverRule.includes(required), \`controls.css specialist hover-control rule is missing \${required}\`);\n}\ninvariant(!specialistHoverRule.includes("var(--mfl-control-hover-"), "Specialist hover-control states must remain independently owned.");`;

if (!source.includes(to)) {
  const count = source.split(from).length - 1;
  if (count !== 1) throw new Error(`Expected one legacy hover ownership block, found ${count}.`);
  source = source.replace(from, to);
  await writeFile(path, source, "utf8");
}

console.log("One-time control-state ownership validator migration applied idempotently.");
