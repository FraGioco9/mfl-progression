from pathlib import Path


def read(path):
    return Path(path).read_text(encoding="utf-8")


def write(path, text):
    Path(path).write_text(text, encoding="utf-8")


def replace_exact(text, old, new, label, expected=1):
    count = text.count(old)
    if count != expected:
        raise SystemExit(f"{label}: expected {expected} occurrence(s), found {count}: {old!r}")
    return text.replace(old, new)

# 1. Keep public setPage stable and dispatch through an explicit feature-owner slot.
page_path = "site/modules/core-sources/shared-page-lifecycle.js"
page = read(page_path)
page = replace_exact(
    page,
    '''async function setPage(pageName, updateHash = true, options = {}) {\n  return setIncrementalPage.call(this, pageName, updateHash, options);\n}''',
    '''async function setPage(pageName, updateHash = true, options = {}) {\n  const featureOwner = Reflect.get(window, "__mflSetPageFeatureOwner");\n  if (typeof featureOwner === "function") {\n    return featureOwner.call(this, pageName, updateHash, options);\n  }\n  return setPageWithRouteRuntime.call(this, pageName, updateHash, options);\n}''',
    "stable setPage facade",
)
write(page_path, page)

# 2. Extract and canonicalize the route-runtime gate from the remaining Shared tail.
shared_path = "site/modules/core-sources/shared.js"
shared = read(shared_path)
route_start_marker = ';(() => {\n  if (typeof setPage !== "function" || setPage.__mflRouteRuntimeGate) return;\n'
route_end_marker = '\n\nwindow.__mflMarkApplicationCoreLoaded?.();'
route_start = shared.find(route_start_marker)
route_end = shared.find(route_end_marker, route_start)
if route_start < 0 or route_end <= route_start:
    raise SystemExit("Could not locate late route-runtime setPage gate.")
route = shared[route_start:route_end]
route = replace_exact(
    route,
    ''';(() => {\n  if (typeof setPage !== "function" || setPage.__mflRouteRuntimeGate) return;\n  const originalRouteRuntimeSetPage = setPage;\n  const routeRuntimeSetPage = async function setPageWithRouteRuntime(pageName, updateHash = true, options = {}) {''',
    '''async function setPageWithRouteRuntime(pageName, updateHash = true, options = {}) {''',
    "route gate prefix",
)
route = replace_exact(
    route,
    '        const ownerBeforeRuntime = setPage;',
    '        const featureOwnerBeforeRuntime = Reflect.get(window, "__mflSetPageFeatureOwner");',
    "route feature owner before runtime",
)
route = replace_exact(
    route,
    '''        if (setPage !== ownerBeforeRuntime) {\n          return setPage.call(this, pageName, updateHash, {\n            ...committedOptions,\n            __mflRouteRuntimeReady: true,\n          });\n        }\n        return originalRouteRuntimeSetPage.call(this, pageName, updateHash, committedOptions);''',
    '''        const featureOwnerAfterRuntime = Reflect.get(window, "__mflSetPageFeatureOwner");\n        if (typeof featureOwnerAfterRuntime === "function" && featureOwnerAfterRuntime !== featureOwnerBeforeRuntime) {\n          return featureOwnerAfterRuntime.call(this, pageName, updateHash, {\n            ...committedOptions,\n            __mflRouteRuntimeReady: true,\n          });\n        }\n        return setIncrementalPage.call(this, pageName, updateHash, committedOptions);''',
    "route feature handoff",
)
route = replace_exact(
    route,
    '    return originalRouteRuntimeSetPage.call(this, pageName, updateHash, cleanOptions);',
    '    return setIncrementalPage.call(this, pageName, updateHash, cleanOptions);',
    "route ready delegate",
)
route = replace_exact(
    route,
    '''  };\n  Object.defineProperty(routeRuntimeSetPage, "__mflRouteRuntimeGate", { value: true });\n  setPage = routeRuntimeSetPage;\n})();''',
    '''}\n\nReflect.set(window, "__mflSetPageRouteOwner", setPageWithRouteRuntime);''',
    "route gate publication",
)
if "originalRouteRuntimeSetPage" in route or "setPage = routeRuntimeSetPage" in route or "__mflRouteRuntimeGate" in route:
    raise SystemExit("Retired route gate replacement ownership remains in extracted fragment.")
route_path = "site/modules/core-sources/shared-route-runtime-gate.js"
write(route_path, route.rstrip() + "\n")
shared = shared[:route_start] + shared[route_end:].lstrip("\n")
if not shared.startswith(";(() => {\n  function tableHeaderContext() {"):
    raise SystemExit("Unexpected remaining Shared prefix after route-gate extraction.")
