import { invariant } from "./validation/assertions.mjs";
import { access } from "node:fs/promises";

import { coreSourceManifest } from "./modules/core-source-manifest.js";
import { readValidationText } from "./validation-text.mjs";

const read = (path) => readValidationText(path, import.meta.url);

const build = await read("./build-app-core.mjs");
invariant(build.includes('import { coreSourceManifest } from "./modules/core-source-manifest.js";'), "Application-core build must consume the canonical core source manifest.");
invariant(build.includes("for (const entry of coreSourceManifest)"), "Application-core build must generate every canonical source-fragment domain from the manifest.");
invariant(build.includes('resolve(siteRoot, "modules", "core-sources", sourceName)'), "Application-core build must resolve every ordered canonical source fragment from manifest entries.");
invariant(build.includes('sourceParts.join("\\n\\n")'), "Application-core build must concatenate ordered source fragments without behavior transforms.");
invariant(!build.includes("app-core-build-normalizer"), "Application-core build must not depend on behavior-changing normalizers.");
invariant(!build.includes("replaceRequired"), "Application-core build must not perform source-string behavior rewrites.");
invariant(!build.includes("modules/app-core.js"), "Application-core build must not depend on the retired monolith.");
invariant(build.includes("entry.maxUniversalBytes !== null"), "Application-core build must enforce the universal shared-core ceiling when one is configured.");

const domains = new Set();
const ownedSources = new Set();
for (const entry of coreSourceManifest) {
  invariant(!domains.has(entry.domain), `Core source manifest domain must be unique: ${entry.domain}.`);
  domains.add(entry.domain);
  invariant(Array.isArray(entry.sources) && entry.sources.length > 0, `Core source ${entry.domain} must define at least one ordered canonical source fragment.`);
  invariant(Object.isFrozen(entry.sources), `Core source ${entry.domain} fragment order must be immutable.`);
  invariant(entry.source === entry.sources[0], `Core source ${entry.domain} compatibility source alias must reference its first ordered fragment.`);
  for (const sourceName of entry.sources) {
    invariant(typeof sourceName === "string" && sourceName.endsWith(".js"), `Core source ${entry.domain} has an invalid fragment name.`);
    invariant(!ownedSources.has(sourceName), `Canonical core source fragment must have one domain owner: ${sourceName}.`);
    ownedSources.add(sourceName);
  }
  invariant(
    entry.maxUniversalBytes === null || (Number.isInteger(entry.maxUniversalBytes) && entry.maxUniversalBytes > 0),
    `Core source ${entry.domain} must define either no byte ceiling or a positive universal ownership ceiling.`,
  );
  invariant(String(entry.banner || "").includes("Do not edit directly"), `Core source ${entry.domain} must define a generated ownership banner.`);
  if (entry.domain !== "shared") {
    invariant(entry.maxUniversalBytes === null, `Route/domain source ${entry.domain} must not use an arbitrary hard byte ceiling; ownership and lazy loading are the architectural boundary.`);
  }

  const sourceParts = await Promise.all(entry.sources.map((sourceName) => read(`./modules/core-sources/${sourceName}`)));
  const source = sourceParts.map((part) => part.replace(/\s*$/, "")).join("\n\n");
  const runtime = await read(`./modules/${entry.runtime}`);
  invariant(runtime.startsWith(entry.banner), `Generated ${entry.runtime} must carry the manifest-owned banner.`);
  invariant(
    runtime.slice(entry.banner.length).replace(/\s*$/, "") === source,
    `Generated ${entry.runtime} must exactly match the ordered canonical fragments: ${entry.sources.join(", ")}.`,
  );
  if (entry.maxUniversalBytes !== null) {
    invariant(
      Buffer.byteLength(source, "utf8") <= entry.maxUniversalBytes,
      `Canonical ${entry.domain} source fragments exceeded the universal ownership ceiling.`,
    );
  }
}

