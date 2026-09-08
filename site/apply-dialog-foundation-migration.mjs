import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const siteRoot = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(siteRoot, "..");
const normalize = (value) => String(value).replace(/\r\n?/g, "\n");
const read = (path) => normalize(readFileSync(resolve(repoRoot, path), "utf8"));
const write = (path, content) => writeFileSync(resolve(repoRoot, path), content, "utf8");

function replaceOnce(path, before, after) {
  const source = read(path);
  const first = source.indexOf(before);
  if (first < 0) throw new Error(`${path}: expected source not found:\n${before}`);
  if (source.indexOf(before, first + before.length) >= 0) throw new Error(`${path}: source is ambiguous:\n${before}`);
  write(path, source.slice(0, first) + after + source.slice(first + before.length));
}

function replaceAllInFile(path, before, after) {
  const source = read(path);
  if (!source.includes(before)) return false;
  write(path, source.split(before).join(after));
  return true;
}

const generated = new Set([
  "site/index.html",
  "site/responsive.css",
  "site/styles-runtime.css",
  "site/bootstrap.js",
  "site/bootstrap-core.js",
  "site/table-width-runtime.js",
  "site/vercel.json",
  "site/vercel.production.json",
]);

function isGenerated(path) {
  if (generated.has(path)) return true;
  return /^site\/modules\/app-core(?:-[^/]+)?-runtime\.js$/.test(path);
}

function walk(dir, output = []) {
  for (const entry of readdirSync(dir)) {
    const absolute = join(dir, entry);
    const stats = statSync(absolute);
    if (stats.isDirectory()) walk(absolute, output);
    else output.push(absolute);
  }
  return output;
}

const editableExtensions = new Set([".css", ".inc", ".html", ".js", ".mjs", ".md"]);
for (const base of [resolve(repoRoot, "site"), resolve(repoRoot, "docs")]) {
  for (const absolute of walk(base)) {
    const path = relative(repoRoot, absolute).replaceAll("\\", "/");
    if (isGenerated(path) || path === "site/apply-dialog-foundation-migration.mjs") continue;
    if (!editableExtensions.has(extname(path))) continue;
    replaceAllInFile(path, "filtersHeader", "mflDialogHeader");
    replaceAllInFile(path, "filtersFooter", "mflDialogFooter");
  }
}

for (const [path, className] of [
  ["site/html-sources/dialogs.html", "filtersDialog"],
  ["site/html-sources/dialogs.html", "evaluationLoadDialog"],
  ["site/html-sources/dialogs.html", "watchlistChoiceDialog"],
  ["site/html-sources/dialogs.html", "addWatchlistDialog"],
  ["site/html-sources/dialogs.html", "deleteWatchlistDialog"],
  ["site/html-sources/dialogs.html", "advancedSettingsDialog"],
  ["site/html-sources/static.html", "searchDialog"],
  ["site/bug-report-runtime.js", "bugReportDialog"],
]) {
  replaceOnce(path, `class="${className}"`, `class="mflDialog ${className}"`);
}

replaceOnce(
  "site/ui-foundations.css",
  `  --mfl-panel-border-strong: 1px solid var(--border-strong);\n  --mfl-radius-panel: 8px;\n  --mfl-radius-dialog: 8px;\n  --mfl-shadow-tooltip: 0 10px 26px rgba(0, 0, 0, 0.28);`,
  `  --mfl-panel-border-strong: 1px solid var(--border-strong);\n  --mfl-radius-panel: 8px;\n\n  /* Shared ordinary modal/dialog language. */\n  --mfl-modal-backdrop-background: rgba(0, 0, 0, 0.45);\n  --mfl-dialog-background: var(--surface);\n  --mfl-dialog-border: 1px solid var(--border);\n  --mfl-dialog-divider: 1px solid var(--border);\n  --mfl-radius-dialog: 8px;\n  --mfl-shadow-tooltip: 0 10px 26px rgba(0, 0, 0, 0.28);`,
);

