import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const read = (path) => readFileSync(resolve(root, path), "utf8").replace(/\r\n?/g, "\n");
const write = (path, content) => writeFileSync(resolve(root, path), content, "utf8");

function replaceOnce(path, before, after) {
  const source = read(path);
  const index = source.indexOf(before);
  if (index < 0) throw new Error(`${path}: expected validator contract not found`);
  if (source.indexOf(before, index + before.length) >= 0) throw new Error(`${path}: validator contract is ambiguous`);
  write(path, source.slice(0, index) + after + source.slice(index + before.length));
}

replaceOnce(
  "validate-global-search-results.mjs",
  `invariant(\n  styles.includes(".searchDialog {\\n  display: flex;\\n  flex-direction: column;\\n  width: min(960px, calc(100vw - 32px));\\n  height: auto;")\n    && styles.includes(".searchBody {\\n  display: grid;\\n  gap: 12px;\\n  padding: 16px 18px 12px;"),\n  "Global Search popup must preserve the existing dialog geometry while both recent and typed results share one box layout.",\n);`,
  `invariant(\n  styles.includes(".mflDialog {\\n  display: flex;\\n  flex-direction: column;")\n    && styles.includes(".searchDialog {\\n  width: min(960px, calc(100vw - 32px));\\n  height: auto;")\n    && styles.includes(".searchBody {\\n  display: grid;\\n  gap: 12px;\\n  padding: 16px 18px 12px;"),\n  "Global Search popup must preserve the existing specialist geometry while consuming the shared dialog shell.",\n);`,
);

replaceOnce(
  "validate-z-index-ownership.mjs",
  `  "background: rgba(0, 0, 0, 0.45);",\n]) invariant(modalRule.includes(required), \`Original modal backdrop rendering must retain \${required}\`);`,
  `  "background: var(--mfl-modal-backdrop-background);",\n]) invariant(modalRule.includes(required), \`Modal backdrop rendering must retain its canonical stacking/surface contract: \${required}\`);`,
);

replaceOnce(
  "validate-evaluation-mobile-first-paint.mjs",
  `invariant(\n  loadDialogRule.includes("border-radius: 8px;")\n    && loadDialogRule.includes("background: var(--surface);")\n    && loadDialogRule.includes("background-clip: padding-box;")\n    && loadDialogRule.includes("overflow: hidden;")\n    && !stylesBase.includes(".evaluationLoadDialog,\\n.evaluationLoadList,\\n.evaluationLoadResult,\\n.evaluationLoadActions {\\n  overflow: visible;"),\n  "Evaluation Load dialog background must remain clipped to its rounded border while body-portaled action tooltips stay independent of dialog overflow.",\n);`,
  `const sharedDialogRuleStart = stylesBase.indexOf(".mflDialog {");\nconst sharedDialogRuleEnd = stylesBase.indexOf("\\n}", sharedDialogRuleStart);\nconst sharedDialogRule = sharedDialogRuleStart >= 0 && sharedDialogRuleEnd >= 0\n  ? stylesBase.slice(sharedDialogRuleStart, sharedDialogRuleEnd + 2)\n  : "";\ninvariant(\n  sharedDialogRule.includes("border-radius: var(--mfl-radius-dialog);")\n    && sharedDialogRule.includes("background: var(--mfl-dialog-background);")\n    && loadDialogRule.includes("background-clip: padding-box;")\n    && loadDialogRule.includes("overflow: hidden;")\n    && !stylesBase.includes(".evaluationLoadDialog,\\n.evaluationLoadList,\\n.evaluationLoadResult,\\n.evaluationLoadActions {\\n  overflow: visible;"),\n  "Evaluation Load dialog must inherit the shared rounded surface while preserving its specialist clipping and body-portaled tooltip behavior.",\n);`,
);

console.log("Aligned legacy geometry validators with shared dialog ownership.");
