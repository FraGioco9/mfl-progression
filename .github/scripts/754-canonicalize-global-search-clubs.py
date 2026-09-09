from pathlib import Path

root = Path('site')

# 1. Make Club results a first-class part of the canonical Global Search owner.
path = root / 'modules/core-sources/shared-global-search.js'
text = path.read_text(encoding='utf-8').replace('\r\n', '\n').replace('\r', '\n')

player_anchor = '''function playerSearchResult(row) {\n  return { type: "player", row };\n}\n\nfunction searchMatchScore(query, primaryText, secondaryText = "") {'''
player_replacement = '''function playerSearchResult(row) {\n  return { type: "player", row };\n}\n\nfunction clubSearchResult(entry) {\n  return { type: "club", entry };\n}\n\nfunction searchMatchScore(query, primaryText, secondaryText = "") {'''
assert text.count(player_anchor) == 1, 'Global Search player-result anchor moved.'
text = text.replace(player_anchor, player_replacement)

old_budget = '''  // Keep category priority while giving typed Global Search one shared ten-result budget.\n  // The club-search enhancer will insert clubs between players and agents before applying\n  // the same overall cap.\n  return [...playerResults, ...agentResults].slice(0, 10);'''
new_budget = '''  const clubResults = state.clubSearchIndex\n    .filter((club) => club.searchText.includes(query))\n    .sort((a, b) => (\n      (a.division ?? Number.POSITIVE_INFINITY) - (b.division ?? Number.POSITIVE_INFINITY)\n      || a.name.localeCompare(b.name)\n    ))\n    .slice(0, 10)\n    .map(clubSearchResult);\n\n  // Keep player -> club -> agent priority with one shared ten-result budget.\n  return [\n    ...playerResults,\n    ...clubResults,\n    ...agentResults,\n  ].slice(0, 10);'''
assert text.count(old_budget) == 1, 'Typed Global Search budget anchor moved.'
text = text.replace(old_budget, new_budget)

old_recent = '''  return items.map((item) => {\n    if (item.startsWith("club:")) {\n      return null;\n    }'''
new_recent = '''  return items.slice(0, 5).map((item) => {\n    if (item.startsWith("club:")) {\n      const clubId = item.slice(5);\n      const entry = state.clubSearchIndex.find((club) => club.clubId === clubId);\n      return entry ? clubSearchResult(entry) : null;\n    }'''
assert text.count(old_recent) == 1, 'Recent Club fallback anchor moved.'
text = text.replace(old_recent, new_recent)

render_anchor = '''    button.type = "button";\n    button.className = "searchResult";\n\n    if (result.type === "agent") {'''
render_replacement = '''    button.type = "button";\n    button.className = "searchResult";\n\n    if (result.type === "club") {\n      const entry = result.entry;\n      const division = contractDivisionInfo(entry.division);\n      const divisionHtml = division\n        ? ` &middot; <span class="clubSearchDivision" style="color:${escapeHtml(division.color)}">${escapeHtml(division.name)}</span>`\n        : "";\n      button.classList.add("clubSearchResult");\n      button.dataset.clubId = entry.clubId;\n      button.dataset.searchKey = recentClubKey(entry.clubId);\n      button.innerHTML = `<strong>${escapeHtml(entry.name)}</strong><span>Club &middot; #${escapeHtml(entry.clubId)}${divisionHtml}</span>`;\n      button.addEventListener("click", () => {\n        closeSearch();\n        if (typeof window.mflOpenClubPage === "function") {\n          void window.mflOpenClubPage(entry.clubId, "attributes");\n        }\n      });\n      fragment.appendChild(button);\n      return;\n    }\n\n    if (result.type === "agent") {'''
assert text.count(render_anchor) == 1, 'Global Search render branch anchor moved.'
text = text.replace(render_anchor, render_replacement)
path.write_text(text, encoding='utf-8')

# 2. Retire the two early compatibility IIFEs and the later Club-render wrapper.
path = root / 'modules/core-sources/shared.js'
source = path.read_text(encoding='utf-8').replace('\r\n', '\n').replace('\r', '\n')
assert source.startswith(';(() => {'), 'Remaining Shared head moved before Club compatibility cleanup.'
layout_start = source.index('function syncLayoutCenter() {')
retired_prefix = source[:layout_start]
for marker in [
    '__mflUniversalClubSearch',
    'renderSearchResultsNowWithUniversalClubs',
    'renderSearchResultsNowV1500',
    'RECENT_CLUBS_STORAGE_KEY',
    'mfl-recent-search-clubs',
    'function createChangelogItem()',
]:
    assert marker in retired_prefix, f'Missing expected retired compatibility marker: {marker}'
source = source[layout_start:]

original_render_capture = '  const originalRenderSearchResultsNow = renderSearchResultsNow;\n'
assert source.count(original_render_capture) == 1, 'Incremental renderSearchResultsNow capture changed.'
source = source.replace(original_render_capture, '', 1)

