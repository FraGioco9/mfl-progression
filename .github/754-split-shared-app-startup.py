from pathlib import Path

root = Path('.')
shared_path = root / 'site/modules/core-sources/shared.js'
startup_path = root / 'site/modules/core-sources/shared-app-startup.js'
manifest_path = root / 'site/modules/core-source-manifest.js'
validate_path = root / 'site/validate.mjs'
club_validate_path = root / 'site/validate-club-route-core.mjs'
ownership_path = root / 'site/validate-core-source-ownership.mjs'

shared = shared_path.read_text()
start = 'window.__mflMarkApplicationCoreLoaded?.();'
marker = '\n\n;(() => {\n  if (window.__mflFooterSpaNavigationBound) return;'
assert shared.startswith(start), 'Unexpected remaining Shared start boundary'
assert marker in shared, 'Could not find shell-navigation boundary'
assert not startup_path.exists(), 'shared-app-startup.js already exists'
prefix, suffix = shared.split(marker, 1)
startup = prefix.rstrip() + '\n'
remaining = ';(() => {\n  if (window.__mflFooterSpaNavigationBound) return;' + suffix
assert startup.startswith(start)
assert startup.rstrip().endswith('})();')
assert 'window.__mflAppStartPromise = (async () => {' in startup
assert remaining.startswith(';(() => {\n  if (window.__mflFooterSpaNavigationBound) return;')
startup_path.write_text(startup)
shared_path.write_text(remaining)

manifest = manifest_path.read_text()
old_manifest_tail = '"shared-route-runtime-gate.js", "shared-core-contracts.js", "shared.js"]'
new_manifest_tail = '"shared-route-runtime-gate.js", "shared-core-contracts.js", "shared-app-startup.js", "shared.js"]'
assert manifest.count(old_manifest_tail) == 1
manifest_path.write_text(manifest.replace(old_manifest_tail, new_manifest_tail))

for path in (validate_path, club_validate_path):
    text = path.read_text()
    assert text.count('sources?.length === 27') == 1
    text = text.replace('sources?.length === 27', 'sources?.length === 28')
    if path == validate_path:
        old_tail = 'sharedCoreManifest.sources[25] === "shared-core-contracts.js"\n    && sharedCoreManifest.sources[26] === "shared.js"'
        new_tail = 'sharedCoreManifest.sources[25] === "shared-core-contracts.js"\n    && sharedCoreManifest.sources[26] === "shared-app-startup.js"\n    && sharedCoreManifest.sources[27] === "shared.js"'
    else:
        old_tail = 'coreSourceByDomain.shared.sources[25] === "shared-core-contracts.js"\n    && coreSourceByDomain.shared.sources[26] === "shared.js"'
        new_tail = 'coreSourceByDomain.shared.sources[25] === "shared-core-contracts.js"\n    && coreSourceByDomain.shared.sources[26] === "shared-app-startup.js"\n    && coreSourceByDomain.shared.sources[27] === "shared.js"'
    assert text.count(old_tail) == 1, f'Could not find manifest tail in {path}'
    path.write_text(text.replace(old_tail, new_tail))

text = ownership_path.read_text()
assert text.count('sharedEntry?.sources?.length === 27') == 1
text = text.replace('sharedEntry?.sources?.length === 27', 'sharedEntry?.sources?.length === 28')
old_tail = 'sharedEntry.sources[25] === "shared-core-contracts.js"\n    && sharedEntry.sources[26] === "shared.js"'
new_tail = 'sharedEntry.sources[25] === "shared-core-contracts.js"\n    && sharedEntry.sources[26] === "shared-app-startup.js"\n    && sharedEntry.sources[27] === "shared.js"'
assert text.count(old_tail) == 1
text = text.replace(old_tail, new_tail)
old_reads = 'const sharedCoreContracts = await read("./modules/core-sources/shared-core-contracts.js");\nconst sharedRemaining = await read("./modules/core-sources/shared.js");'
new_reads = 'const sharedCoreContracts = await read("./modules/core-sources/shared-core-contracts.js");\nconst sharedAppStartup = await read("./modules/core-sources/shared-app-startup.js");\nconst sharedRemaining = await read("./modules/core-sources/shared.js");'
assert text.count(old_reads) == 1
text = text.replace(old_reads, new_reads)
old_remaining = '''invariant(\n  sharedRemaining.startsWith("window.__mflMarkApplicationCoreLoaded?.();")\n    && !sharedRemaining.includes("__mflUniversalClubSearch")'''
new_remaining = '''invariant(\n  sharedAppStartup.startsWith("window.__mflMarkApplicationCoreLoaded?.();")\n    && sharedAppStartup.includes("window.__mflAppStartPromise = (async () => {")\n    && sharedAppStartup.includes("await window.__mflEnsureRouteCore(initialRouteTarget.pageName, initialRouteTarget.options || {});")\n    && sharedAppStartup.replace(/\\s*$/, "").endsWith("})();"),\n  "Shared application startup must own core-loaded publication, initial route-core preload, and the canonical startApp promise handoff.",\n);\ninvariant(\n  sharedRemaining.startsWith(";(() => {\\n  if (window.__mflFooterSpaNavigationBound) return;")\n    && !sharedRemaining.includes("__mflUniversalClubSearch")'''
assert text.count(old_remaining) == 1
text = text.replace(old_remaining, new_remaining)
text = text.replace(
    '"Remaining Shared behavior must begin at application-core publication/startup after the explicit core-contract bridge.",',
    '"Remaining Shared behavior must begin at global shell-navigation bindings after application startup publication.",',
)
old_boundary = '&& !sharedRouteRuntimeGate.includes("function tableHeaderContext")\n    && !sharedCoreContracts.includes("window.__mflMarkApplicationCoreLoaded"),'
new_boundary = '&& !sharedRouteRuntimeGate.includes("function tableHeaderContext")\n    && !sharedCoreContracts.includes("window.__mflMarkApplicationCoreLoaded")\n    && !sharedAppStartup.includes("__mflFooterSpaNavigationBound"),'
assert text.count(old_boundary) == 1
text = text.replace(old_boundary, new_boundary)
text = text.replace(
    'the route-runtime gate, and explicit core contracts must not absorb later ownership domains.',
    'the route-runtime gate, explicit core contracts, and application startup must not absorb later ownership domains.',
)
text = text.replace(
    'before the stable route-runtime gate before explicit core contracts before remaining shared behavior',
    'before the stable route-runtime gate before explicit core contracts before application startup before remaining shared behavior',
)
ownership_path.write_text(text)

for path in root.joinpath('site').glob('validate*.mjs'):
    data = path.read_text()
    assert 'sources?.length === 27' not in data, f'Stale Shared source count remains in {path}'
    assert 'sources[26] === "shared.js"' not in data, f'Stale Shared tail remains in {path}'

print(f'Extracted {len(startup.splitlines())} application-startup lines; remaining Shared starts: {remaining.splitlines()[0]}')
