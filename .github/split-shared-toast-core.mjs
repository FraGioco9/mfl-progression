import fs from "node:fs";

const sharedPath = "site/modules/core-sources/shared.js";
const toastPath = "site/modules/core-sources/shared-toast-core.js";
const manifestPath = "site/modules/core-source-manifest.js";

const original = fs.readFileSync(sharedPath, "utf8");
const marker = "function showWatchlistToast(";
const splitIndex = original.indexOf(marker);
if (splitIndex <= 0) throw new Error("Shared toast split marker not found.");

const toastCore = original.slice(0, splitIndex).replace(/\s*$/, "");
const remaining = original.slice(splitIndex);
if (!toastCore.startsWith("function scheduleToastHide(toast) {")) {
  throw new Error("Shared toast core does not start at scheduleToastHide().");
}
if (!toastCore.endsWith("scheduleToastHide(toast);\n  }\n}")) {
  throw new Error("Shared toast core does not end at showToast().");
}
if (!remaining.startsWith("function showWatchlistToast(")) {
  throw new Error("Remaining Shared source does not start at showWatchlistToast().");
}

const reconstructed = `${toastCore}\n\n${remaining.replace(/\s*$/, "")}`;
if (reconstructed !== original.replace(/\s*$/, "")) {
  throw new Error("Shared toast split changed assembled source bytes.");
}

fs.writeFileSync(toastPath, `${toastCore}\n`, "utf8");
fs.writeFileSync(sharedPath, remaining, "utf8");

let manifest = fs.readFileSync(manifestPath, "utf8");
const before = '"shared-home-summary.js", "shared-table-state.js", "shared.js"';
const after = '"shared-home-summary.js", "shared-table-state.js", "shared-toast-core.js", "shared.js"';
if (!manifest.includes(before)) throw new Error("Shared manifest anchor not found.");
manifest = manifest.replace(before, after);
fs.writeFileSync(manifestPath, manifest, "utf8");
