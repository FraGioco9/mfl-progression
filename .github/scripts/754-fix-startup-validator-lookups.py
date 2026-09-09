from pathlib import Path

root = Path('site')

# AST binding validation needs the manifest-assembled Shared source, not final shared.js.
path = root / 'validate-generated-core-bindings.mjs'
text = path.read_text(encoding='utf-8')
anchor = 'import { readValidationText } from "./validation-text.mjs";\n'
insert = 'import { readCanonicalCoreSource } from "./validate-core-sources.mjs";\n'
assert insert not in text
assert text.count(anchor) == 1
text = text.replace(anchor, anchor + insert)
old = '  core: await read("./modules/core-sources/shared.js"),'
new = '  core: readCanonicalCoreSource("shared"),'
assert text.count(old) == 1
path.write_text(text.replace(old, new), encoding='utf-8')

# Persistence validation intentionally spans all canonical application-core domains.
path = root / 'validate-supabase-persistence.mjs'
text = path.read_text(encoding='utf-8')
anchor = 'import { fileURLToPath } from "node:url";\n'
insert = 'import { readCombinedCanonicalCoreSource } from "./validate-core-sources.mjs";\n'
assert insert not in text
assert text.count(anchor) == 1
text = text.replace(anchor, anchor + insert)
old_start = '''const appCore = await Promise.all([\n    read(resolve(siteRoot, "modules/core-sources/shared.js")),\n    read(resolve(siteRoot, "modules/core-sources/evaluation.js")),\n    read(resolve(siteRoot, "modules/core-sources/mfl-stats.js")),\n    read(resolve(siteRoot, "modules/core-sources/club.js")),\n    read(resolve(siteRoot, "modules/core-sources/settings.js")),\n    read(resolve(siteRoot, "modules/core-sources/player.js")),\n    read(resolve(siteRoot, "modules/core-sources/table.js")),\n    read(resolve(siteRoot, "modules/core-sources/wallet.js")),\n    read(resolve(siteRoot, "modules/core-sources/watchlist.js")),\n  ]).then((parts) => parts.join("\\n"));'''
new_start = 'const appCore = readCombinedCanonicalCoreSource();'
assert text.count(old_start) == 1
path.write_text(text.replace(old_start, new_start), encoding='utf-8')

# Startup handshake likewise validates the complete canonical core plus generated output.
path = root / 'validate-app-core-startup-handshake.mjs'
text = path.read_text(encoding='utf-8')
anchor = 'import { readValidationText } from "./validation-text.mjs";\n'
insert = 'import { readCombinedCanonicalCoreSource } from "./validate-core-sources.mjs";\n'
assert insert not in text
assert text.count(anchor) == 1
text = text.replace(anchor, anchor + insert)
old = '''  Promise.all([\n    read("./modules/core-sources/shared.js"),\n    read("./modules/core-sources/evaluation.js"),\n    read("./modules/core-sources/mfl-stats.js"),\n    read("./modules/core-sources/club.js"),\n    read("./modules/core-sources/settings.js"),\n    read("./modules/core-sources/player.js"),\n    read("./modules/core-sources/table.js"),\n    read("./modules/core-sources/wallet.js"),\n    read("./modules/core-sources/watchlist.js"),\n  ]).then((parts) => parts.join("\\n")),'''
new = '  Promise.resolve(readCombinedCanonicalCoreSource()),'
assert text.count(old) == 1
path.write_text(text.replace(old, new), encoding='utf-8')