replaceOnce(
  "site/styles-base.css",
  `  padding: 24px;\n  background: rgba(0, 0, 0, 0.45);\n  opacity: 0;\n  pointer-events: none;\n  transition: opacity 180ms ease;`,
  `  padding: 24px;\n  background: var(--mfl-modal-backdrop-background);\n  opacity: 0;\n  pointer-events: none;\n  transition: opacity var(--mfl-motion-standard) ease;`,
);
replaceOnce(
  "site/styles-base.css",
  `  opacity: 0;\n  transform: translateY(8px) scale(0.98);\n  transition: opacity 180ms ease, transform 180ms ease;`,
  `  opacity: 0;\n  transform: translateY(8px) scale(0.98);\n  transition: opacity var(--mfl-motion-standard) ease, transform var(--mfl-motion-standard) ease;`,
);

replaceOnce(
  "site/styles-base.css",
  `.mflDialogHeader,\n.mflDialogFooter {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 10px;\n  padding: 10px 14px;\n  border-bottom: 1px solid var(--border);\n}\n\n.mflDialogFooter {\n  justify-content: flex-end;\n  border-top: 1px solid var(--border);\n  border-bottom: 0;\n}`,
  `.mflDialogHeader,\n.mflDialogFooter {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 10px;\n  padding: 10px 14px;\n  border-bottom: var(--mfl-dialog-divider);\n}\n\n.mflDialogFooter {\n  justify-content: flex-end;\n  border-top: var(--mfl-dialog-divider);\n  border-bottom: 0;\n}`,
);

replaceOnce(
  "site/styles-base.css",
  `.filtersDialog {\n  display: flex;\n  flex-direction: column;\n  width: min(980px, 100%);\n  max-height: min(820px, 92vh);\n  border: 1px solid var(--border);\n  border-radius: 8px;\n  background: var(--surface);\n  box-shadow: 0 20px 80px rgba(0, 0, 0, 0.28);\n}`,
  `.mflDialog {\n  display: flex;\n  flex-direction: column;\n  border: var(--mfl-dialog-border);\n  border-radius: var(--mfl-radius-dialog);\n  background: var(--mfl-dialog-background);\n  box-shadow: var(--mfl-shadow-modal);\n}\n\n.filtersDialog {\n  width: min(980px, 100%);\n  max-height: min(820px, 92vh);\n}`,
);

for (const [selector, before, after] of [
  ["advancedSettingsDialog", `.advancedSettingsDialog {\n  display: flex;\n  flex-direction: column;\n  width: min(1120px, 100%);\n  max-height: min(860px, 92vh);\n  border: 1px solid var(--border);\n  border-radius: 8px;\n  background: var(--surface);\n  box-shadow: 0 20px 80px rgba(0, 0, 0, 0.28);\n}`, `.advancedSettingsDialog {\n  width: min(1120px, 100%);\n  max-height: min(860px, 92vh);\n}`],
  ["deleteWatchlistDialog", `.deleteWatchlistDialog {\n  display: flex;\n  flex-direction: column;\n  width: min(420px, 100%);\n  border: 1px solid var(--border);\n  border-radius: 8px;\n  background: var(--surface);\n  color: var(--text);\n  box-shadow: 0 20px 80px rgba(0, 0, 0, 0.28);\n}`, `.deleteWatchlistDialog {\n  width: min(420px, 100%);\n  color: var(--text);\n}`],
  ["addWatchlistDialog", `.addWatchlistDialog {\n  display: flex;\n  flex-direction: column;\n  width: min(420px, 100%);\n  border: 1px solid var(--border);\n  border-radius: 8px;\n  background: var(--surface);\n  box-shadow: 0 20px 80px rgba(0, 0, 0, 0.28);\n}`, `.addWatchlistDialog {\n  width: min(420px, 100%);\n}`],
  ["searchDialog", `.searchDialog {\n  display: flex;\n  flex-direction: column;\n  width: min(960px, calc(100vw - 32px));\n  height: auto;\n  max-height: calc(100vh - 64px);\n  border: 1px solid var(--border);\n  border-radius: 8px;\n  background: var(--surface);\n  box-shadow: 0 20px 80px rgba(0, 0, 0, 0.28);\n}`, `.searchDialog {\n  width: min(960px, calc(100vw - 32px));\n  height: auto;\n  max-height: calc(100vh - 64px);\n}`],
  ["evaluationLoadDialog", `.evaluationLoadDialog {\n  position: relative;\n  display: flex;\n  flex-direction: column;\n  width: min(960px, calc(100vw - 32px));\n  height: auto;\n  max-height: calc(100vh - 64px);\n  border: 1px solid var(--border);\n  border-radius: 8px;\n  background: var(--surface);\n  background-clip: padding-box;\n  box-shadow: 0 20px 80px rgba(0, 0, 0, 0.28);\n  overflow: hidden;\n}`, `.evaluationLoadDialog {\n  position: relative;\n  width: min(960px, calc(100vw - 32px));\n  height: auto;\n  max-height: calc(100vh - 64px);\n  background-clip: padding-box;\n  overflow: hidden;\n}`],
  ["watchlistChoiceDialog", `.watchlistChoiceDialog {\n  display: flex;\n  flex-direction: column;\n  width: min(420px, 100%);\n  border: 1px solid var(--border);\n  border-radius: 8px;\n  background: var(--surface);\n  color: var(--text);\n  box-shadow: 0 20px 80px rgba(0, 0, 0, 0.28);\n}`, `.watchlistChoiceDialog {\n  width: min(420px, 100%);\n  color: var(--text);\n}`],
]) {
  replaceOnce("site/styles-base.css", before, after);
  void selector;
}

