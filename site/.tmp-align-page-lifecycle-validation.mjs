import { readFile, writeFile } from "node:fs/promises";

async function replace(path, oldText, newText) {
  const source = await readFile(path, "utf8");
  if (!source.includes(oldText)) throw new Error(`Missing migration anchor in ${path}`);
  await writeFile(path, source.replace(oldText, newText), "utf8");
}

await replace(
  "site/validate.mjs",
  `    && sharedCoreManifest?.sources?.length === 5\n    && sharedCoreManifest.sources[0] === "shared-foundations.js"\n    && sharedCoreManifest.sources[1] === "shared-session.js"\n    && sharedCoreManifest.sources[2] === "shared-routing.js"\n    && sharedCoreManifest.sources[3] === "shared-transitions.js"\n    && sharedCoreManifest.sources[4] === "shared.js"\n`,
  `    && sharedCoreManifest?.sources?.length === 6\n    && sharedCoreManifest.sources[0] === "shared-foundations.js"\n    && sharedCoreManifest.sources[1] === "shared-session.js"\n    && sharedCoreManifest.sources[2] === "shared-routing.js"\n    && sharedCoreManifest.sources[3] === "shared-transitions.js"\n    && sharedCoreManifest.sources[4] === "shared-page-lifecycle.js"\n    && sharedCoreManifest.sources[5] === "shared.js"\n`,
);

await replace(
  "site/validate-club-route-core.mjs",
  `    && coreSourceByDomain.shared?.sources?.length === 5\n    && coreSourceByDomain.shared.sources[1] === "shared-session.js"\n    && coreSourceByDomain.shared.sources[2] === "shared-routing.js"\n    && coreSourceByDomain.shared.sources[3] === "shared-transitions.js"\n    && coreSourceByDomain.shared.sources[4] === "shared.js"\n`,
  `    && coreSourceByDomain.shared?.sources?.length === 6\n    && coreSourceByDomain.shared.sources[1] === "shared-session.js"\n    && coreSourceByDomain.shared.sources[2] === "shared-routing.js"\n    && coreSourceByDomain.shared.sources[3] === "shared-transitions.js"\n    && coreSourceByDomain.shared.sources[4] === "shared-page-lifecycle.js"\n    && coreSourceByDomain.shared.sources[5] === "shared.js"\n`,
);

await replace(
  "site/validate-core-source-ownership.mjs",
  `  sharedEntry?.source === "shared-foundations.js"\n    && sharedEntry?.sources?.length === 5\n    && sharedEntry.sources[0] === "shared-foundations.js"\n    && sharedEntry.sources[1] === "shared-session.js"\n    && sharedEntry.sources[2] === "shared-routing.js"\n    && sharedEntry.sources[3] === "shared-transitions.js"\n    && sharedEntry.sources[4] === "shared.js"\n    && sharedEntry.maxUniversalBytes === 355000,\n  "Shared core must keep foundations before session before routing before transitions before page lifecycle and retain the explicit 355000-byte universal no-growth ceiling.",\n);\nconst sharedFoundations = await read("./modules/core-sources/shared-foundations.js");\nconst sharedSession = await read("./modules/core-sources/shared-session.js");\nconst sharedRouting = await read("./modules/core-sources/shared-routing.js");\nconst sharedTransitions = await read("./modules/core-sources/shared-transitions.js");\nconst sharedNavigation = await read("./modules/core-sources/shared.js");\n`,
  `  sharedEntry?.source === "shared-foundations.js"\n    && sharedEntry?.sources?.length === 6\n    && sharedEntry.sources[0] === "shared-foundations.js"\n    && sharedEntry.sources[1] === "shared-session.js"\n    && sharedEntry.sources[2] === "shared-routing.js"\n    && sharedEntry.sources[3] === "shared-transitions.js"\n    && sharedEntry.sources[4] === "shared-page-lifecycle.js"\n    && sharedEntry.sources[5] === "shared.js"\n    && sharedEntry.maxUniversalBytes === 355000,\n  "Shared core must keep foundations before session before routing before transitions before page lifecycle before remaining shared behavior and retain the explicit 355000-byte universal no-growth ceiling.",\n);\nconst sharedFoundations = await read("./modules/core-sources/shared-foundations.js");\nconst sharedSession = await read("./modules/core-sources/shared-session.js");\nconst sharedRouting = await read("./modules/core-sources/shared-routing.js");\nconst sharedTransitions = await read("./modules/core-sources/shared-transitions.js");\nconst sharedPageLifecycle = await read("./modules/core-sources/shared-page-lifecycle.js");\nconst sharedNavigation = await read("./modules/core-sources/shared.js");\n`,
);

