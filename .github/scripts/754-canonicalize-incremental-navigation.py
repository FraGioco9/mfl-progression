from pathlib import Path
import textwrap

site = Path("site")
core = site / "modules" / "core-sources"

# 1. Keep the public page/Table facades stable instead of replacing their function identities later.
page_path = core / "shared-page-lifecycle.js"
page = page_path.read_text(encoding="utf-8")

old_apply = '''function applyFilters() {
  return typeof __mflTableApplyFiltersOwner === "function"
    ? __mflTableApplyFiltersOwner.apply(this, arguments)
    : undefined;
}'''
new_apply = '''function applyFilters(options = {}) {
  if (state.incrementalMode && !state.incrementalApplying && !options.localOnly) {
    state.page = 1;
    void reloadIncrementalPage(1, { save: options.save !== false, loadingMode: "blank" });
    return undefined;
  }
  return typeof __mflTableApplyFiltersOwner === "function"
    ? __mflTableApplyFiltersOwner.apply(this, arguments)
    : undefined;
}'''
assert page.count(old_apply) == 1, "Canonical applyFilters facade changed."
page = page.replace(old_apply, new_apply)

old_view = '''function setView() {
  return typeof __mflTableSetViewOwner === "function"
    ? __mflTableSetViewOwner.apply(this, arguments)
    : undefined;
}'''
new_view = '''function applyTableViewOwner() {
  return typeof __mflTableSetViewOwner === "function"
    ? __mflTableSetViewOwner.apply(this, arguments)
    : undefined;
}

function setView() {
  const pageName = state.currentPage;
  if (tablePages.has(pageName) || pageName === "club") {
    return setIncrementalView.apply(this, arguments);
  }
  return applyTableViewOwner.apply(this, arguments);
}'''
assert page.count(old_view) == 1, "Canonical setView facade changed."
page = page.replace(old_view, new_view)

base_signature = "async function setPage(pageName, updateHash = true, options = {}) {"
assert page.count(base_signature) == 1, "Canonical base setPage definition changed."
page = page.replace(base_signature, "async function renderPage(pageName, updateHash = true, options = {}) {", 1)
assert page.count('await setPage("mflstats", updateHash, { ...options, replaceUrl: options.replaceUrl || "/mfl/stats" });') == 1
page = page.replace(
    'await setPage("mflstats", updateHash, { ...options, replaceUrl: options.replaceUrl || "/mfl/stats" });',
    'await renderPage("mflstats", updateHash, { ...options, replaceUrl: options.replaceUrl || "/mfl/stats" });',
    1,
)
page = page.rstrip() + '''\n\nasync function setPage(pageName, updateHash = true, options = {}) {
  return setIncrementalPage.call(this, pageName, updateHash, options);
}\n'''
page_path.write_text(page, encoding="utf-8")

# 2. Convert the late incremental IIFE into a canonical named responsibility with no public-function replacement.
shared_path = core / "shared.js"
shared = shared_path.read_text(encoding="utf-8")
start_marker = "/* Session-cached incremental route data and destination-first loading */\n(() => {\n"
next_boundary = "\n\n;(() => {\n  function tableHeaderContext() {"
assert shared.startswith(start_marker), "Remaining Shared no longer starts at the incremental wrapper."
assert shared.count(next_boundary) == 1, "Next late Shared boundary changed."
block_end = shared.index(next_boundary)
block = shared[:block_end]
remaining = shared[block_end + 2:]  # retain the ;(() => boundary, without extra leading blank lines
assert remaining.startswith(';(() => {\n  function tableHeaderContext() {')
assert block.rstrip().endswith("})();"), "Incremental wrapper no longer has the expected IIFE boundary."

capture_prefix = '''/* Session-cached incremental route data and destination-first loading */
(() => {
  const originalApplyFilters = applyFilters;
  const originalSetPage = setPage;
  const originalSetView = setView;

'''
assert block.startswith(capture_prefix), "Incremental wrapper capture prelude changed."
body = block[len(capture_prefix):]
body = body[:body.rfind("\n})();")]
body = textwrap.dedent(body)

apply_start = body.index("applyFilters = function applyFiltersWithIncrementalData(options = {}) {")
view_start = body.index("setView = async function setIncrementalView(viewName) {", apply_start)
body = body[:apply_start].rstrip() + "\n\n" + body[view_start:]

body = body.replace(
    "setView = async function setIncrementalView(viewName) {",
    "const setIncrementalView = async function setIncrementalView(viewName) {",
    1,
)
body = body.replace("originalSetView.apply(this, arguments)", "applyTableViewOwner.apply(this, arguments)")
body = body.replace("originalSetView.call(this, nextView)", "applyTableViewOwner.call(this, nextView)")