replaceOnce(
  "site/footer.css",
  `.bugReportDialog {\n  display: flex;\n  flex-direction: column;\n  width: min(620px, calc(100vw - 24px));\n  max-height: min(760px, calc(100dvh - 24px));\n  min-width: 0;\n  border: 1px solid var(--border);\n  border-radius: var(--mfl-radius-dialog);\n  background: var(--surface);\n  color: var(--text);\n  box-shadow: var(--mfl-shadow-modal);\n  overflow: hidden;\n}`,
  `.bugReportDialog {\n  width: min(620px, calc(100vw - 24px));\n  max-height: min(760px, calc(100dvh - 24px));\n  min-width: 0;\n  color: var(--text);\n  overflow: hidden;\n}`,
);

replaceOnce(
  "site/validate-ui-foundations.mjs",
  `  "--mfl-panel-border-strong: 1px solid var(--border-strong);",\n  "--mfl-radius-panel: 8px;",\n  "--mfl-radius-dialog: 8px;",\n  "--mfl-shadow-tooltip: 0 10px 26px rgba(0, 0, 0, 0.28);",`,
  `  "--mfl-panel-border-strong: 1px solid var(--border-strong);",\n  "--mfl-radius-panel: 8px;",\n  "--mfl-modal-backdrop-background: rgba(0, 0, 0, 0.45);",\n  "--mfl-dialog-background: var(--surface);",\n  "--mfl-dialog-border: 1px solid var(--border);",\n  "--mfl-dialog-divider: 1px solid var(--border);",\n  "--mfl-radius-dialog: 8px;",\n  "--mfl-shadow-tooltip: 0 10px 26px rgba(0, 0, 0, 0.28);",`,
);
replaceOnce(
  "site/validate-ui-foundations.mjs",
  `includes(footer, "border-radius: var(--mfl-radius-dialog);", "Bug Report must consume the canonical 8px dialog radius.");\nincludes(footer, "box-shadow: var(--mfl-shadow-modal);", "Bug Report must consume the canonical modal shadow.");`,
  `includes(stylesBase, ".mflDialog {\\n  display: flex;\\n  flex-direction: column;\\n  border: var(--mfl-dialog-border);\\n  border-radius: var(--mfl-radius-dialog);\\n  background: var(--mfl-dialog-background);\\n  box-shadow: var(--mfl-shadow-modal);", "Ordinary dialogs must consume the shared dialog shell foundations.");\nexcludes(footer, "border-radius: var(--mfl-radius-dialog);", "Bug Report must inherit dialog radius from the shared dialog shell rather than duplicate it.");\nexcludes(footer, "box-shadow: var(--mfl-shadow-modal);", "Bug Report must inherit modal shadow from the shared dialog shell rather than duplicate it.");`,
);

