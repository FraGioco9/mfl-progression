import { readFile, writeFile } from "node:fs/promises";

const sharedPath = new URL("../site/modules/core-sources/shared.js", import.meta.url);
const fragmentPath = new URL("../site/modules/core-sources/shared-data-search.js", import.meta.url);
const manifestPath = new URL("../site/modules/core-source-manifest.js", import.meta.url);

const source = String(await readFile(sharedPath, "utf8")).replace(/\r\n?/g, "\n");
const marker = "const DEFAULT_EVALUATION_MFL_PER_USD = 400;";
const splitIndex = source.indexOf(marker);
if (splitIndex <= 0) {
  throw new Error("Could not find the canonical Evaluation boundary in shared.js.");
}

const canonicalSource = source.replace(/\s*$/, "");
const dataSearch = source.slice(0, splitIndex).replace(/\s*$/, "");
const remaining = source.slice(splitIndex).replace(/\s*$/, "");
if (`${dataSearch}\n\n${remaining}` !== canonicalSource) {
  throw new Error("Shared data/search split would not reconstruct the pre-split Shared bytes exactly.");
}
if (!dataSearch.startsWith("function formatCount(value) {")) {
  throw new Error("Shared data/search prefix no longer starts at formatCount().");
}
if (!dataSearch.endsWith("return primeGlobalSearchIndexes();\n}")) {
  throw new Error("Shared data/search prefix no longer ends at ensureSearchIndexes().");
}
if (!remaining.startsWith(marker)) {
  throw new Error("Remaining Shared source must begin at the Evaluation lifecycle boundary.");
}

await writeFile(fragmentPath, `${dataSearch}\n`, "utf8");
await writeFile(sharedPath, `${remaining}\n`, "utf8");

const manifest = String(await readFile(manifestPath, "utf8"));
const before = '"shared-toast-core.js", "shared-personal-state.js", "shared.js"';
const after = '"shared-toast-core.js", "shared-personal-state.js", "shared-data-search.js", "shared.js"';
if (!manifest.includes(before)) {
  throw new Error("Canonical Shared manifest tail no longer matches the expected pre-split order.");
}
await writeFile(manifestPath, manifest.replace(before, after), "utf8");

console.log("Split Shared generic data/search prefix without changing assembled source bytes.");