body = body.replace(
    "setPage = async function setIncrementalPage(pageName, updateHash = true, options = {}) {",
    "const setIncrementalPage = async function setIncrementalPage(pageName, updateHash = true, options = {}) {",
    1,
)
body = body.replace("originalSetPage.call(this,", "renderPage.call(this,")

body = body.replace(
    "window.mflLoadIncrementalRoutePage = async function loadIncrementalRoutePage(pageName, options = {}) {",
    "const loadIncrementalRoutePage = async function loadIncrementalRoutePage(pageName, options = {}) {",
    1,
)
body = body.replace("originalApplyFilters.call(this, { save: false })", "applyFilters.call(this, { save: false })")
body = body.rstrip() + "\n\nwindow.mflLoadIncrementalRoutePage = loadIncrementalRoutePage;\n"

for retired in [
    "const originalApplyFilters = applyFilters",
    "const originalSetPage = setPage",
    "const originalSetView = setView",
    "applyFilters = function applyFiltersWithIncrementalData",
    "setView = async function setIncrementalView",
    "setPage = async function setIncrementalPage",
    "originalApplyFilters",
    "originalSetPage",
    "originalSetView",
]:
    assert retired not in body, f"Retired incremental wrapper ownership remains: {retired}"
assert "const setIncrementalView = async function setIncrementalView(viewName) {" in body
assert "const setIncrementalPage = async function setIncrementalPage(pageName, updateHash = true, options = {}) {" in body
assert "const loadIncrementalRoutePage = async function loadIncrementalRoutePage(pageName, options = {}) {" in body
assert body.rstrip().endswith("window.mflLoadIncrementalRoutePage = loadIncrementalRoutePage;")

(core / "shared-incremental-navigation.js").write_text(
    "/* Session-cached incremental route data and destination-first loading */\n" + body,
    encoding="utf-8",
)
shared_path.write_text(remaining, encoding="utf-8")

# 3. Add the new canonical responsibility immediately after layout centering.
manifest_path = site / "modules" / "core-source-manifest.js"
manifest = manifest_path.read_text(encoding="utf-8")
old_manifest_tail = '"shared-startup-lifecycle.js", "shared-layout-center.js", "shared.js"'
new_manifest_tail = '"shared-startup-lifecycle.js", "shared-layout-center.js", "shared-incremental-navigation.js", "shared.js"'
assert manifest.count(old_manifest_tail) == 1, "Shared manifest tail changed."
manifest_path.write_text(manifest.replace(old_manifest_tail, new_manifest_tail), encoding="utf-8")

for relative, prefix in [
    ("validate.mjs", "sharedCoreManifest"),
    ("validate-club-route-core.mjs", "coreSourceByDomain.shared"),
]:
    path = site / relative
    source = path.read_text(encoding="utf-8")
    assert source.count(f"{prefix}?.sources?.length === 24") == 1, f"{relative} Shared count changed."
    source = source.replace(f"{prefix}?.sources?.length === 24", f"{prefix}?.sources?.length === 25")
    old_tail = (
        f'&& {prefix}.sources[22] === "shared-layout-center.js"\n'
        f'    && {prefix}.sources[23] === "shared.js"'
    )
    new_tail = (
        f'&& {prefix}.sources[22] === "shared-layout-center.js"\n'
        f'    && {prefix}.sources[23] === "shared-incremental-navigation.js"\n'
        f'    && {prefix}.sources[24] === "shared.js"'
    )
    assert source.count(old_tail) == 1, f"{relative} Shared tail indices changed."
    path.write_text(source.replace(old_tail, new_tail), encoding="utf-8")

ownership_path = site / "validate-core-source-ownership.mjs"
ownership = ownership_path.read_text(encoding="utf-8")
assert ownership.count("sharedEntry?.sources?.length === 24") == 1
ownership = ownership.replace("sharedEntry?.sources?.length === 24", "sharedEntry?.sources?.length === 25")
old_tail = '''&& sharedEntry.sources[22] === "shared-layout-center.js"
    && sharedEntry.sources[23] === "shared.js"'''
new_tail = '''&& sharedEntry.sources[22] === "shared-layout-center.js"
    && sharedEntry.sources[23] === "shared-incremental-navigation.js"
    && sharedEntry.sources[24] === "shared.js"'''
