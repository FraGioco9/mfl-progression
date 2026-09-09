from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site"
CORE = SITE / "modules" / "core-sources"


def read(path):
    return path.read_text(encoding="utf-8").replace("\r\n", "\n").replace("\r", "\n")


def write(path, text):
    path.write_text(text, encoding="utf-8", newline="\n")


def replace_once(path, old, new):
    text = read(path)
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"Expected exactly one replacement in {path}: found {count}\n{old}")
    write(path, text.replace(old, new, 1))


table_path = CORE / "table.js"
table = read(table_path)
marker = "function copyDelegatedPlayerId(button, event) {"
if table.count(marker) != 1:
    raise RuntimeError("Table interaction-binding boundary is not unique")
index = table.index(marker)
prefix = table[:index].rstrip()
suffix = table[index:].rstrip()
if prefix + "\n\n" + suffix != table.rstrip():
    raise RuntimeError("Table split would change manifest-assembled source bytes/order")
if not prefix.endswith('if (state.currentPage === "watchlist") saveTableState();\n}'):
    raise RuntimeError("Unexpected Table prefix boundary before delegated interactions")
if not suffix.endswith('nextButton.addEventListener("click", () => {\n  if (state.incrementalMode) {\n    void reloadIncrementalPage(state.page + 1, { loadingMode: "blank" });\n    return;\n  }\n  state.page += 1;\n  renderTable();\n});'):
    raise RuntimeError("Unexpected Table suffix boundary")
write(table_path, prefix + "\n")
write(CORE / "table-interaction-bindings.js", suffix + "\n")

manifest = SITE / "modules" / "core-source-manifest.js"
replace_once(
    manifest,
    '["table", "table.js", "app-core-table-runtime.js", "// Generated Table core from modules/core-sources/table.js. Do not edit directly.\\n"],',
    '["table", ["table.js", "table-interaction-bindings.js"], "app-core-table-runtime.js", "// Generated Table core from modules/core-sources/table.js. Do not edit directly.\\n"],',
)

# Main validator: assemble Table from the manifest just like Shared.
validate = SITE / "validate.mjs"
replace_once(
    validate,
    'const canonicalTableCore = (await readSite("modules/core-sources/table.js")).replace(/\\s*$/, "");',
    'const tableCoreManifest = coreSourceByDomain.table;\ninvariant(\n  tableCoreManifest?.source === "table.js"\n    && tableCoreManifest?.sources?.length === 2\n    && tableCoreManifest.sources[0] === "table.js"\n    && tableCoreManifest.sources[1] === "table-interaction-bindings.js"\n    && tableCoreManifest?.runtime === "app-core-table-runtime.js",\n  "Canonical manifest must map the ordered Table core fragments to app-core-table-runtime.js.",\n);\nconst canonicalTableCore = (await Promise.all(\n  tableCoreManifest.sources.map((sourceName) => readSite(`modules/core-sources/${sourceName}`)),\n)).map((part) => part.replace(/\\s*$/, "")).join("\\n\\n");',
)

# Table route ownership validator already has the canonical source reader available.
route_core = SITE / "validate-table-route-core.mjs"
replace_once(route_core, '  read("./modules/core-sources/table.js"),', '  Promise.resolve(readCanonicalCoreSource("table")),')
replace_once(
    route_core,
    '  coreSourceByDomain.table?.source === "table.js"\n    && coreSourceByDomain.table?.runtime === "app-core-table-runtime.js",',
    '  coreSourceByDomain.table?.source === "table.js"\n    && coreSourceByDomain.table?.sources?.length === 2\n    && coreSourceByDomain.table.sources[0] === "table.js"\n    && coreSourceByDomain.table.sources[1] === "table-interaction-bindings.js"\n    && coreSourceByDomain.table?.runtime === "app-core-table-runtime.js",',
)
replace_once(route_core, '"Generated Table runtime must exactly match canonical table.js."', '"Generated Table runtime must exactly match the manifest-assembled canonical Table source."')