replaceOnce(
  "site/validate-domain-shared-ui.mjs",
  `  "validate-modal-entrance-lifecycle.mjs",\n  "validate-z-index-ownership.mjs",`,
  `  "validate-modal-entrance-lifecycle.mjs",\n  "validate-dialog-foundations.mjs",\n  "validate-z-index-ownership.mjs",`,
);

replaceOnce(
  "docs/ui-foundations.md",
  `## Dialogs and overlays\n\n- Canonical dialog radius: \`8px\` (\`--mfl-radius-dialog\`)\n- Canonical modal/dialog shadow: \`0 20px 80px rgba(0, 0, 0, 0.28)\` (\`--mfl-shadow-modal\`)\n- Tooltip shadow:`,
  `## Dialogs and overlays\n\n- Canonical backdrop surface: \`rgba(0, 0, 0, 0.45)\` (\`--mfl-modal-backdrop-background\`)\n- Canonical ordinary dialog surface: \`var(--surface)\` (\`--mfl-dialog-background\`)\n- Canonical ordinary dialog border: \`1px solid var(--border)\` (\`--mfl-dialog-border\`)\n- Canonical dialog header/footer divider: \`1px solid var(--border)\` (\`--mfl-dialog-divider\`)\n- Canonical dialog radius: \`8px\` (\`--mfl-radius-dialog\`)\n- Canonical modal/dialog shadow: \`0 20px 80px rgba(0, 0, 0, 0.28)\` (\`--mfl-shadow-modal\`)\n- \`.mflDialog\` owns the shared ordinary shell; \`.mflDialogHeader\` and \`.mflDialogFooter\` own shared dialog chrome.\n- Search, Filters, saved Evaluation, Watchlist chooser/add/delete, Advanced Settings, and Bug Report consume those generic structural classes while retaining their domain-specific widths, bodies, controls, and responsive geometry.\n- The shared backdrop uses \`--mfl-motion-standard\` for its existing 180ms opacity/transform timing.\n- Tooltip shadow:`,
);

