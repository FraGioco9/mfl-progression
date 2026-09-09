from pathlib import Path

root = Path('site')

# The feature validators must inspect the manifest-assembled Shared core rather than
# assuming late Shared behavior still lives physically in shared.js.
for relative, import_anchor in [
    ('validate-table-loading-state.mjs', 'import { readFile } from "node:fs/promises";\n'),
    ('validate-pager-current-page.mjs', 'import { readValidationText } from "./validation-text.mjs";\n'),
]:
    path = root / relative
    text = path.read_text(encoding='utf-8')
    canonical_import = 'import { readCanonicalCoreSource } from "./validate-core-sources.mjs";\n'
    assert canonical_import not in text, f'{relative}: canonical reader already present unexpectedly'
    assert text.count(import_anchor) == 1, f'{relative}: import anchor moved'
    text = text.replace(import_anchor, import_anchor + canonical_import)
    old_shared_read = '    read("./modules/core-sources/shared.js"),'
    new_shared_read = '    Promise.resolve(readCanonicalCoreSource("shared")),'
    assert text.count(old_shared_read) == 1, f'{relative}: physical shared read anchor moved'
    text = text.replace(old_shared_read, new_shared_read)
    path.write_text(text, encoding='utf-8')

# The transport guard should enumerate canonical physical sources from the manifest,
# while the migrated Shared transport owner follows the extracted incremental block.
path = root / 'validate-data-client-runtime-ownership.mjs'
text = path.read_text(encoding='utf-8')
import_anchor = 'import { readdir, readFile } from "node:fs/promises";\n'
manifest_import = 'import { coreSourceManifest } from "./modules/core-source-manifest.js";\n'
assert manifest_import not in text
assert text.count(import_anchor) == 1
text = text.replace(import_anchor, import_anchor + manifest_import)
old_names = '''const CORE_SOURCE_NAMES = Object.freeze([\n  "shared.js",\n  "evaluation.js",\n  "mfl-stats.js",\n  "club.js",\n  "settings.js",\n  "player.js",\n  "table.js",\n  "wallet.js",\n  "watchlist.js",\n]);'''
new_names = 'const CORE_SOURCE_NAMES = Object.freeze([...new Set(coreSourceManifest.flatMap(({ sources }) => sources))]);'
assert text.count(old_names) == 1, 'core-source hard-coded list moved'
text = text.replace(old_names, new_names)
assert text.count('  "shared.js",\n  "table.js",') == 1, 'migrated Shared owner anchor moved'
text = text.replace('  "shared.js",\n  "table.js",', '  "shared-incremental-routing.js",\n  "table.js",')
path.write_text(text, encoding='utf-8')
