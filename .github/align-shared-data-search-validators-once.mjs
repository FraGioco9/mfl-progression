import { readFile, writeFile } from "node:fs/promises";

async function replaceExact(path, replacements) {
  const url = new URL(`../${path}`, import.meta.url);
  let source = String(await readFile(url, "utf8")).replace(/\r\n?/g, "\n");
  for (const [before, after] of replacements) {
    if (!source.includes(before)) throw new Error(`${path}: missing expected validator block`);
    source = source.replace(before, after);
  }
  await writeFile(url, source, "utf8");
}

await replaceExact("site/validate.mjs", [[
`    && sharedCoreManifest?.sources?.length === 10
    && sharedCoreManifest.sources[0] === "shared-foundations.js"
    && sharedCoreManifest.sources[1] === "shared-session.js"
    && sharedCoreManifest.sources[2] === "shared-routing.js"
    && sharedCoreManifest.sources[3] === "shared-transitions.js"
    && sharedCoreManifest.sources[4] === "shared-page-lifecycle.js"
    && sharedCoreManifest.sources[5] === "shared-home-summary.js"
    && sharedCoreManifest.sources[6] === "shared-table-state.js"
    && sharedCoreManifest.sources[7] === "shared-toast-core.js"
    && sharedCoreManifest.sources[8] === "shared-personal-state.js"
    && sharedCoreManifest.sources[9] === "shared.js"`,
`    && sharedCoreManifest?.sources?.length === 11
    && sharedCoreManifest.sources[0] === "shared-foundations.js"
    && sharedCoreManifest.sources[1] === "shared-session.js"
    && sharedCoreManifest.sources[2] === "shared-routing.js"
    && sharedCoreManifest.sources[3] === "shared-transitions.js"
    && sharedCoreManifest.sources[4] === "shared-page-lifecycle.js"
    && sharedCoreManifest.sources[5] === "shared-home-summary.js"
    && sharedCoreManifest.sources[6] === "shared-table-state.js"
    && sharedCoreManifest.sources[7] === "shared-toast-core.js"
    && sharedCoreManifest.sources[8] === "shared-personal-state.js"
    && sharedCoreManifest.sources[9] === "shared-data-search.js"
    && sharedCoreManifest.sources[10] === "shared.js"`,
]]);

await replaceExact("site/validate-club-route-core.mjs", [[
`    && coreSourceByDomain.shared?.sources?.length === 10
    && coreSourceByDomain.shared.sources[1] === "shared-session.js"
    && coreSourceByDomain.shared.sources[2] === "shared-routing.js"
    && coreSourceByDomain.shared.sources[3] === "shared-transitions.js"
    && coreSourceByDomain.shared.sources[4] === "shared-page-lifecycle.js"
    && coreSourceByDomain.shared.sources[5] === "shared-home-summary.js"
    && coreSourceByDomain.shared.sources[6] === "shared-table-state.js"
    && coreSourceByDomain.shared.sources[7] === "shared-toast-core.js"
    && coreSourceByDomain.shared.sources[8] === "shared-personal-state.js"
    && coreSourceByDomain.shared.sources[9] === "shared.js"`,
`    && coreSourceByDomain.shared?.sources?.length === 11
    && coreSourceByDomain.shared.sources[1] === "shared-session.js"
    && coreSourceByDomain.shared.sources[2] === "shared-routing.js"
    && coreSourceByDomain.shared.sources[3] === "shared-transitions.js"
    && coreSourceByDomain.shared.sources[4] === "shared-page-lifecycle.js"
    && coreSourceByDomain.shared.sources[5] === "shared-home-summary.js"
    && coreSourceByDomain.shared.sources[6] === "shared-table-state.js"
    && coreSourceByDomain.shared.sources[7] === "shared-toast-core.js"
    && coreSourceByDomain.shared.sources[8] === "shared-personal-state.js"
    && coreSourceByDomain.shared.sources[9] === "shared-data-search.js"
    && coreSourceByDomain.shared.sources[10] === "shared.js"`,
]]);

