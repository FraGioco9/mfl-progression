import { readdir, readFile } from "node:fs/promises";

const siteRoot = new URL("./", import.meta.url);
const MIGRATED_RUNTIMES = Object.freeze([
  "bug-report-runtime.js",
  "database-stats-runtime.js",
  "evaluation-discount-rate-runtime.js",
  "global-search-runtime.js",
  "marketplace-overlay-runtime.js",
  "nationality-filter-options-runtime.js",
]);
const directApiFetch = /(^|[^.\w$])fetch\s*\(\s*["'`]\/api\//gm;

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

if (directOwners.length) {
  throw new Error(`Standalone runtimes must not depend on the global fetch compatibility bridge for /api calls. Remaining owners: ${directOwners.join(", ")}`);
}

for (const name of MIGRATED_RUNTIMES) {
  const source = sources.get(name) || "";
  if (!source.includes("__mflDataClient")) {
    throw new Error(`${name} must resolve the canonical data client explicitly.`);
  }
  if (/(^|[^.\w$])fetch\s*\(\s*["'`]\/api\//m.test(source)) {
    throw new Error(`${name} must not depend on the global fetch compatibility bridge for API calls.`);
  }
}

const nationality = sources.get("nationality-filter-options-runtime.js") || "";
if (!nationality.includes("dedupe: true") || !nationality.includes('key: "nationality-filter-options"')) {
  throw new Error("Nationality filter options must retain canonical GET deduplication.");
}

const databaseStats = sources.get("database-stats-runtime.js") || "";
if (!databaseStats.includes("dedupe: true") || !databaseStats.includes("`database-stats:${VERSION}`")) {
  throw new Error("Database Stats must retain release-keyed canonical GET deduplication.");
}

const globalSearch = sources.get("global-search-runtime.js") || "";
if (!globalSearch.includes("function dataClientFetch(input, init = {}, options = {})")
    || !globalSearch.includes('dataClientFetch("/api/wallet-preferences"')
    || !globalSearch.includes("dataClientFetch(`/api/data?${parameters}`")) {
  throw new Error("Global Search must route wallet and database API reads through the canonical data client while retaining its own abort sequencing.");
}

const marketplace = sources.get("marketplace-overlay-runtime.js") || "";
if (!marketplace.includes('dataClient.fetch("/api/marketplace"')) {
  throw new Error("Marketplace overlay must use the canonical client directly.");
}

console.log("Standalone data-client migration guard passed with zero direct /api fetch owners.");