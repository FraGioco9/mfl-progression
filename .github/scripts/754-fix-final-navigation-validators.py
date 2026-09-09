from pathlib import Path


def replace_exact(path, old, new, expected=1):
    file_path = Path(path)
    text = file_path.read_text(encoding="utf-8")
    count = text.count(old)
    if count != expected:
        raise SystemExit(f"{path}: expected {expected} occurrence(s), found {count}: {old!r}")
    file_path.write_text(text.replace(old, new), encoding="utf-8")

# Protected-route rendering is owned by renderPage; setPage is now the stable incremental facade.
replace_exact(
    "site/validate-static-route-ui.mjs",
    "const setPageStart = coreSource.indexOf('async function setPage(pageName, updateHash = true, options = {}) {');\ninvariant(setPageStart >= 0, \"Canonical setPage must exist for opted-out route validation.\");",
    "const setPageStart = coreSource.indexOf('async function renderPage(pageName, updateHash = true, options = {}) {');\ninvariant(setPageStart >= 0, \"Canonical base page renderer must exist for opted-out route validation.\");",
)
replace_exact(
    "site/validate-static-route-ui.mjs",
    '"Opted-out protected routes must preserve the requested refresh URL and reuse one scoped setPage lock decision."',
    '"Opted-out protected routes must preserve the requested refresh URL and reuse one scoped base-render lock decision."',
)

# Database Stats must validate against the manifest-assembled canonical core, not the physical Shared tail.
replace_exact(
    "site/validate-database-stats-lazy-runtime.mjs",
    'import { readValidationText } from "./validation-text.mjs";\n',
    'import { readValidationText } from "./validation-text.mjs";\nimport { readCombinedCanonicalCoreSource } from "./validate-core-sources.mjs";\n',
)
old_database_core = '''const coreSource = await Promise.all([\n    read("./modules/core-sources/shared.js"),\n    read("./modules/core-sources/evaluation.js"),\n    read("./modules/core-sources/mfl-stats.js"),\n    read("./modules/core-sources/club.js"),\n    read("./modules/core-sources/settings.js"),\n    read("./modules/core-sources/player.js"),\n    read("./modules/core-sources/table.js"),\n    read("./modules/core-sources/wallet.js"),\n    read("./modules/core-sources/watchlist.js"),\n  ]).then((parts) => parts.join("\\n"));'''
replace_exact(
    "site/validate-database-stats-lazy-runtime.mjs",
    old_database_core,
    "const coreSource = readCombinedCanonicalCoreSource();",
)

# Cached pager validation needs the complete canonical Shared source after fragment extraction.
replace_exact(
    "site/validate-pager-cached-route-restore.mjs",
    'import { readFile } from "node:fs/promises";\n',
    'import { readFile } from "node:fs/promises";\nimport { readCanonicalCoreSource } from "./validate-core-sources.mjs";\n',
)
replace_exact(
    "site/validate-pager-cached-route-restore.mjs",
    'const [loadingRuntime, sharedCore] = await Promise.all([\n  read("./table-loading-runtime.js"),\n  read("./modules/core-sources/shared.js"),\n]);',
    'const [loadingRuntime, sharedCore] = await Promise.all([\n  read("./table-loading-runtime.js"),\n  Promise.resolve(readCanonicalCoreSource("shared")),\n]);',
)

print("Fixed final incremental-navigation validator ownership inputs.")
