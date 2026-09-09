from pathlib import Path

root = Path('site')
shared_path = root / 'modules/core-sources/shared.js'
source = shared_path.read_text(encoding='utf-8').replace('\r\n', '\n').replace('\r', '\n')
start = 'let pendingViewButtonPointer = null;'
remaining_start = 'function setupChangelogSections() {'
assert source.startswith(start), 'Shared head moved before interaction-binding extraction.'
assert source.count(remaining_start) == 1, 'Unexpected Changelog boundary count.'
remaining_index = source.index(remaining_start)
fragment = source[:remaining_index].rstrip() + '\n'
remainder = source[remaining_index:]
assert fragment.startswith(start)
assert fragment.rstrip().endswith('if (myPlayersOptInButton) {\n  myPlayersOptInButton.addEventListener("click", linkWallet);\n}')
assert 'function setupChangelogSections() {' not in fragment
assert remainder.startswith(remaining_start)
(root / 'modules/core-sources/shared-interaction-bindings.js').write_text(fragment, encoding='utf-8')
shared_path.write_text(remainder, encoding='utf-8')

manifest_path = root / 'modules/core-source-manifest.js'
manifest = manifest_path.read_text(encoding='utf-8')
old = '"shared-incremental-routing.js", "shared.js"'
new = '"shared-incremental-routing.js", "shared-interaction-bindings.js", "shared.js"'
assert manifest.count(old) == 1
manifest_path.write_text(manifest.replace(old, new), encoding='utf-8')

ownership_path = root / 'validate-core-source-ownership.mjs'
ownership = ownership_path.read_text(encoding='utf-8')
replacements = [
    ('sharedEntry?.sources?.length === 21', 'sharedEntry?.sources?.length === 22'),
    ('&& sharedEntry.sources[20] === "shared.js"', '&& sharedEntry.sources[20] === "shared-interaction-bindings.js"\n    && sharedEntry.sources[21] === "shared.js"'),
    ('before incremental routing/cache/request before remaining shared behavior', 'before incremental routing/cache/request before global interaction bindings before remaining shared behavior'),
    ('const sharedIncrementalRouting = await read("./modules/core-sources/shared-incremental-routing.js");\nconst sharedRemaining = await read("./modules/core-sources/shared.js");', 'const sharedIncrementalRouting = await read("./modules/core-sources/shared-incremental-routing.js");\nconst sharedInteractionBindings = await read("./modules/core-sources/shared-interaction-bindings.js");\nconst sharedRemaining = await read("./modules/core-sources/shared.js");'),
    ('''invariant(\n  sharedRemaining.startsWith("let pendingViewButtonPointer = null;")\n    && !sharedRemaining.includes("function csvEscape")\n    && !sharedRemaining.includes("function mflChunkFromPublicData")\n    && !sharedRemaining.includes("function progressionDataColumns"),\n  "Remaining Shared behavior must begin at the view-button pointer/interaction boundary and keep unused serialization/data helpers retired.",\n);''', '''invariant(\n  sharedInteractionBindings.startsWith("let pendingViewButtonPointer = null;")\n    && sharedInteractionBindings.includes("function activateViewButton(button) {")\n    && sharedInteractionBindings.includes("viewButtons.forEach((button) => {")\n    && sharedInteractionBindings.includes('document.addEventListener("keydown", (event) => {')\n    && sharedInteractionBindings.includes("navButtons.forEach((button) => {")\n    && sharedInteractionBindings.includes('window.addEventListener("popstate", () => {')\n    && sharedInteractionBindings.replace(/\\s*$/, "").endsWith('if (myPlayersOptInButton) {\\n  myPlayersOptInButton.addEventListener("click", linkWallet);\\n}'),\n  "Shared interaction bindings must own eager view-button, global keyboard/dropdown, navigation, and account interaction wiring.",\n);\ninvariant(\n  sharedRemaining.startsWith("function setupChangelogSections() {")\n    && !sharedRemaining.includes("function csvEscape")\n    && !sharedRemaining.includes("function mflChunkFromPublicData")\n    && !sharedRemaining.includes("function progressionDataColumns"),\n  "Remaining Shared behavior must begin at the Changelog/startup lifecycle boundary and keep unused serialization/data helpers retired.",\n);'''),
    ('&& !sharedIncrementalRouting.includes("let pendingViewButtonPointer"),', '&& !sharedIncrementalRouting.includes("let pendingViewButtonPointer")\n    && !sharedInteractionBindings.includes("function setupChangelogSections"),'),
    ('HTML escaping, and incremental routing must not absorb later ownership domains.', 'HTML escaping, incremental routing, and global interaction bindings must not absorb later ownership domains.'),
]
for old, new in replacements:
    assert ownership.count(old) == 1, f'ownership replacement missing: {old}'
    ownership = ownership.replace(old, new)
ownership_path.write_text(ownership, encoding='utf-8')

for relative in ['validate.mjs', 'validate-club-route-core.mjs']:
    path = root / relative
    text = path.read_text(encoding='utf-8')
    assert text.count('sources?.length === 21') == 1, f'{relative}: shared count anchor moved'
    text = text.replace('sources?.length === 21', 'sources?.length === 22')
    if relative == 'validate.mjs':
        old_tail = '&& sharedCoreManifest.sources[20] === "shared.js"'
        new_tail = '&& sharedCoreManifest.sources[20] === "shared-interaction-bindings.js"\n    && sharedCoreManifest.sources[21] === "shared.js"'
    else:
        old_tail = '&& coreSourceByDomain.shared.sources[20] === "shared.js"'
        new_tail = '&& coreSourceByDomain.shared.sources[20] === "shared-interaction-bindings.js"\n    && coreSourceByDomain.shared.sources[21] === "shared.js"'
    assert text.count(old_tail) == 1, f'{relative}: shared tail anchor moved'
    path.write_text(text.replace(old_tail, new_tail), encoding='utf-8')