# Club depends on the complete Table core and validates generated equivalence.
club = SITE / "validate-club-route-core.mjs"
replace_once(club, '  read("./modules/core-sources/table.js"),', '  Promise.resolve(readCanonicalCoreSource("table")),')
replace_once(
    club,
    'invariant(coreSourceByDomain.table?.source === "table.js" && coreSourceByDomain.table?.runtime === "app-core-table-runtime.js", "The core manifest must generate Table runtime directly from table.js.");',
    'invariant(\n  coreSourceByDomain.table?.source === "table.js"\n    && coreSourceByDomain.table?.sources?.length === 2\n    && coreSourceByDomain.table.sources[0] === "table.js"\n    && coreSourceByDomain.table.sources[1] === "table-interaction-bindings.js"\n    && coreSourceByDomain.table?.runtime === "app-core-table-runtime.js",\n  "The core manifest must generate Table runtime from its ordered canonical fragments.",\n);',
)

# Filter/selection lifecycle spans the owner functions and their bindings.
filter_lifecycle = SITE / "validate-table-filter-selection-lifecycle.mjs"
replace_once(filter_lifecycle, '  read("./modules/core-sources/table.js"),', '  Promise.resolve(readCanonicalCoreSource("table")),')
replace_once(
    filter_lifecycle,
    '    && coreSourceByDomain.table?.source === "table.js"\n    && coreSourceByDomain.table?.runtime === "app-core-table-runtime.js",',
    '    && coreSourceByDomain.table?.source === "table.js"\n    && coreSourceByDomain.table?.sources?.length === 2\n    && coreSourceByDomain.table.sources[0] === "table.js"\n    && coreSourceByDomain.table.sources[1] === "table-interaction-bindings.js"\n    && coreSourceByDomain.table?.runtime === "app-core-table-runtime.js",',
)

# Mobile Table behavior is a whole-domain contract even though its implementation remains in the first fragment.
mobile_retry = SITE / "validate-mobile-table-retry.mjs"
replace_once(
    mobile_retry,
    'import { coreSourceByDomain } from "./modules/core-source-manifest.js";\n',
    'import { coreSourceByDomain } from "./modules/core-source-manifest.js";\nimport { readCanonicalCoreSource } from "./validate-core-sources.mjs";\n',
)
replace_once(mobile_retry, '  read("./modules/core-sources/table.js"),', '  Promise.resolve(readCanonicalCoreSource("table")),')
replace_once(
    mobile_retry,
    'if (coreSourceByDomain.table?.source !== "table.js" || coreSourceByDomain.table?.runtime !== "app-core-table-runtime.js") {\n  throw new Error("The core manifest must emit Table runtime directly from table.js.");\n}',
    'if (coreSourceByDomain.table?.source !== "table.js"\n  || coreSourceByDomain.table?.sources?.length !== 2\n  || coreSourceByDomain.table.sources[0] !== "table.js"\n  || coreSourceByDomain.table.sources[1] !== "table-interaction-bindings.js"\n  || coreSourceByDomain.table?.runtime !== "app-core-table-runtime.js") {\n  throw new Error("The core manifest must emit Table runtime from its ordered canonical fragments.");\n}',
)
replace_once(mobile_retry, '"Generated Table runtime must exactly match canonical table.js."', '"Generated Table runtime must exactly match the manifest-assembled canonical Table source."')

compact = SITE / "validate-mobile-table-compact-contract.mjs"
replace_once(
    compact,
    'import { fileURLToPath } from "node:url";\n',
    'import { fileURLToPath } from "node:url";\n\nimport { readCanonicalCoreSource } from "./validate-core-sources.mjs";\n',
)
replace_once(
    compact,
    'const tableSource = readFileSync(resolve(root, "modules/core-sources/table.js"), "utf8");',
    'const tableSource = readCanonicalCoreSource("table");',
)
replace_once(compact, '"Generated Table runtime must exactly match canonical table.js."', '"Generated Table runtime must exactly match the manifest-assembled canonical Table source."')

print("Split Table interaction bindings into a manifest-owned second fragment without changing assembled source order.")
