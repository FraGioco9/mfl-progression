import { invariant } from "./validation/assertions.mjs";
import { readValidationText } from "./validation-text.mjs";

const read = (path) => readValidationText(path, import.meta.url);
const [dataApi, dataAuth] = await Promise.all([
  read("./api/data.js"),
  read("./api/_data-auth.js"),
]);

for (const mode of [
  "bootstrap",
  "search",
  "summary",
  "filter-options",
  "database-stats",
  "mfl-stats-summary",
  "mfl-stats",
  "mfl-stats-all",
]) {
  invariant(dataApi.includes(`  "${mode}",`), `Public SQLite snapshot mode ${mode} must remain explicitly cache-classified.`);
}
invariant(
  !dataApi.slice(dataApi.indexOf("const PUBLIC_SNAPSHOT_MODES"), dataApi.indexOf("function publicSnapshotEtag")).includes('"page"'),
  "Paged data must not enter the public snapshot cache because it can include private access and volatile marketplace state.",
);
invariant(
  dataApi.includes('const identity = `${getGeneratedAt()}\\n${String(request.url || "")}`;'),
  "Public snapshot ETags must combine the database generation with the exact request URL.",
);
invariant(
  dataApi.indexOf("if (etag && requestMatchesEtag(request, etag))") < dataApi.indexOf("signedWalletFromRequest(request)"),
  "Conditional public snapshot hits must return before wallet proof work.",
);
invariant(
  dataApi.includes('if (mode !== "page") return false;')
    && dataApi.includes('if (scope === "myplayers" || accessMode === "owned-progression") return true;')
    && dataApi.includes('return accessMode === "full-progression"'),
  "Wallet proof verification must be reserved for page requests whose data actually depends on wallet access.",
);
invariant(
  dataAuth.includes('const PRIVATE_CACHE_CONTROL = "private, no-store, no-cache, must-revalidate, max-age=0";')
    && dataAuth.includes('const PUBLIC_REVALIDATE_CACHE_CONTROL = "public, max-age=0, must-revalidate";'),
  "Private no-store and public revalidation cache policies must remain distinct.",
);
invariant(
  dataAuth.includes('response.setHeader("CDN-Cache-Control", "no-store, max-age=0");')
    && dataAuth.includes('response.setHeader("Vercel-CDN-Cache-Control", "no-store, max-age=0");'),
  "The first public-cache step must remain browser-revalidation-only until CDN freshness has a separate contract.",
);
invariant(
  dataApi.includes("sendNotModified(response, startedAt, timings, publicCacheOptions);")
    && dataApi.includes("sendJson(response, 200, data, startedAt, timings, publicCacheOptions);"),
  "Public snapshot reads must share one ETag/cache policy for 304 and 200 responses.",
);

console.log("Public data read cache and wallet-proof fast-path validation passed.");