await replace(
  "site/validate-core-source-ownership.mjs",
  `invariant(\n  sharedNavigation.startsWith("function resetPageScroll() {"),\n  "Shared page lifecycle must begin at the canonical reset-scroll boundary.",\n);\ninvariant(\n  !sharedFoundations.includes("function normalizeSettingsTheme")\n    && !sharedSession.includes("function playerIdFromUrl")\n    && !sharedRouting.includes("function currentNavigationPath")\n    && !sharedTransitions.includes("function resetPageScroll"),\n  "Shared foundations, session, routing, and transitions must not absorb later ownership domains.",\n);\n`,
  `invariant(\n  sharedPageLifecycle.startsWith("function resetPageScroll() {")\n    && sharedPageLifecycle.replace(/\\s*$/, "").endsWith("syncHomeLoginButton();\\n}"),\n  "Shared page lifecycle must own reset-scroll through the canonical setPage boundary.",\n);\ninvariant(\n  sharedNavigation.startsWith("function updateStatusDate(generatedAt) {"),\n  "Remaining Shared behavior must begin at the canonical Home-summary boundary.",\n);\ninvariant(\n  !sharedFoundations.includes("function normalizeSettingsTheme")\n    && !sharedSession.includes("function playerIdFromUrl")\n    && !sharedRouting.includes("function currentNavigationPath")\n    && !sharedTransitions.includes("function resetPageScroll")\n    && !sharedPageLifecycle.includes("function updateStatusDate"),\n  "Shared foundations, session, routing, transitions, and page lifecycle must not absorb later ownership domains.",\n);\n`,
);

await replace(
  "site/validate-home-summary-first-paint.mjs",
  `import { readCanonicalCoreArtifacts } from "./validate-core-sources.mjs";`,
  `import { readCanonicalCoreArtifacts, readCombinedCanonicalCoreSource } from "./validate-core-sources.mjs";`,
);
await replace(
  "site/validate-home-summary-first-paint.mjs",
  `  Promise.all([\n    read("./modules/core-sources/shared.js"),\n    read("./modules/core-sources/evaluation.js"),\n    read("./modules/core-sources/mfl-stats.js"),\n    read("./modules/core-sources/club.js"),\n    read("./modules/core-sources/settings.js"),\n    read("./modules/core-sources/player.js"),\n    read("./modules/core-sources/table.js"),\n    read("./modules/core-sources/wallet.js"),\n    read("./modules/core-sources/watchlist.js"),\n  ]).then((parts) => parts.join("\\n")),`,
  `  readCombinedCanonicalCoreSource(),`,
);

await replace(
  "site/validate-eval-ownership.mjs",
  `import { readValidationText } from "./validation-text.mjs";`,
  `import { readValidationText } from "./validation-text.mjs";\nimport { readCombinedCanonicalCoreSource } from "./validate-core-sources.mjs";`,
);
await replace(
  "site/validate-eval-ownership.mjs",
  `  Promise.all([\n    read("./modules/core-sources/shared.js"),\n    read("./modules/core-sources/evaluation.js"),\n    read("./modules/core-sources/mfl-stats.js"),\n    read("./modules/core-sources/club.js"),\n    read("./modules/core-sources/settings.js"),\n    read("./modules/core-sources/player.js"),\n    read("./modules/core-sources/table.js"),\n    read("./modules/core-sources/wallet.js"),\n    read("./modules/core-sources/watchlist.js"),\n  ]).then((parts) => parts.join("\\n")),`,
  `  readCombinedCanonicalCoreSource(),`,
);

await replace(
  "site/validate-header-selection-loading.mjs",
  `import { readFile } from "node:fs/promises";`,
  `import { readFile } from "node:fs/promises";\nimport { readCombinedCanonicalCoreSource } from "./validate-core-sources.mjs";`,
);
await replace(
  "site/validate-header-selection-loading.mjs",
  `  read("./modules/core-sources/shared.js"),`,
  `  readCombinedCanonicalCoreSource(),`,
);
