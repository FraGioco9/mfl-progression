import { readdir, readFile } from "node:fs/promises";

const siteRoot = new URL("./", import.meta.url);
const LEGACY_DIRECT_API_FETCH_RUNTIMES = new Set([
  "database-stats-runtime.js",
  "global-search-runtime.js",
]);
const MIGRATED_RUNTIMES = Object.freeze([
  "bug-report-runtime.js",
  "evaluation-discount-rate-runtime.js",
  "marketplace-overlay-runtime.js",
  "nationality-filter-options-runtime.js",
]);
const directApiFetch = /\bfetch\s*\(\s*["'`]\/api\//g;

const runtimeNames = (await readdir(siteRoot))
  .filter((name) => name.endsWith("-runtime.js"))
  .sort();
const sources = new Map(await Promise.all(runtimeNames.map(async (name) => [
  name,
  String(await readFile(new URL(name, siteRoot), "utf8")).replace(/\r\n?/g, "\n"),
])));

const directOwners = [];
for (const [name, source] of sources) {
  if (directApiFetch.test(source)) directOwners.push(name);
  directApiFetch.lastIndex = 0;
}

const unexpected = directOwners.filter((name) => !LEGACY_DIRECT_API_FETCH_RUNTIMES.has(name));
if (unexpected.length) {
  throw new Error(`Standalone runtimes must not add direct /api fetch owners. Unexpected owners: ${unexpected.join(", ")}`);
}
for (const name of LEGACY_DIRECT_API_FETCH_RUNTIMES) {
  if (!directOwners.includes(name)) {
    throw new Error(`${name} left the temporary direct-fetch allowlist; remove it from the validator in the same change.`);
  }
}

for (const name of MIGRATED_RUNTIMES) {
  const source = sources.get(name) || "";
  if (!source.includes("__mflDataClient")) {
    throw new Error(`${name} must resolve the canonical data client explicitly.`);
  }
  if (/\bfetch\s*\(\s*["'`]\/api\//.test(source)) {
    throw new Error(`${name} must not depend on the global fetch compatibility bridge for API calls.`);
  }
}

const nationality = sources.get("nationality-filter-options-runtime.js") || "";
if (!nationality.includes("dedupe: true") || !nationality.includes('key: "nationality-filter-options"')) {
  throw new Error("Nationality filter options must retain canonical GET deduplication.");
}

const marketplace = sources.get("marketplace-overlay-runtime.js") || "";
if (!marketplace.includes('dataClient.fetch("/api/marketplace"')) {
  throw new Error("Marketplace overlay must use the canonical client directly.");
}

console.log(`Standalone data-client migration guard passed; remaining direct runtime owners: ${directOwners.join(", ")}.`);