assert ownership.count(old_tail) == 1
ownership = ownership.replace(old_tail, new_tail)
old_order = "before layout-centered feedback before remaining shared behavior"
new_order = "before layout-centered feedback before incremental navigation orchestration before remaining shared behavior"
assert ownership.count(old_order) == 1
ownership = ownership.replace(old_order, new_order)
old_reads = '''const sharedLayoutCenter = await read("./modules/core-sources/shared-layout-center.js");
const sharedRemaining = await read("./modules/core-sources/shared.js");'''
new_reads = '''const sharedLayoutCenter = await read("./modules/core-sources/shared-layout-center.js");
const sharedIncrementalNavigation = await read("./modules/core-sources/shared-incremental-navigation.js");
const sharedRemaining = await read("./modules/core-sources/shared.js");'''
assert ownership.count(old_reads) == 1
ownership = ownership.replace(old_reads, new_reads)
old_page = '''sharedPageLifecycle.startsWith("function resetPageScroll() {")
    && sharedPageLifecycle.replace(/\\s*$/, "").endsWith("syncHomeLoginButton();\\n}"),
  "Shared page lifecycle must own reset-scroll through the canonical setPage boundary."'''
new_page = '''sharedPageLifecycle.startsWith("function resetPageScroll() {")
    && sharedPageLifecycle.includes("async function renderPage(pageName, updateHash = true, options = {}) {")
    && sharedPageLifecycle.includes("function applyFilters(options = {}) {")
    && sharedPageLifecycle.includes("return setIncrementalView.apply(this, arguments);")
    && sharedPageLifecycle.replace(/\\s*$/, "").endsWith("return setIncrementalPage.call(this, pageName, updateHash, options);\\n}"),
  "Shared page lifecycle must own stable Table/page facades and the canonical base page renderer without later public-function replacement."'''
assert ownership.count(old_page) == 1
ownership = ownership.replace(old_page, new_page)
old_layout = '''    && !sharedLayoutCenter.includes("const originalApplyFilters = applyFilters"),
  "Shared layout centering must own page-content center synchronization and its resize/mutation bindings without absorbing incremental navigation overrides.",
);
invariant(
  sharedRemaining.startsWith("/* Session-cached incremental route data and destination-first loading */")
    && sharedRemaining.includes("const originalApplyFilters = applyFilters;")'''
new_layout = '''    && !sharedLayoutCenter.includes("setIncrementalPage"),
  "Shared layout centering must own page-content center synchronization and its resize/mutation bindings without absorbing incremental navigation orchestration.",
);
invariant(
  sharedIncrementalNavigation.startsWith("/* Session-cached incremental route data and destination-first loading */")
    && sharedIncrementalNavigation.includes("const setIncrementalView = async function setIncrementalView(viewName) {")
    && sharedIncrementalNavigation.includes("const setIncrementalPage = async function setIncrementalPage(pageName, updateHash = true, options = {}) {")
    && sharedIncrementalNavigation.includes("const loadIncrementalRoutePage = async function loadIncrementalRoutePage(pageName, options = {}) {")
    && sharedIncrementalNavigation.replace(/\\s*$/, "").endsWith("window.mflLoadIncrementalRoutePage = loadIncrementalRoutePage;")
    && !sharedIncrementalNavigation.includes("const originalApplyFilters")
    && !sharedIncrementalNavigation.includes("const originalSetPage")
    && !sharedIncrementalNavigation.includes("const originalSetView")
    && !sharedIncrementalNavigation.includes("applyFilters = function")
    && !sharedIncrementalNavigation.includes("setView = async function")
    && !sharedIncrementalNavigation.includes("setPage = async function"),
  "Shared incremental navigation must own loading orchestration through stable facades/base rendering without replacing public function identities.",
);
invariant(
  sharedRemaining.startsWith(";(() => {\\n  function tableHeaderContext() {")'''
assert ownership.count(old_layout) == 1
ownership = ownership.replace(old_layout, new_layout)
old_remaining_message = "Remaining Shared behavior must begin at the late incremental-runtime boundary with legacy Club-search wrappers and unused serialization/data helpers retired."
new_remaining_message = "Remaining Shared behavior must begin at the later table-header/search-runtime compatibility boundary with legacy Club-search wrappers and incremental public-function replacements retired."
assert ownership.count(old_remaining_message) == 1
ownership = ownership.replace(old_remaining_message, new_remaining_message)
old_guard = '''&& !sharedStartupLifecycle.includes("function syncLayoutCenter")
    && !sharedLayoutCenter.includes("const originalApplyFilters = applyFilters"),'''
new_guard = '''&& !sharedStartupLifecycle.includes("function syncLayoutCenter")
    && !sharedLayoutCenter.includes("setIncrementalPage")
    && !sharedIncrementalNavigation.includes("function tableHeaderContext"),'''
assert ownership.count(old_guard) == 1
ownership = ownership.replace(old_guard, new_guard)
old_guard_message = "global interaction bindings, startup lifecycle, and layout centering must not absorb later ownership domains."
new_guard_message = "global interaction bindings, startup lifecycle, layout centering, and incremental navigation must not absorb later ownership domains."
assert ownership.count(old_guard_message) == 1
ownership = ownership.replace(old_guard_message, new_guard_message)
ownership_path.write_text(ownership, encoding="utf-8")