if "setPage = routeRuntimeSetPage" in shared or "originalRouteRuntimeSetPage" in shared:
    raise SystemExit("Retired route gate leaked into remaining Shared.")
write(shared_path, shared)

# 3. Watchlist/My Players registers a feature owner instead of replacing global setPage.
watch_path = "site/watchlist-myplayers-route-runtime.js"
watch = read(watch_path)
watch = replace_exact(
    watch,
    '''  let originalSetPage = null;\n  let wrappedSetPage = null;''',
    '''  let setPageFeatureOwner = null;''',
    "watchlist setPage state",
)
watch = replace_exact(
    watch,
    '  async function reconcile(intent, setPageDelegate = originalSetPage) {',
    '  async function reconcile(intent, setPageDelegate = globalFunction("__mflSetPageRouteOwner")) {',
    "watchlist reconcile delegate",
)
watch = replace_exact(
    watch,
    '''    const candidate = globalFunction("setPage");\n    if (!candidate) return false;\n    if (candidate === wrappedSetPage || interactionBusyChainIncludes(candidate, wrappedSetPage)) {\n      installWatchlistSwitchLoadDedupe();\n      return true;\n    }\n\n    const delegatedSetPage = candidate;\n    originalSetPage = delegatedSetPage;\n    wrappedSetPage = async function setPageWithLatestWatchlistMyPlayersIntent(pageName, updateHash = true, options = {}) {''',
    '''    const delegatedSetPage = globalFunction("__mflSetPageRouteOwner");\n    if (!delegatedSetPage) return false;\n    const installedFeatureOwner = globalFunction("__mflSetPageFeatureOwner");\n    if (installedFeatureOwner === setPageFeatureOwner) {\n      installWatchlistSwitchLoadDedupe();\n      return true;\n    }\n    if (installedFeatureOwner) return false;\n\n    setPageFeatureOwner = async function setPageWithLatestWatchlistMyPlayersIntent(pageName, updateHash = true, options = {}) {''',
    "watchlist setPage install",
)
watch = replace_exact(
    watch,
    '    replaceGlobalFunction("setPage", candidate, wrappedSetPage);',
    '    Reflect.set(window, "__mflSetPageFeatureOwner", setPageFeatureOwner);',
    "watchlist feature owner publication",
)
watch = replace_exact(
    watch,
    '''    if (wrappedSetPage && originalSetPage) {\n      replaceGlobalFunction("setPage", wrappedSetPage, originalSetPage);\n    }''',
    '''    if (globalFunction("__mflSetPageFeatureOwner") === setPageFeatureOwner) {\n      Reflect.set(window, "__mflSetPageFeatureOwner", null);\n    }''',
    "watchlist feature owner cleanup",
)
if 'replaceGlobalFunction("setPage"' in watch or "originalSetPage" in watch or "wrappedSetPage" in watch:
    raise SystemExit("Watchlist runtime still replaces global setPage.")
if 'Reflect.set(window, "__mflSetPageFeatureOwner", setPageFeatureOwner);' not in watch:
    raise SystemExit("Watchlist feature-owner publication missing.")
write(watch_path, watch)

# 4. Manifest order: incremental navigation -> route-runtime gate -> remaining Shared.
manifest_path = "site/modules/core-source-manifest.js"
manifest = read(manifest_path)
manifest = replace_exact(
    manifest,
    '"shared-layout-center.js", "shared-incremental-navigation.js", "shared.js"',
    '"shared-layout-center.js", "shared-incremental-navigation.js", "shared-route-runtime-gate.js", "shared.js"',
    "manifest route gate",
)
write(manifest_path, manifest)

# 5. Manifest validators.
for path in ["site/validate.mjs", "site/validate-club-route-core.mjs"]:
    text = read(path)
    text = replace_exact(text, "sources?.length === 25", "sources?.length === 26", f"{path} fragment count")
    text = replace_exact(
        text,
        'sources[23] === "shared-incremental-navigation.js"\n    && sharedCoreManifest.sources[24] === "shared.js"' if path.endswith("validate.mjs") else 'sources[23] === "shared-incremental-navigation.js"\n    && coreSourceByDomain.shared.sources[24] === "shared.js"',
        'sources[23] === "shared-incremental-navigation.js"\n    && sharedCoreManifest.sources[24] === "shared-route-runtime-gate.js"\n    && sharedCoreManifest.sources[25] === "shared.js"' if path.endswith("validate.mjs") else 'sources[23] === "shared-incremental-navigation.js"\n    && coreSourceByDomain.shared.sources[24] === "shared-route-runtime-gate.js"\n    && coreSourceByDomain.shared.sources[25] === "shared.js"',
        f"{path} route gate indices",
    )
    write(path, text)

