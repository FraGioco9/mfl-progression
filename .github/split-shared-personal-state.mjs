import fs from "node:fs";

const sharedPath = "site/modules/core-sources/shared.js";
const personalStatePath = "site/modules/core-sources/shared-personal-state.js";
const manifestPath = "site/modules/core-source-manifest.js";

const original = fs.readFileSync(sharedPath, "utf8");
const marker = "function formatCount(value) {";
const splitIndex = original.indexOf(marker);
if (splitIndex <= 0) throw new Error("Shared personal-state split marker not found.");

const personalState = original.slice(0, splitIndex).replace(/\s*$/, "");
const remaining = original.slice(splitIndex);
if (!personalState.startsWith("function showWatchlistToast(")) {
  throw new Error("Shared personal state does not start at showWatchlistToast().");
}
if (!personalState.endsWith("    return null;\n  }\n}")) {
  throw new Error("Shared personal state does not end at loadSavedTableState().");
}
if (!remaining.startsWith(marker)) {
  throw new Error("Remaining Shared source does not start at formatCount().");
}

const reconstructed = `${personalState}\n\n${remaining.replace(/\s*$/, "")}`;
if (reconstructed !== original.replace(/\s*$/, "")) {
  throw new Error("Shared personal-state split changed assembled source bytes.");
}

fs.writeFileSync(personalStatePath, `${personalState}\n`, "utf8");
fs.writeFileSync(sharedPath, remaining, "utf8");

let manifest = fs.readFileSync(manifestPath, "utf8");
const before = '"shared-table-state.js", "shared-toast-core.js", "shared.js"';
const after = '"shared-table-state.js", "shared-toast-core.js", "shared-personal-state.js", "shared.js"';
if (!manifest.includes(before)) throw new Error("Shared manifest anchor not found.");
manifest = manifest.replace(before, after);
fs.writeFileSync(manifestPath, manifest, "utf8");