club_start = source.index('  function divisionInfo(divisionValue) {')
loader_start = source.index('  window.mflLoadIncrementalRoutePage = async function loadIncrementalRoutePage', club_start)
retired_club_block = source[club_start:loader_start]
for marker in [
    'function clubSearchResult(entry)',
    'function injectBootstrapClubResults()',
    'function prioritizeTypedSearchResults()',
    'renderSearchResultsFromBootstrap',
]:
    assert marker in retired_club_block, f'Missing late Club wrapper marker: {marker}'
source = source[:club_start] + source[loader_start:]

for marker in [
    '__mflUniversalClubSearch',
    'renderSearchResultsNowWithUniversalClubs',
    'renderSearchResultsNowV1500',
    'renderSearchResultsFromBootstrap',
    'injectBootstrapClubResults',
    'prioritizeTypedSearchResults',
    'RECENT_CLUBS_STORAGE_KEY',
    'mfl-recent-search-clubs',
]:
    assert marker not in source, f'Retired Global Search compatibility marker remains: {marker}'
assert source.startswith('function syncLayoutCenter() {')
path.write_text(source, encoding='utf-8')

# 3. Update ownership validation: Club behavior is canonical Global Search; final Shared advances to layout centering.
path = root / 'validate-core-source-ownership.mjs'
ownership = path.read_text(encoding='utf-8')
old_global = '''invariant(\n  sharedGlobalSearch.startsWith("async function openSearch() {")\n    && sharedGlobalSearch.replace(/\\s*$/, "").endsWith("  })();\\n}"),\n  "Shared Global Search must own open/close, matching, recent promotion, navigation, clear state, and result rendering through renderSearchResults().",\n);'''
new_global = '''invariant(\n  sharedGlobalSearch.startsWith("async function openSearch() {")\n    && sharedGlobalSearch.includes("function clubSearchResult(entry) {")\n    && sharedGlobalSearch.includes("const clubResults = state.clubSearchIndex")\n    && sharedGlobalSearch.includes('void window.mflOpenClubPage(entry.clubId, "attributes");')\n    && sharedGlobalSearch.replace(/\\s*$/, "").endsWith("  })();\\n}"),\n  "Shared Global Search must own open/close, Player/Club/Agent matching, mixed recents, navigation, clear state, and result rendering through renderSearchResults().",\n);'''
assert ownership.count(old_global) == 1, 'Global Search ownership invariant moved.'
ownership = ownership.replace(old_global, new_global)
old_remaining = '''invariant(\n  sharedRemaining.startsWith(";(() => {")\n    && !sharedRemaining.includes("function csvEscape")\n    && !sharedRemaining.includes("function mflChunkFromPublicData")\n    && !sharedRemaining.includes("function progressionDataColumns"),\n  "Remaining Shared behavior must begin at the universal Club-search compatibility boundary and keep unused serialization/data helpers retired.",\n);'''
new_remaining = '''invariant(\n  sharedRemaining.startsWith("function syncLayoutCenter() {")\n    && !sharedRemaining.includes("__mflUniversalClubSearch")\n    && !sharedRemaining.includes("renderSearchResultsNowV1500")\n    && !sharedRemaining.includes("renderSearchResultsFromBootstrap")\n    && !sharedRemaining.includes("mfl-recent-search-clubs")\n    && !sharedRemaining.includes("function csvEscape")\n    && !sharedRemaining.includes("function mflChunkFromPublicData")\n    && !sharedRemaining.includes("function progressionDataColumns"),\n  "Remaining Shared behavior must begin at the layout-centering/late-runtime boundary with legacy Club-search wrappers and unused serialization/data helpers retired.",\n);'''
assert ownership.count(old_remaining) == 1, 'Remaining Shared boundary invariant moved.'
ownership = ownership.replace(old_remaining, new_remaining)
old_guard = '    && !sharedStartupLifecycle.includes("__mflUniversalClubSearch"),'
new_guard = '    && !sharedStartupLifecycle.includes("function syncLayoutCenter"),'
assert ownership.count(old_guard) == 1, 'Startup-to-remaining ownership guard moved.'
ownership = ownership.replace(old_guard, new_guard)
path.write_text(ownership, encoding='utf-8')

