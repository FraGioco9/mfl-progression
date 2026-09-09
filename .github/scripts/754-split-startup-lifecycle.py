from pathlib import Path

root = Path('site')
shared_path = root / 'modules/core-sources/shared.js'
source = shared_path.read_text(encoding='utf-8').replace('\r\n', '\n').replace('\r', '\n')
start = 'function setupChangelogSections() {'
remaining_start = ';(() => {'
assert source.startswith(start), 'Shared head moved before startup-lifecycle extraction.'
compat_index = source.index(remaining_start, source.index('async function startApp() {'))
fragment = source[:compat_index].rstrip() + '\n'
remainder = source[compat_index:]
assert fragment.startswith(start)
assert 'async function startApp() {' in fragment
assert fragment.rstrip().endswith('});\n}')
assert remainder.startswith(remaining_start)
(root / 'modules/core-sources/shared-startup-lifecycle.js').write_text(fragment, encoding='utf-8')
shared_path.write_text(remainder, encoding='utf-8')

manifest_path = root / 'modules/core-source-manifest.js'
manifest = manifest_path.read_text(encoding='utf-8')
old = '"shared-interaction-bindings.js", "shared.js"'
new = '"shared-interaction-bindings.js", "shared-startup-lifecycle.js", "shared.js"'
assert manifest.count(old) == 1
manifest_path.write_text(manifest.replace(old, new), encoding='utf-8')

ownership_path = root / 'validate-core-source-ownership.mjs'
ownership = ownership_path.read_text(encoding='utf-8')
replacements = [
    ('sharedEntry?.sources?.length === 22', 'sharedEntry?.sources?.length === 23'),
    ('&& sharedEntry.sources[21] === "shared.js"', '&& sharedEntry.sources[21] === "shared-startup-lifecycle.js"\n    && sharedEntry.sources[22] === "shared.js"'),
    ('before global interaction bindings before remaining shared behavior', 'before global interaction bindings before Changelog/startup lifecycle before remaining shared behavior'),
    ('const sharedInteractionBindings = await read("./modules/core-sources/shared-interaction-bindings.js");\nconst sharedRemaining = await read("./modules/core-sources/shared.js");', 'const sharedInteractionBindings = await read("./modules/core-sources/shared-interaction-bindings.js");\nconst sharedStartupLifecycle = await read("./modules/core-sources/shared-startup-lifecycle.js");\nconst sharedRemaining = await read("./modules/core-sources/shared.js");'),
    ('''invariant(\n  sharedRemaining.startsWith("function setupChangelogSections() {")\n    && !sharedRemaining.includes("function csvEscape")\n    && !sharedRemaining.includes("function mflChunkFromPublicData")\n    && !sharedRemaining.includes("function progressionDataColumns"),\n  "Remaining Shared behavior must begin at the Changelog/startup lifecycle boundary and keep unused serialization/data helpers retired.",\n);''', '''invariant(\n  sharedStartupLifecycle.startsWith("function setupChangelogSections() {")\n    && sharedStartupLifecycle.includes("async function startApp() {")\n    && sharedStartupLifecycle.includes("setupChangelogSections();")\n    && sharedStartupLifecycle.includes("await initialRouteRuntimeReadyPromise;")\n    && sharedStartupLifecycle.replace(/\\s*$/, "").endsWith("});\\n}"),\n  "Shared startup lifecycle must own Changelog section setup and the canonical startApp definition through background startup convergence.",\n);\ninvariant(\n  sharedRemaining.startsWith(";(() => {")\n    && !sharedRemaining.includes("function csvEscape")\n    && !sharedRemaining.includes("function mflChunkFromPublicData")\n    && !sharedRemaining.includes("function progressionDataColumns"),\n  "Remaining Shared behavior must begin at the universal Club-search compatibility boundary and keep unused serialization/data helpers retired.",\n);'''),
    ('&& !sharedInteractionBindings.includes("function setupChangelogSections"),', '&& !sharedInteractionBindings.includes("function setupChangelogSections")\n    && !sharedStartupLifecycle.includes("__mflUniversalClubSearch"),'),
    ('incremental routing, and global interaction bindings must not absorb later ownership domains.', 'incremental routing, global interaction bindings, and startup lifecycle must not absorb later ownership domains.'),
]
for old, new in replacements:
    assert ownership.count(old) == 1, f'ownership replacement missing: {old}'
    ownership = ownership.replace(old, new)
ownership_path.write_text(ownership, encoding='utf-8')

for relative in ['validate.mjs', 'validate-club-route-core.mjs']:
    path = root / relative
    text = path.read_text(encoding='utf-8')
    assert text.count('sources?.length === 22') == 1, f'{relative}: shared count anchor moved'
    text = text.replace('sources?.length === 22', 'sources?.length === 23')
    if relative == 'validate.mjs':
        old_tail = '&& sharedCoreManifest.sources[21] === "shared.js"'
        new_tail = '&& sharedCoreManifest.sources[21] === "shared-startup-lifecycle.js"\n    && sharedCoreManifest.sources[22] === "shared.js"'
    else:
        old_tail = '&& coreSourceByDomain.shared.sources[21] === "shared.js"'
        new_tail = '&& coreSourceByDomain.shared.sources[21] === "shared-startup-lifecycle.js"\n    && coreSourceByDomain.shared.sources[22] === "shared.js"'
    assert text.count(old_tail) == 1, f'{relative}: shared tail anchor moved'
    path.write_text(text.replace(old_tail, new_tail), encoding='utf-8')