const validator = `import assert from "node:assert/strict";\nimport { readFileSync } from "node:fs";\nimport { dirname, resolve } from "node:path";\nimport { fileURLToPath } from "node:url";\n\nconst root = dirname(fileURLToPath(import.meta.url));\nconst read = (path) => readFileSync(resolve(root, path), "utf8").replace(/\\r\\n?/g, "\\n");\nconst foundations = read("ui-foundations.css");\nconst base = read("styles-base.css");\nconst footer = read("footer.css");\nconst dialogs = read("html-sources/dialogs.html");\nconst staticHtml = read("html-sources/static.html");\nconst bugRuntime = read("bug-report-runtime.js");\nconst responsiveSources = [\n  read("responsive-sources/parity.css.inc"),\n  read("responsive-sources/tables-tablet.css.inc"),\n  read("responsive-sources/tables-phone.css.inc"),\n  read("responsive-sources/static-phone.css.inc"),\n  read("responsive-sources/evaluation-phone.css.inc"),\n  read("responsive-sources/filters-tablet.css.inc"),\n  read("responsive-sources/compact.css.inc"),\n].join("\\n");\n\nfor (const token of [\n  "--mfl-modal-backdrop-background: rgba(0, 0, 0, 0.45);",\n  "--mfl-dialog-background: var(--surface);",\n  "--mfl-dialog-border: 1px solid var(--border);",\n  "--mfl-dialog-divider: 1px solid var(--border);",\n  "--mfl-radius-dialog: 8px;",\n  "--mfl-shadow-modal: 0 20px 80px rgba(0, 0, 0, 0.28);",\n]) assert.ok(foundations.includes(token), \`Missing shared dialog foundation: \${token}\`);\n\nassert.ok(base.includes(".modalBackdrop {\\n  position: fixed;") && base.includes("background: var(--mfl-modal-backdrop-background);") && base.includes("transition: opacity var(--mfl-motion-standard) ease;"), "Modal backdrop must consume shared surface and canonical motion timing.");\nassert.ok(base.includes(".modalBackdrop > section {\\n  opacity: 0;\\n  transform: translateY(8px) scale(0.98);\\n  transition: opacity var(--mfl-motion-standard) ease, transform var(--mfl-motion-standard) ease;"), "Dialog entrance transform must consume canonical standard motion timing without changing geometry.");\nassert.ok(base.includes(".mflDialog {\\n  display: flex;\\n  flex-direction: column;\\n  border: var(--mfl-dialog-border);\\n  border-radius: var(--mfl-radius-dialog);\\n  background: var(--mfl-dialog-background);\\n  box-shadow: var(--mfl-shadow-modal);"), "Ordinary dialog shells must share one semantic structure.");\nassert.ok(base.includes(".mflDialogHeader,\\n.mflDialogFooter {\\n  display: flex;") && base.includes("border-bottom: var(--mfl-dialog-divider);") && base.includes(".mflDialogFooter {\\n  justify-content: flex-end;\\n  border-top: var(--mfl-dialog-divider);"), "Ordinary dialog header/footer chrome must share one semantic owner.");\n\nfor (const className of ["filtersDialog", "evaluationLoadDialog", "watchlistChoiceDialog", "addWatchlistDialog", "deleteWatchlistDialog", "advancedSettingsDialog"]) {\n  assert.ok(dialogs.includes(\`class="mflDialog \${className}"\`), \`Dialog markup must consume mflDialog: \${className}\`);\n}\nassert.ok(staticHtml.includes('class="mflDialog searchDialog"'), "Search must consume mflDialog from canonical static HTML.");\nassert.ok(bugRuntime.includes('class="mflDialog bugReportDialog"'), "Bug Report must consume mflDialog from its runtime-owned markup.");\n\nconst legacyHeader = ["filters", "Header"].join("");\nconst legacyFooter = ["filters", "Footer"].join("");\nfor (const [name, source] of [["dialogs", dialogs], ["static", staticHtml], ["bug runtime", bugRuntime], ["responsive", responsiveSources], ["base", base]]) {\n  assert.ok(!source.includes(legacyHeader) && !source.includes(legacyFooter), \`Filter-named classes must not remain accidental shared dialog primitives in \${name}.\`);\n}\n\nfor (const selector of [".filtersDialog", ".advancedSettingsDialog", ".deleteWatchlistDialog", ".addWatchlistDialog", ".searchDialog", ".evaluationLoadDialog", ".watchlistChoiceDialog"]) {\n  const start = base.indexOf(\`\${selector} {\`);\n  const end = base.indexOf("\\n}", start);\n  assert.ok(start >= 0 && end > start, \`Missing specialist dialog rule \${selector}\`);\n  const rule = base.slice(start, end + 2);\n  for (const duplicate of ["border: 1px solid var(--border);", "border-radius: 8px;", "background: var(--surface);", "box-shadow: 0 20px 80px rgba(0, 0, 0, 0.28);"]) {\n    assert.ok(!rule.includes(duplicate), \`\${selector} must not duplicate shared dialog shell declaration: \${duplicate}\`);\n  }\n}\nfor (const duplicate of ["border: 1px solid var(--border);", "border-radius: var(--mfl-radius-dialog);", "background: var(--surface);", "box-shadow: var(--mfl-shadow-modal);"]) {\n  const start = footer.indexOf(".bugReportDialog {");\n  const end = footer.indexOf("\\n}", start);\n  assert.ok(!footer.slice(start, end + 2).includes(duplicate), \`Bug Report must inherit shared dialog shell declaration: \${duplicate}\`);\n}\n\nassert.ok(!base.includes("transition: opacity 180ms ease;"), "Modal backdrop must not duplicate the canonical 180ms motion literal.");\nconsole.log("Ordinary modals share one semantic backdrop/shell/header/footer foundation while specialist dialog geometry and behavior remain independently owned.");\n`;
write("site/validate-dialog-foundations.mjs", validator);

console.log("Applied shared modal/dialog foundation migration to canonical sources.");