# 4. Update behavior validators from wrapper implementation to direct canonical ownership.
path = root / 'validate-global-search-open-lifecycle.mjs'
validation = path.read_text(encoding='utf-8')
old_budget_validation = '''invariant(\n  sourceCore.includes("return [...playerResults, ...agentResults].slice(0, 10);")\n    && sourceCore.includes("const clubResults = clubs.slice(0, query ? 10 : 5).map(clubSearchResult);")\n    && sourceCore.includes("const mergedResults = [\\n      ...playerResults,\\n      ...clubResults,\\n      ...agentResults,\\n    ].slice(0, 10);")\n    && !sourceCore.includes("return [...playerResults.slice(0, 5), ...agentResults.slice(0, 5)];")\n    && !sourceCore.includes("...playerResults.slice(0, 5),\\n      ...clubResults,\\n      ...agentResults.slice(0, 5),"),\n  "Typed Global Search must use one ten-result budget across players, clubs and agents instead of reserving five-result category buckets.",\n);\n\nconst mergedResultsStart = sourceCore.indexOf("const mergedResults = [\\n      ...playerResults,\\n      ...clubResults,\\n      ...agentResults,");\ninvariant(\n  mergedResultsStart >= 0,\n  "Typed Global Search must preserve player -> club -> agent category priority while applying the shared ten-result cap.",\n);'''
new_budget_validation = '''invariant(\n  sourceCore.includes("const clubResults = state.clubSearchIndex")\n    && sourceCore.includes(".slice(0, 10)\\n    .map(clubSearchResult);")\n    && sourceCore.includes("return [\\n    ...playerResults,\\n    ...clubResults,\\n    ...agentResults,\\n  ].slice(0, 10);")\n    && sourceCore.includes("return items.slice(0, 5).map((item) => {")\n    && sourceCore.includes('if (item.startsWith("club:")) {')\n    && !sourceCore.includes("__mflUniversalClubSearch")\n    && !sourceCore.includes("renderSearchResultsNowV1500")\n    && !sourceCore.includes("renderSearchResultsFromBootstrap"),\n  "Typed Global Search must own Player/Club/Agent merging directly with one ten-result budget and no wrapper-based Club enhancer.",\n);\n\nconst mergedResultsStart = sourceCore.indexOf("return [\\n    ...playerResults,\\n    ...clubResults,\\n    ...agentResults,");\ninvariant(\n  mergedResultsStart >= 0,\n  "Typed Global Search must preserve player -> club -> agent category priority while applying the shared ten-result cap.",\n);'''
assert validation.count(old_budget_validation) == 1, 'Global Search typed-budget validation moved.'
path.write_text(validation.replace(old_budget_validation, new_budget_validation), encoding='utf-8')

path = root / 'validate-global-search-results.mjs'
validation = path.read_text(encoding='utf-8')
old_recent_validation = '''invariant(\n  core.includes("const MAX_SEARCH_RESULTS = 5;")\n    && core.includes("state.recentSearchItems.slice(0, MAX_SEARCH_RESULTS).forEach((key) => {")\n    && core.includes("playerSearchResults.replaceChildren(...ordered.slice(0, MAX_SEARCH_RESULTS));"),\n  "Empty Global Search must render only the five most recent mixed player, club, or agent searches.",\n);'''
new_recent_validation = '''invariant(\n  core.includes("return items.slice(0, 5).map((item) => {")\n    && core.includes('if (item.startsWith("club:")) {')\n    && core.includes("const entry = state.clubSearchIndex.find((club) => club.clubId === clubId);")\n    && core.includes("return entry ? clubSearchResult(entry) : null;")\n    && !core.includes('const RECENT_CLUBS_STORAGE_KEY = "mfl-recent-search-clubs";')\n    && !core.includes("renderSearchResultsNowV1500")\n    && !core.includes("renderSearchResultsFromBootstrap"),\n  "Empty Global Search must render only the five canonical mixed Player, Club, or Agent recents without browser-stored Club history or render wrappers.",\n);'''
assert validation.count(old_recent_validation) == 1, 'Global Search recent-five validation moved.'
path.write_text(validation.replace(old_recent_validation, new_recent_validation), encoding='utf-8')

path = root / 'validate-club-route-core.mjs'
validation = path.read_text(encoding='utf-8')
old = '''includes(sharedCore, "renderSearchResultsNowWithUniversalClubs", "Universal Club search must remain available from shared core.");\nincludes(sharedCore, 'void window.mflOpenClubPage(clubId, "attributes")', "Universal Club search must navigate through the stable lazy Club gate.");'''
new = '''includes(sharedCore, "function clubSearchResult(entry) {", "Universal Club search must be owned directly by the canonical Global Search core.");\nincludes(sharedCore, 'void window.mflOpenClubPage(entry.clubId, "attributes")', "Universal Club search must navigate through the stable lazy Club gate.");\nexcludes(sharedCore, "renderSearchResultsNowWithUniversalClubs", "Retired wrapper-based Club search ownership must stay removed.");\nexcludes(sharedCore, "renderSearchResultsNowV1500", "Retired release-era Global Search wrapper must stay removed.");\nexcludes(sharedCore, "renderSearchResultsFromBootstrap", "Retired bootstrap Club-result wrapper must stay removed.");'''
assert validation.count(old) == 1, 'Club search validation anchor moved.'
path.write_text(validation.replace(old, new), encoding='utf-8')