ownership_path = "site/validate-core-source-ownership.mjs"
own = read(ownership_path)
own = replace_exact(own, "sharedEntry?.sources?.length === 25", "sharedEntry?.sources?.length === 26", "ownership count")
own = replace_exact(
    own,
    '''    && sharedEntry.sources[23] === "shared-incremental-navigation.js"\n    && sharedEntry.sources[24] === "shared.js"''',
    '''    && sharedEntry.sources[23] === "shared-incremental-navigation.js"\n    && sharedEntry.sources[24] === "shared-route-runtime-gate.js"\n    && sharedEntry.sources[25] === "shared.js"''',
    "ownership indices",
)
own = replace_exact(
    own,
    "before incremental navigation orchestration before remaining shared behavior",
    "before incremental navigation orchestration before the stable route-runtime gate before remaining shared behavior",
    "ownership order message",
)
own = replace_exact(
    own,
    '''const sharedIncrementalNavigation = await read("./modules/core-sources/shared-incremental-navigation.js");\nconst sharedRemaining = await read("./modules/core-sources/shared.js");''',
    '''const sharedIncrementalNavigation = await read("./modules/core-sources/shared-incremental-navigation.js");\nconst sharedRouteRuntimeGate = await read("./modules/core-sources/shared-route-runtime-gate.js");\nconst sharedRemaining = await read("./modules/core-sources/shared.js");''',
    "ownership reads",
)
own = replace_exact(
    own,
    '''invariant(\n  sharedRemaining.startsWith(";(() => {\\n  function tableHeaderContext() {")''',
    '''invariant(\n  sharedRouteRuntimeGate.startsWith("async function setPageWithRouteRuntime(pageName, updateHash = true, options = {}) {")\n    && sharedRouteRuntimeGate.includes('Reflect.get(window, "__mflSetPageFeatureOwner")')\n    && sharedRouteRuntimeGate.replace(/\\s*$/, "").endsWith('Reflect.set(window, "__mflSetPageRouteOwner", setPageWithRouteRuntime);')\n    && !sharedRouteRuntimeGate.includes("originalRouteRuntimeSetPage")\n    && !sharedRouteRuntimeGate.includes("setPage = routeRuntimeSetPage")\n    && !sharedRouteRuntimeGate.includes("__mflRouteRuntimeGate"),\n  "Shared route-runtime gate must own lazy runtime/core preparation behind the stable setPage facade without replacing its identity.",\n);\ninvariant(\n  sharedRemaining.startsWith(";(() => {\\n  function tableHeaderContext() {")''',
    "ownership route gate assertion",
)
own = replace_exact(
    own,
    '''    && !sharedLayoutCenter.includes("setIncrementalPage")\n    && !sharedIncrementalNavigation.includes("function tableHeaderContext"),''',
    '''    && !sharedLayoutCenter.includes("setIncrementalPage")\n    && !sharedIncrementalNavigation.includes("function setPageWithRouteRuntime")\n    && !sharedRouteRuntimeGate.includes("function tableHeaderContext"),''',
    "ownership absorption guard",
)
own = replace_exact(
    own,
    "layout centering, and incremental navigation must not absorb later ownership domains.",
    "layout centering, incremental navigation, and the route-runtime gate must not absorb later ownership domains.",
    "ownership absorption message",
)
write(ownership_path, own)

