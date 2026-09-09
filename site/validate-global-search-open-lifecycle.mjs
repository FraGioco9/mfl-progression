import { invariant } from "./validation/assertions.mjs";
import { readCombinedCanonicalCoreSource } from "./validate-core-sources.mjs";

const sourceCore = readCombinedCanonicalCoreSource();

invariant(
  sourceCore.includes("const renderAuthoritativeRecentSearches = async () => {")
    && sourceCore.includes("const renderRecent = window.__mflGlobalSearchRuntime?.recent;")
    && sourceCore.includes("return Boolean(await renderRecent());")
    && sourceCore.includes("if (!await renderAuthoritativeRecentSearches()) renderSearchResultsNow();"),
  "Canonical Global Search source must delegate the empty-state render to the recent-five runtime before falling back to mutable live search indexes.",
);

invariant(
  sourceCore.includes("const renderAuthoritativeRecentSearches = async () => {")
    && sourceCore.includes("void renderAuthoritativeRecentSearches().then((rendered) => {")
    && sourceCore.includes("if (!rendered && !playerSearchInput.value.trim()) renderSearchResultsNow();")
    && sourceCore.includes("await ensureSearchIndexes();\n  if (!await renderAuthoritativeRecentSearches()) renderSearchResultsNow();")
    && !sourceCore.includes("await ensureSearchIndexes();\n  renderSearchResultsNow();\n}"),
  "After search indexes become ready, openSearch must not overwrite canonical recent-five cards with whichever typed results remain in the mutable live indexes.",
);

invariant(
  sourceCore.includes("return [...playerResults, ...agentResults].slice(0, 10);")
    && sourceCore.includes("const clubResults = clubs.slice(0, query ? 10 : 5).map(clubSearchResult);")
    && sourceCore.includes("const mergedResults = [\n      ...playerResults,\n      ...clubResults,\n      ...agentResults,\n    ].slice(0, 10);")
    && !sourceCore.includes("return [...playerResults.slice(0, 5), ...agentResults.slice(0, 5)];")
    && !sourceCore.includes("...playerResults.slice(0, 5),\n      ...clubResults,\n      ...agentResults.slice(0, 5),"),
  "Typed Global Search must use one ten-result budget across players, clubs and agents instead of reserving five-result category buckets.",
);

const mergedResultsStart = sourceCore.indexOf("const mergedResults = [\n      ...playerResults,\n      ...clubResults,\n      ...agentResults,");
invariant(
  mergedResultsStart >= 0,
  "Typed Global Search must preserve player -> club -> agent category priority while applying the shared ten-result cap.",
);

console.log("Global Search keeps canonical recents authoritative and uses one shared ten-result typed-result budget across players, clubs and agents.");