const sharedEntry = coreSourceManifest.find(({ domain }) => domain === "shared");
invariant(
  sharedEntry?.source === "shared-foundations.js"
    && sharedEntry?.sources?.length === 9
    && sharedEntry.sources[0] === "shared-foundations.js"
    && sharedEntry.sources[1] === "shared-session.js"
    && sharedEntry.sources[2] === "shared-routing.js"
    && sharedEntry.sources[3] === "shared-transitions.js"
    && sharedEntry.sources[4] === "shared-page-lifecycle.js"
    && sharedEntry.sources[5] === "shared-home-summary.js"
    && sharedEntry.sources[6] === "shared-table-state.js"
    && sharedEntry.sources[7] === "shared-toast-core.js"
    && sharedEntry.sources[8] === "shared.js"
    && sharedEntry.maxUniversalBytes === 355000,
  "Shared core must keep foundations before session before routing before transitions before page lifecycle before Home summary before table state before generic toast core before remaining shared behavior and retain the explicit 355000-byte universal no-growth ceiling.",
);
const sharedFoundations = await read("./modules/core-sources/shared-foundations.js");
const sharedSession = await read("./modules/core-sources/shared-session.js");
const sharedRouting = await read("./modules/core-sources/shared-routing.js");
const sharedTransitions = await read("./modules/core-sources/shared-transitions.js");
const sharedPageLifecycle = await read("./modules/core-sources/shared-page-lifecycle.js");
const sharedHomeSummary = await read("./modules/core-sources/shared-home-summary.js");
const sharedTableState = await read("./modules/core-sources/shared-table-state.js");
const sharedToastCore = await read("./modules/core-sources/shared-toast-core.js");
const sharedNavigation = await read("./modules/core-sources/shared.js");
invariant(
  sharedFoundations.replace(/\s*$/, "").endsWith('const openSelectedLinksButton = document.querySelector("#openSelectedLinksButton");'),
  "Shared foundations must end at the canonical DOM-binding boundary.",
);
invariant(
  sharedSession.startsWith('function normalizeSettingsTheme(value, fallback = "dark") {'),
  "Shared session must begin at the canonical behavior boundary.",
);
invariant(
  sharedSession.replace(/\s*$/, "").endsWith("function toggleMenu() {\n  updateMenuVisibility();\n}"),
  "Shared session must end at the canonical shell/session boundary.",
);
invariant(
  sharedRouting.startsWith("function playerIdFromUrl() {")
    && sharedRouting.replace(/\s*$/, "").endsWith("let navigationTransitionSequence = 0;"),
  "Shared routing must own URL parsing/path construction through the transition-state boundary.",
);
invariant(
  sharedTransitions.startsWith("function currentNavigationPath() {")
    && sharedTransitions.replace(/\s*$/, "").endsWith('Reflect.set(window, "__mflWaitForViewTransitionPaint", waitForViewTransitionPaint);'),
  "Shared transitions must own canonical transition execution through the published transition facade.",
);
invariant(
  sharedPageLifecycle.startsWith("function resetPageScroll() {")
    && sharedPageLifecycle.replace(/\s*$/, "").endsWith("syncHomeLoginButton();\n}"),
  "Shared page lifecycle must own reset-scroll through the canonical setPage boundary.",
);
invariant(
  sharedHomeSummary.startsWith("function updateStatusDate(generatedAt) {")
    && sharedHomeSummary.replace(/\s*$/, "").endsWith("summaryLoadPromise = null;\n  return result;\n}"),
  "Shared Home summary must own status/count presentation through canonical summary loading.",
);
invariant(
  sharedTableState.startsWith("function tablePageKey(pageName = state.currentPage) {")
    && sharedTableState.replace(/\s*$/, "").endsWith("selectedPlayerIds: [],\n  };\n}"),
  "Shared table state must own table navigation/view/sort-session behavior through canonical default table-page state.",
);
invariant(
  sharedToastCore.startsWith("function scheduleToastHide(toast) {")
    && sharedToastCore.replace(/\s*$/, "").endsWith("scheduleToastHide(toast);\n  }\n}"),
  "Shared toast core must own generic toast lifecycle/presentation through canonical showToast().",
);
invariant(
  sharedNavigation.startsWith("function showWatchlistToast("),
  "Remaining Shared behavior must begin at the watchlist-specific toast boundary.",
);
invariant(
  !sharedFoundations.includes("function normalizeSettingsTheme")
    && !sharedSession.includes("function playerIdFromUrl")
    && !sharedRouting.includes("function currentNavigationPath")
    && !sharedTransitions.includes("function resetPageScroll")
    && !sharedPageLifecycle.includes("function updateStatusDate")
    && !sharedHomeSummary.includes("function tablePageKey")
    && !sharedTableState.includes("function scheduleToastHide")
    && !sharedToastCore.includes("function showWatchlistToast"),
  "Shared foundations, session, routing, transitions, page lifecycle, Home summary, table state, and generic toast core must not absorb later ownership domains.",
);

const retiredFiles = [
  "app-core-build-normalizer.js",
  "app-core-splitter-utils.js",
  "app-core-route-chunks.js",
  "app-core-sidebar-lifecycle.js",
  "app-core-evaluation-chunk.js",
  "app-core-evaluation-snapshot-edit-route.js",
  "app-core-settings-chunk.js",
  "app-core-settings-email-reset.js",
  "app-core-player-chunk.js",
  "app-core-filter-control-state.js",
  "app-core-table-chunk.js",
  "app-core-mobile-table.js",
  "app-core-table-row-centering.js",
  "app-core-wallet-chunk.js",
  "app-core-watchlist-route-chunk.js",
  "app-core-stats-route-ownership.js",
];
for (const file of retiredFiles) {
  try {
    await access(new URL(`./modules/${file}`, import.meta.url));
    throw new Error(`Retired application-core implementation must stay deleted: modules/${file}`);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
}

console.log("Canonical application-core manifest, ordered source-fragment ownership, Shared foundations/session/navigation boundaries, generated equivalence, universal shared-core ceiling, domain ownership, and retired implementation cleanup validation passed.");
