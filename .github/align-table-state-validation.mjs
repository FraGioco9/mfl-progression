import { readFile, writeFile } from "node:fs/promises";

async function replace(path, oldValue, newValue) {
  const source = await readFile(path, "utf8");
  if (!source.includes(oldValue)) throw new Error(`Expected anchor missing in ${path}`);
  await writeFile(path, source.replace(oldValue, newValue), "utf8");
}

await replace(
  "site/validate.mjs",
  `    && sharedCoreManifest?.sources?.length === 7
    && sharedCoreManifest.sources[0] === "shared-foundations.js"
    && sharedCoreManifest.sources[1] === "shared-session.js"
    && sharedCoreManifest.sources[2] === "shared-routing.js"
    && sharedCoreManifest.sources[3] === "shared-transitions.js"
    && sharedCoreManifest.sources[4] === "shared-page-lifecycle.js"
    && sharedCoreManifest.sources[5] === "shared-home-summary.js"
    && sharedCoreManifest.sources[6] === "shared.js"
`,
  `    && sharedCoreManifest?.sources?.length === 8
    && sharedCoreManifest.sources[0] === "shared-foundations.js"
    && sharedCoreManifest.sources[1] === "shared-session.js"
    && sharedCoreManifest.sources[2] === "shared-routing.js"
    && sharedCoreManifest.sources[3] === "shared-transitions.js"
    && sharedCoreManifest.sources[4] === "shared-page-lifecycle.js"
    && sharedCoreManifest.sources[5] === "shared-home-summary.js"
    && sharedCoreManifest.sources[6] === "shared-table-state.js"
    && sharedCoreManifest.sources[7] === "shared.js"
`,
);

await replace(
  "site/validate-club-route-core.mjs",
  `    && coreSourceByDomain.shared?.sources?.length === 7
    && coreSourceByDomain.shared.sources[1] === "shared-session.js"
    && coreSourceByDomain.shared.sources[2] === "shared-routing.js"
    && coreSourceByDomain.shared.sources[3] === "shared-transitions.js"
    && coreSourceByDomain.shared.sources[4] === "shared-page-lifecycle.js"
    && coreSourceByDomain.shared.sources[5] === "shared-home-summary.js"
    && coreSourceByDomain.shared.sources[6] === "shared.js"
`,
  `    && coreSourceByDomain.shared?.sources?.length === 8
    && coreSourceByDomain.shared.sources[1] === "shared-session.js"
    && coreSourceByDomain.shared.sources[2] === "shared-routing.js"
    && coreSourceByDomain.shared.sources[3] === "shared-transitions.js"
    && coreSourceByDomain.shared.sources[4] === "shared-page-lifecycle.js"
    && coreSourceByDomain.shared.sources[5] === "shared-home-summary.js"
    && coreSourceByDomain.shared.sources[6] === "shared-table-state.js"
    && coreSourceByDomain.shared.sources[7] === "shared.js"
`,
);

await replace(
  "site/validate-core-source-ownership.mjs",
  `  sharedEntry?.source === "shared-foundations.js"
    && sharedEntry?.sources?.length === 7
    && sharedEntry.sources[0] === "shared-foundations.js"
    && sharedEntry.sources[1] === "shared-session.js"
    && sharedEntry.sources[2] === "shared-routing.js"
    && sharedEntry.sources[3] === "shared-transitions.js"
    && sharedEntry.sources[4] === "shared-page-lifecycle.js"
    && sharedEntry.sources[5] === "shared-home-summary.js"
    && sharedEntry.sources[6] === "shared.js"
    && sharedEntry.maxUniversalBytes === 355000,
  "Shared core must keep foundations before session before routing before transitions before page lifecycle before Home summary before remaining shared behavior and retain the explicit 355000-byte universal no-growth ceiling.",
);
const sharedFoundations = await read("./modules/core-sources/shared-foundations.js");
const sharedSession = await read("./modules/core-sources/shared-session.js");
const sharedRouting = await read("./modules/core-sources/shared-routing.js");
const sharedTransitions = await read("./modules/core-sources/shared-transitions.js");
const sharedPageLifecycle = await read("./modules/core-sources/shared-page-lifecycle.js");
const sharedHomeSummary = await read("./modules/core-sources/shared-home-summary.js");
const sharedNavigation = await read("./modules/core-sources/shared.js");
`,
  `  sharedEntry?.source === "shared-foundations.js"
    && sharedEntry?.sources?.length === 8
    && sharedEntry.sources[0] === "shared-foundations.js"
    && sharedEntry.sources[1] === "shared-session.js"
    && sharedEntry.sources[2] === "shared-routing.js"
    && sharedEntry.sources[3] === "shared-transitions.js"
    && sharedEntry.sources[4] === "shared-page-lifecycle.js"
    && sharedEntry.sources[5] === "shared-home-summary.js"
    && sharedEntry.sources[6] === "shared-table-state.js"
    && sharedEntry.sources[7] === "shared.js"
    && sharedEntry.maxUniversalBytes === 355000,
  "Shared core must keep foundations before session before routing before transitions before page lifecycle before Home summary before table state before remaining shared behavior and retain the explicit 355000-byte universal no-growth ceiling.",
);
const sharedFoundations = await read("./modules/core-sources/shared-foundations.js");
const sharedSession = await read("./modules/core-sources/shared-session.js");
const sharedRouting = await read("./modules/core-sources/shared-routing.js");
const sharedTransitions = await read("./modules/core-sources/shared-transitions.js");
const sharedPageLifecycle = await read("./modules/core-sources/shared-page-lifecycle.js");
const sharedHomeSummary = await read("./modules/core-sources/shared-home-summary.js");
const sharedTableState = await read("./modules/core-sources/shared-table-state.js");
const sharedNavigation = await read("./modules/core-sources/shared.js");
`,
);

await replace(
  "site/validate-core-source-ownership.mjs",
  `invariant(
  sharedNavigation.startsWith("function tablePageKey(pageName = state.currentPage) {"),
  "Remaining Shared behavior must begin at the canonical table navigation/view-state boundary.",
);
invariant(
  !sharedFoundations.includes("function normalizeSettingsTheme")
    && !sharedSession.includes("function playerIdFromUrl")
    && !sharedRouting.includes("function currentNavigationPath")
    && !sharedTransitions.includes("function resetPageScroll")
    && !sharedPageLifecycle.includes("function updateStatusDate")
    && !sharedHomeSummary.includes("function tablePageKey"),
  "Shared foundations, session, routing, transitions, page lifecycle, and Home summary must not absorb later ownership domains.",
);
`,
  `invariant(
  sharedTableState.startsWith("function tablePageKey(pageName = state.currentPage) {")
    && sharedTableState.replace(/\\s*$/, "").endsWith("selectedPlayerIds: [],\\n  };\\n}"),
  "Shared table state must own table navigation/view/sort-session behavior through canonical default table-page state.",
);
invariant(
  sharedNavigation.startsWith("function scheduleToastHide(toast) {"),
  "Remaining Shared behavior must begin at the canonical toast-presentation boundary.",
);
invariant(
  !sharedFoundations.includes("function normalizeSettingsTheme")
    && !sharedSession.includes("function playerIdFromUrl")
    && !sharedRouting.includes("function currentNavigationPath")
    && !sharedTransitions.includes("function resetPageScroll")
    && !sharedPageLifecycle.includes("function updateStatusDate")
    && !sharedHomeSummary.includes("function tablePageKey")
    && !sharedTableState.includes("function scheduleToastHide"),
  "Shared foundations, session, routing, transitions, page lifecycle, Home summary, and table state must not absorb later ownership domains.",
);
`,
);
