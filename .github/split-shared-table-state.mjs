import { readFile, writeFile } from "node:fs/promises";

const sharedPath = "site/modules/core-sources/shared.js";
const fragmentPath = "site/modules/core-sources/shared-table-state.js";
const manifestPath = "site/modules/core-source-manifest.js";

const shared = await readFile(sharedPath, "utf8");
const fragment = (await readFile(fragmentPath, "utf8")).replace(/\s*$/, "");
const marker = "function scheduleToastHide(toast) {";
const splitAt = shared.indexOf(marker);
if (splitAt < 0) throw new Error("Toast boundary missing from Shared source");
const prefix = shared.slice(0, splitAt).replace(/\s*$/, "");
const remaining = shared.slice(splitAt);
if (prefix !== fragment) throw new Error("Table-state fragment does not exactly match the Shared prefix");
if (`${fragment}\n\n${remaining}` !== shared) throw new Error("Shared split would change assembled source bytes");
await writeFile(sharedPath, remaining, "utf8");

const manifest = await readFile(manifestPath, "utf8");
const oldSources = '["shared-foundations.js", "shared-session.js", "shared-routing.js", "shared-transitions.js", "shared-page-lifecycle.js", "shared-home-summary.js", "shared.js"]';
const newSources = '["shared-foundations.js", "shared-session.js", "shared-routing.js", "shared-transitions.js", "shared-page-lifecycle.js", "shared-home-summary.js", "shared-table-state.js", "shared.js"]';
if (!manifest.includes(oldSources)) throw new Error("Shared manifest anchor missing");
await writeFile(manifestPath, manifest.replace(oldSources, newSources), "utf8");