# 6. Route-gate transition validator follows named ownership instead of assignment syntax.
route_validator_path = "site/validate-page-route-gate-transition.mjs"
rv = read(route_validator_path)
old_top = '''const appCoreSource = readCombinedCanonicalCoreSource();\nconst routeSetPageAssignmentIndex = appCoreSource.indexOf("setPage = routeRuntimeSetPage;");\nconst routeSetPageSection = routeSetPageAssignmentIndex >= 0\n  ? appCoreSource.slice(appCoreSource.lastIndexOf(";(() => {", routeSetPageAssignmentIndex), routeSetPageAssignmentIndex + "setPage = routeRuntimeSetPage;".length)\n  : "";\nassert.ok(routeSetPageAssignmentIndex >= 0, "Could not locate the lazy setPage route gate.");'''
new_top = '''const appCoreSource = readCombinedCanonicalCoreSource();\nconst routeSetPageStart = appCoreSource.indexOf("async function setPageWithRouteRuntime(pageName, updateHash = true, options = {}) {");\nconst routeSetPageEnd = appCoreSource.indexOf('Reflect.set(window, "__mflSetPageRouteOwner", setPageWithRouteRuntime);', routeSetPageStart);\nconst routeSetPageSection = routeSetPageStart >= 0 && routeSetPageEnd > routeSetPageStart\n  ? appCoreSource.slice(routeSetPageStart, routeSetPageEnd)\n  : "";\nassert.ok(routeSetPageStart >= 0 && routeSetPageEnd > routeSetPageStart, "Could not locate the named lazy setPage route gate.");\nassert.doesNotMatch(appCoreSource, /setPage = routeRuntimeSetPage/, "The lazy route gate must not replace the stable public setPage function.");\nassert.match(routeSetPageSection, /const featureOwnerBeforeRuntime = Reflect\\.get\\(window, "__mflSetPageFeatureOwner"\\);[\\s\\S]*?const featureOwnerAfterRuntime = Reflect\\.get\\(window, "__mflSetPageFeatureOwner"\\);/, "Lazy route loading must detect a feature owner installed during runtime hydration without replacing setPage.");\nassert.match(routeSetPageSection, /featureOwnerAfterRuntime\\.call\\(this, pageName, updateHash,[\\s\\S]*?__mflRouteRuntimeReady: true/, "A feature owner installed during lazy loading must receive the in-flight navigation exactly through the runtime-ready handoff.");'''
rv = replace_exact(rv, old_top, new_top, "route transition validator owner")
write(route_validator_path, rv)

# 7. Active Filters validator uses named route-gate marker.
active_path = "site/validate-active-filter-control.mjs"
active = read(active_path)
active = replace_exact(
    active,
    'const routeGateStart = coreRuntime.indexOf("const routeRuntimeSetPage = async function setPageWithRouteRuntime");',
    'const routeGateStart = coreRuntime.indexOf("async function setPageWithRouteRuntime");',
    "active filter route gate marker",
)
write(active_path, active)

# 8. Watchlist validator asserts explicit feature-owner registration and immutable route delegate.
watch_val_path = "site/validate-watchlist-route-core.mjs"
wv = read(watch_val_path)
wv = replace_exact(
    wv,
    'includes(watchlistRouteRuntime, "const delegatedSetPage = candidate;", "Watchlist setPage wrapper must capture an immutable delegate.");',
    'includes(watchlistRouteRuntime, \'const delegatedSetPage = globalFunction("__mflSetPageRouteOwner");\', "Watchlist route coordination must capture the explicit immutable route owner.");',
    "watchlist validator delegate",
)
wv = replace_exact(
    wv,
    'includes(watchlistRouteRuntime, "await delegatedSetPage.call(this, pageName, updateHash, nextOptions);", "Watchlist route coordination must delegate through its captured shared setPage owner.");',
    'includes(watchlistRouteRuntime, "await delegatedSetPage.call(this, pageName, updateHash, nextOptions);", "Watchlist route coordination must delegate through its captured route owner.");\nincludes(watchlistRouteRuntime, \'Reflect.set(window, "__mflSetPageFeatureOwner", setPageFeatureOwner);\', "Watchlist/My Players coordination must register through the stable setPage feature-owner slot.");\nexcludes(watchlistRouteRuntime, \'replaceGlobalFunction("setPage"\', "Watchlist/My Players coordination must not replace the stable public setPage function.");',
    "watchlist validator stable feature owner",
)
write(watch_val_path, wv)

# 9. Evaluation ownership allows the runtime's other explicit wrappers but forbids setPage replacement specifically.
eval_path = "site/validate-eval-ownership.mjs"
ev = read(eval_path)
anchor = '''for (const [name, source] of [\n  ["bootstrap-core.js", bootstrapCore],\n  ["watchlist-myplayers-route-runtime.js", watchlistRuntime],\n]) {\n  invariant(!source.includes("window.eval"), `${name} must not use window.eval for global function ownership.`);\n  invariant(!source.includes("eval("), `${name} must not use string evaluation for global function ownership.`);\n  invariant(source.includes("Reflect.get(window, name)"), `${name} must resolve replaceable global functions explicitly.`);\n  invariant(source.includes("Reflect.set(window, name, replacement)"), `${name} must replace global functions explicitly.`);\n}\n'''
addition = anchor + '''\ninvariant(!watchlistRuntime.includes('replaceGlobalFunction("setPage"'), "Watchlist/My Players coordination must not replace the stable public setPage facade.");\ninvariant(watchlistRuntime.includes('Reflect.set(window, "__mflSetPageFeatureOwner", setPageFeatureOwner);'), "Watchlist/My Players coordination must register its setPage behavior through the explicit feature-owner slot.");\n'''
ev = replace_exact(ev, anchor, addition, "evaluation stable setPage ownership")
write(eval_path, ev)

print("Canonicalized stable setPage route/Watchlist ownership.")
