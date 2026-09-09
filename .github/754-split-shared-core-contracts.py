from pathlib import Path

root = Path('.')
shared_path = root / 'site/modules/core-sources/shared.js'
contracts_path = root / 'site/modules/core-sources/shared-core-contracts.js'
manifest_path = root / 'site/modules/core-source-manifest.js'
validate_path = root / 'site/validate.mjs'
club_validate_path = root / 'site/validate-club-route-core.mjs'
ownership_path = root / 'site/validate-core-source-ownership.mjs'

shared = shared_path.read_text()
start = ';(() => {\n  function tableHeaderContext() {'
marker = '\n})();\nwindow.__mflMarkApplicationCoreLoaded?.();'
assert shared.startswith(start), 'Unexpected remaining Shared start boundary'
assert marker in shared, 'Could not find core-contract bridge end boundary'
assert not contracts_path.exists(), 'shared-core-contracts.js already exists'
prefix, suffix = shared.split(marker, 1)
contracts = prefix + '\n})();\n'
remaining = 'window.__mflMarkApplicationCoreLoaded?.();' + suffix
assert contracts.startswith(start)
assert contracts.rstrip().endswith('})();')
assert 'window.__mflCoreContracts = Object.freeze({' in contracts
assert remaining.startswith('window.__mflMarkApplicationCoreLoaded?.();')
contracts_path.write_text(contracts)
shared_path.write_text(remaining)

manifest = manifest_path.read_text()
old_manifest_tail = '"shared-incremental-navigation.js", "shared-route-runtime-gate.js", "shared.js"]'
new_manifest_tail = '"shared-incremental-navigation.js", "shared-route-runtime-gate.js", "shared-core-contracts.js", "shared.js"]'
assert manifest.count(old_manifest_tail) == 1
manifest_path.write_text(manifest.replace(old_manifest_tail, new_manifest_tail))

for path in (validate_path, club_validate_path):
    text = path.read_text()
    assert text.count('sources?.length === 26') == 1
    text = text.replace('sources?.length === 26', 'sources?.length === 27')
    old_tail = 'sources[24] === "shared-route-runtime-gate.js"\n    && '
    if path == validate_path:
        old_tail += 'sharedCoreManifest.sources[25] === "shared.js"'
        new_tail = 'sources[24] === "shared-route-runtime-gate.js"\n    && sharedCoreManifest.sources[25] === "shared-core-contracts.js"\n    && sharedCoreManifest.sources[26] === "shared.js"'
    else:
        old_tail += 'coreSourceByDomain.shared.sources[25] === "shared.js"'
        new_tail = 'sources[24] === "shared-route-runtime-gate.js"\n    && coreSourceByDomain.shared.sources[25] === "shared-core-contracts.js"\n    && coreSourceByDomain.shared.sources[26] === "shared.js"'
    assert text.count(old_tail) == 1, f'Could not find manifest tail in {path}'
    path.write_text(text.replace(old_tail, new_tail))

text = ownership_path.read_text()
assert text.count('sharedEntry?.sources?.length === 26') == 1
text = text.replace('sharedEntry?.sources?.length === 26', 'sharedEntry?.sources?.length === 27')
old_tail = 'sharedEntry.sources[24] === "shared-route-runtime-gate.js"\n    && sharedEntry.sources[25] === "shared.js"'
new_tail = 'sharedEntry.sources[24] === "shared-route-runtime-gate.js"\n    && sharedEntry.sources[25] === "shared-core-contracts.js"\n    && sharedEntry.sources[26] === "shared.js"'
assert text.count(old_tail) == 1
text = text.replace(old_tail, new_tail)
old_reads = 'const sharedRouteRuntimeGate = await read("./modules/core-sources/shared-route-runtime-gate.js");\nconst sharedRemaining = await read("./modules/core-sources/shared.js");'
new_reads = 'const sharedRouteRuntimeGate = await read("./modules/core-sources/shared-route-runtime-gate.js");\nconst sharedCoreContracts = await read("./modules/core-sources/shared-core-contracts.js");\nconst sharedRemaining = await read("./modules/core-sources/shared.js");'
assert text.count(old_reads) == 1
text = text.replace(old_reads, new_reads)
old_remaining = '''invariant(\n  sharedRemaining.startsWith(";(() => {\\n  function tableHeaderContext() {")\n    && !sharedRemaining.includes("__mflUniversalClubSearch")'''
new_remaining = '''invariant(\n  sharedCoreContracts.startsWith(";(() => {\\n  function tableHeaderContext() {")\n    && sharedCoreContracts.includes("function ensureCanonicalTableHeader() {")\n    && sharedCoreContracts.includes("function installSearchMatching() {")\n    && sharedCoreContracts.includes("function installEvaluationRecentStateOwnership() {")\n    && sharedCoreContracts.includes("window.__mflCoreContracts = Object.freeze({")\n    && sharedCoreContracts.replace(/\\s*$/, "").endsWith("})();"),\n  "Shared core contracts must own the explicit Table/Search/Evaluation bridge published through the frozen __mflCoreContracts facade.",\n);\ninvariant(\n  sharedRemaining.startsWith("window.__mflMarkApplicationCoreLoaded?.();")\n    && !sharedRemaining.includes("__mflUniversalClubSearch")'''
assert text.count(old_remaining) == 1
text = text.replace(old_remaining, new_remaining)
text = text.replace(
    '"Remaining Shared behavior must begin at the later table-header/search-runtime compatibility boundary with legacy Club-search wrappers and incremental public-function replacements retired.",',
    '"Remaining Shared behavior must begin at application-core publication/startup after the explicit core-contract bridge.",',
)
old_boundary = '&& !sharedIncrementalNavigation.includes("function setPageWithRouteRuntime")\n    && !sharedRouteRuntimeGate.includes("function tableHeaderContext"),'
new_boundary = '&& !sharedIncrementalNavigation.includes("function setPageWithRouteRuntime")\n    && !sharedRouteRuntimeGate.includes("function tableHeaderContext")\n    && !sharedCoreContracts.includes("window.__mflMarkApplicationCoreLoaded"),'
assert text.count(old_boundary) == 1
text = text.replace(old_boundary, new_boundary)
text = text.replace(
    'incremental navigation, and the route-runtime gate must not absorb later ownership domains.',
    'incremental navigation, the route-runtime gate, and explicit core contracts must not absorb later ownership domains.',
)
text = text.replace(
    'before incremental navigation orchestration before the stable route-runtime gate before remaining shared behavior',
    'before incremental navigation orchestration before the stable route-runtime gate before explicit core contracts before remaining shared behavior',
)
ownership_path.write_text(text)

for path in root.joinpath('site').glob('validate*.mjs'):
    data = path.read_text()
    assert 'sources?.length === 26' not in data, f'Stale Shared source count remains in {path}'
    assert 'sources[25] === "shared.js"' not in data, f'Stale Shared tail remains in {path}'

print(f'Extracted {len(contracts.splitlines())} core-contract lines; remaining Shared starts: {remaining.splitlines()[0]}')
