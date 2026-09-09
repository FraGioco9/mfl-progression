from pathlib import Path


def replace_exact(path, old, new, expected=1):
    file_path = Path(path)
    text = file_path.read_text(encoding="utf-8")
    count = text.count(old)
    if count != expected:
        raise SystemExit(f"{path}: expected {expected} occurrence(s) of {old!r}, found {count}")
    file_path.write_text(text.replace(old, new), encoding="utf-8")

# Canonical incremental owner names are now stable named functions, not late assignments.
replace_exact(
    "site/validate-loading-ownership.mjs",
    "  appCoreSource.includes('window.mflLoadIncrementalRoutePage = async function loadIncrementalRoutePage')\n    && appCoreSource.includes('return withInteractionBusy(loadAndRender, Reflect.get(window, \"__mflInteractionBusy\")?.reason);'),",
    "  appCoreSource.includes('const loadIncrementalRoutePage = async function loadIncrementalRoutePage')\n    && appCoreSource.includes('window.mflLoadIncrementalRoutePage = loadIncrementalRoutePage;')\n    && appCoreSource.includes('return withInteractionBusy(loadAndRender, Reflect.get(window, \"__mflInteractionBusy\")?.reason);'),",
)
replace_exact(
    "site/validate-loading-ownership.mjs",
    'const incrementalViewStart = appCoreSource.indexOf("setView = async function setIncrementalView(viewName) {");',
    'const incrementalViewStart = appCoreSource.indexOf("const setIncrementalView = async function setIncrementalView(viewName) {");',
)
replace_exact(
    "site/validate-loading-ownership.mjs",
    'const incrementalViewEnd = appCoreSource.indexOf("setPage = async function setIncrementalPage", incrementalViewStart);',
    'const incrementalViewEnd = appCoreSource.indexOf("const setIncrementalPage = async function setIncrementalPage", incrementalViewStart);',
)

replace_exact(
    "site/validate-database-stats-lazy-runtime.mjs",
    'const setPageIndex = coreSource.indexOf("setPage = async function setIncrementalPage(pageName, updateHash = true, options = {}) {");',
    'const setPageIndex = coreSource.indexOf("const setIncrementalPage = async function setIncrementalPage(pageName, updateHash = true, options = {}) {");',
)

replace_exact(
    "site/validate-club-route-core.mjs",
    'includes(sharedCore, "setView = async function setIncrementalView(viewName) {", "Club views must share the canonical incremental view owner.");',
    'includes(sharedCore, "const setIncrementalView = async function setIncrementalView(viewName) {", "Club views must share the canonical incremental view owner.");',
)

replace_exact(
    "site/validate-table-route-core.mjs",
    '  includes(sharedCore, `function ${facade}() {`, `Shared core must retain the ${facade} facade.`);',
    '  const facadeMarker = facade === "applyFilters" ? "function applyFilters(options = {}) {" : `function ${facade}() {`;\n  includes(sharedCore, facadeMarker, `Shared core must retain the ${facade} facade.`);',
)

replace_exact(
    "site/validate-table-sort-session.mjs",
    'const incrementalViewSource = sourceBetween(core, "setView = async function setIncrementalView", "setPage = async function setIncrementalPage");',
    'const incrementalViewSource = sourceBetween(core, "const setIncrementalView = async function setIncrementalView", "const setIncrementalPage = async function setIncrementalPage");',
)
replace_exact(
    "site/validate-table-sort-session.mjs",
    'const incrementalPageSource = sourceBetween(core, "setPage = async function setIncrementalPage", "window.mflLoadIncrementalRoutePage = async function loadIncrementalRoutePage");',
    'const incrementalPageSource = sourceBetween(core, "const setIncrementalPage = async function setIncrementalPage", "const loadIncrementalRoutePage = async function loadIncrementalRoutePage");',
)

replace_exact(
    "site/validate-generated-view-transition.mjs",
    'const pageLoaderOwner = sourceContaining("setPage = async function setIncrementalPage(pageName, updateHash = true, options = {}) {", "incremental page loader");',
    'const pageLoaderOwner = sourceContaining("const setIncrementalPage = async function setIncrementalPage(pageName, updateHash = true, options = {}) {", "incremental page loader");',
)
replace_exact(
    "site/validate-generated-view-transition.mjs",
    'const pageLoaderStart = pageLoaderOwner.text.indexOf("setPage = async function setIncrementalPage(pageName, updateHash = true, options = {}) {");',
    'const pageLoaderStart = pageLoaderOwner.text.indexOf("const setIncrementalPage = async function setIncrementalPage(pageName, updateHash = true, options = {}) {");',
)
replace_exact(
    "site/validate-generated-view-transition.mjs",
    'const mflStatsFinalRender = pageLoader.indexOf(\'originalSetPage.call(this, "mflstats"\', mflStatsRequest);',
    'const mflStatsFinalRender = pageLoader.indexOf(\'renderPage.call(this, "mflstats"\', mflStatsRequest);',
)
replace_exact(
    "site/validate-generated-view-transition.mjs",
    'const incrementalOwner = sourceContaining("setView = async function setIncrementalView(viewName) {", "incremental view loader");',
    'const incrementalOwner = sourceContaining("const setIncrementalView = async function setIncrementalView(viewName) {", "incremental view loader");',
)
replace_exact(
    "site/validate-generated-view-transition.mjs",
    '  "setView = async function setIncrementalView(viewName) {",\n  "setPage = async function setIncrementalPage(pageName, updateHash = true, options = {}) {",',
    '  "const setIncrementalView = async function setIncrementalView(viewName) {",\n  "const setIncrementalPage = async function setIncrementalPage(pageName, updateHash = true, options = {}) {",',
)