await replaceExact("site/validate-core-source-ownership.mjs", [
[
`    && sharedEntry?.sources?.length === 10
    && sharedEntry.sources[0] === "shared-foundations.js"
    && sharedEntry.sources[1] === "shared-session.js"
    && sharedEntry.sources[2] === "shared-routing.js"
    && sharedEntry.sources[3] === "shared-transitions.js"
    && sharedEntry.sources[4] === "shared-page-lifecycle.js"
    && sharedEntry.sources[5] === "shared-home-summary.js"
    && sharedEntry.sources[6] === "shared-table-state.js"
    && sharedEntry.sources[7] === "shared-toast-core.js"
    && sharedEntry.sources[8] === "shared-personal-state.js"
    && sharedEntry.sources[9] === "shared.js"
    && sharedEntry.maxUniversalBytes === 355000,
  "Shared core must keep foundations before session before routing before transitions before page lifecycle before Home summary before table state before generic toast core before personal state before remaining shared behavior and retain the explicit 355000-byte universal no-growth ceiling."`,
`    && sharedEntry?.sources?.length === 11
    && sharedEntry.sources[0] === "shared-foundations.js"
    && sharedEntry.sources[1] === "shared-session.js"
    && sharedEntry.sources[2] === "shared-routing.js"
    && sharedEntry.sources[3] === "shared-transitions.js"
    && sharedEntry.sources[4] === "shared-page-lifecycle.js"
    && sharedEntry.sources[5] === "shared-home-summary.js"
    && sharedEntry.sources[6] === "shared-table-state.js"
    && sharedEntry.sources[7] === "shared-toast-core.js"
    && sharedEntry.sources[8] === "shared-personal-state.js"
    && sharedEntry.sources[9] === "shared-data-search.js"
    && sharedEntry.sources[10] === "shared.js"
    && sharedEntry.maxUniversalBytes === 355000,
  "Shared core must keep foundations before session before routing before transitions before page lifecycle before Home summary before table state before generic toast core before personal state before data/search before remaining shared behavior and retain the explicit 355000-byte universal no-growth ceiling."`,
],
[
`const sharedPersonalState = await read("./modules/core-sources/shared-personal-state.js");
const sharedNavigation = await read("./modules/core-sources/shared.js");`,
`const sharedPersonalState = await read("./modules/core-sources/shared-personal-state.js");
const sharedDataSearch = await read("./modules/core-sources/shared-data-search.js");
const sharedNavigation = await read("./modules/core-sources/shared.js");`,
],
[
`invariant(
  sharedNavigation.startsWith("function formatCount(value) {"),
  "Remaining Shared behavior must begin at the generic data/formatting boundary.",
);`,
`invariant(
  sharedDataSearch.startsWith("function formatCount(value) {")
    && sharedDataSearch.replace(/\\s*$/, "").endsWith("return primeGlobalSearchIndexes();\\n}"),
  "Shared data/search must own generic row/value formatting through the canonical database-search index readiness boundary.",
);
invariant(
  sharedNavigation.startsWith("const DEFAULT_EVALUATION_MFL_PER_USD = 400;"),
  "Remaining Shared behavior must begin at the eager Evaluation lifecycle boundary.",
);`,
],
[
`    && !sharedToastCore.includes("function showWatchlistToast")
    && !sharedPersonalState.includes("function formatCount"),
  "Shared foundations, session, routing, transitions, page lifecycle, Home summary, table state, generic toast core, and personal state must not absorb later ownership domains."`,
`    && !sharedToastCore.includes("function showWatchlistToast")
    && !sharedPersonalState.includes("function formatCount")
    && !sharedDataSearch.includes("const DEFAULT_EVALUATION_MFL_PER_USD"),
  "Shared foundations, session, routing, transitions, page lifecycle, Home summary, table state, generic toast core, personal state, and data/search must not absorb later ownership domains."`,
],
]);

console.log("Aligned Shared data/search fragment validators.");