replace_exact(
    "site/validate-table-loading-state.mjs",
    'const incrementalPageStart = appCoreSource.indexOf("setPage = async function setIncrementalPage(");',
    'const incrementalPageStart = appCoreSource.indexOf("const setIncrementalPage = async function setIncrementalPage(");',
)
replace_exact(
    "site/validate-table-loading-state.mjs",
    'const incrementalPageEnd = appCoreSource.indexOf("window.mflLoadIncrementalRoutePage = async function loadIncrementalRoutePage", incrementalPageStart);',
    'const incrementalPageEnd = appCoreSource.indexOf("const loadIncrementalRoutePage = async function loadIncrementalRoutePage", incrementalPageStart);',
)
replace_exact(
    "site/validate-table-loading-state.mjs",
    'const pageRenderEnd = appCoreSource.indexOf("applyFilters = function applyFiltersWithIncrementalData", pageRenderStart);',
    'const pageRenderEnd = appCoreSource.indexOf("const setIncrementalView = async function setIncrementalView", pageRenderStart);',
)
replace_exact(
    "site/validate-table-loading-state.mjs",
    '    && pageRenderTransaction.indexOf("originalSetPage.call") < pageRenderTransaction.indexOf("finishRequest?.(renderLoadingRequestToken)"),\n  "Page navigation must retain Table loading ownership through the authoritative originalSetPage DOM commit.",',
    '    && pageRenderTransaction.indexOf("renderPage.call") < pageRenderTransaction.indexOf("finishRequest?.(renderLoadingRequestToken)"),\n  "Page navigation must retain Table loading ownership through the authoritative renderPage DOM commit.",',
)
replace_exact(
    "site/validate-table-loading-state.mjs",
    'const viewTransactionStart = appCoreSource.indexOf("setView = async function setIncrementalView(viewName) {");',
    'const viewTransactionStart = appCoreSource.indexOf("const setIncrementalView = async function setIncrementalView(viewName) {");',
)
replace_exact(
    "site/validate-table-loading-state.mjs",
    'const viewTransactionEnd = appCoreSource.indexOf("setPage = async function setIncrementalPage", viewTransactionStart);',
    'const viewTransactionEnd = appCoreSource.indexOf("const setIncrementalPage = async function setIncrementalPage", viewTransactionStart);',
)
replace_exact(
    "site/validate-table-loading-state.mjs",
    '    && viewTransaction.indexOf("originalSetView.call(this, nextView)") < viewTransaction.indexOf("finishRequest?.(viewLoadingRequestToken)"),\n  "View switches must retain Table loading ownership through originalSetView and the row DOM commit.",',
    '    && viewTransaction.indexOf("applyTableViewOwner.call(this, nextView)") < viewTransaction.indexOf("finishRequest?.(viewLoadingRequestToken)"),\n  "View switches must retain Table loading ownership through the canonical Table view owner and the row DOM commit.",',
)

replace_exact(
    "site/validate-page-route-gate-transition.mjs",
    'const baseSetPageStart = appCoreSource.indexOf("async function setPage(pageName, updateHash = true, options = {}) {");',
    'const baseSetPageStart = appCoreSource.indexOf("async function renderPage(pageName, updateHash = true, options = {}) {");',
)
replace_exact(
    "site/validate-page-route-gate-transition.mjs",
    'const incrementalSetPageStart = appCoreSource.indexOf("setPage = async function setIncrementalPage(pageName, updateHash = true, options = {}) {");',
    'const incrementalSetPageStart = appCoreSource.indexOf("const setIncrementalPage = async function setIncrementalPage(pageName, updateHash = true, options = {}) {");',
)
replace_exact(
    "site/validate-page-route-gate-transition.mjs",
    'const incrementalSetPageEnd = appCoreSource.indexOf("function divisionInfo(", incrementalSetPageStart);',
    'const incrementalSetPageEnd = appCoreSource.indexOf("const loadIncrementalRoutePage = async function loadIncrementalRoutePage", incrementalSetPageStart);',
)

replace_exact(
    "site/validate-club-title-loading.mjs",
    'includes(eagerCore, "if (!clubPage) originalApplyFilters.call(this, { save: false });", "Only non-Club incremental pages may render through the generic pre-route filter pipeline.");',
    'includes(eagerCore, "if (!clubPage) applyFilters.call(this, { save: false });", "Only non-Club incremental pages may render through the stable shared Table filter facade.");',
)
replace_exact(
    "site/validate-club-title-loading.mjs",
    'const incrementalLoaderStart = eagerCore.indexOf("window.mflLoadIncrementalRoutePage = async function loadIncrementalRoutePage");',
    'const incrementalLoaderStart = eagerCore.indexOf("const loadIncrementalRoutePage = async function loadIncrementalRoutePage");',
)
replace_exact(
    "site/validate-club-title-loading.mjs",
    'const incrementalLoaderEnd = eagerCore.indexOf("})();", incrementalLoaderStart);',
    'const incrementalLoaderEnd = eagerCore.indexOf("window.mflLoadIncrementalRoutePage = loadIncrementalRoutePage;", incrementalLoaderStart);',
)

print("Updated incremental navigation validator contracts.")
