from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site"
CORE = SITE / "modules" / "core-sources"


def read(path):
    return path.read_text(encoding="utf-8").replace("\r\n", "\n").replace("\r", "\n")


def write(path, text):
    path.write_text(text, encoding="utf-8", newline="\n")


table_path = CORE / "table.js"
table = read(table_path)
marker = "function compactMobilePlayerName(value) {"
if table.count(marker) != 1:
    raise RuntimeError(f"Expected one Table render-lifecycle boundary, found {table.count(marker)}")
index = table.index(marker)
prefix = table[:index].rstrip()
suffix = "\n" + table[index:].rstrip()
if prefix + "\n\n" + suffix != table.rstrip():
    raise RuntimeError("Table render split would change assembled source bytes/order")
if not prefix.endswith("installPagerCurrentPageControl();\nsyncPagerCurrentPage(1, 1);"):
    raise RuntimeError("Unexpected Table pager/render lifecycle boundary")
if "function tableRenderTableOwner()" not in suffix or "async function tableSetViewOwner(viewName)" not in suffix:
    raise RuntimeError("Render lifecycle suffix is missing canonical render/view owners")
if "function pagerCurrentPageControl()" in suffix:
    raise RuntimeError("Pager lifecycle must remain outside the render lifecycle fragment")
if "function copyDelegatedPlayerId(button, event)" in suffix:
    raise RuntimeError("Interaction bindings must remain in their existing fragment")
write(table_path, prefix + "\n")
write(CORE / "table-render-lifecycle.js", suffix + "\n")

manifest = SITE / "modules" / "core-source-manifest.js"
manifest_text = read(manifest)
old_manifest = '["table", ["table.js", "table-interaction-bindings.js"], "app-core-table-runtime.js"'
new_manifest = '["table", ["table.js", "table-render-lifecycle.js", "table-interaction-bindings.js"], "app-core-table-runtime.js"'
if manifest_text.count(old_manifest) != 1:
    raise RuntimeError("Unexpected Table manifest shape")
write(manifest, manifest_text.replace(old_manifest, new_manifest, 1))

replacements = {
    'tableCoreManifest?.sources?.length === 2\n    && tableCoreManifest.sources[0] === "table.js"\n    && tableCoreManifest.sources[1] === "table-interaction-bindings.js"':
        'tableCoreManifest?.sources?.length === 3\n    && tableCoreManifest.sources[0] === "table.js"\n    && tableCoreManifest.sources[1] === "table-render-lifecycle.js"\n    && tableCoreManifest.sources[2] === "table-interaction-bindings.js"',
    'coreSourceByDomain.table?.sources?.length === 2\n    && coreSourceByDomain.table.sources[0] === "table.js"\n    && coreSourceByDomain.table.sources[1] === "table-interaction-bindings.js"':
        'coreSourceByDomain.table?.sources?.length === 3\n    && coreSourceByDomain.table.sources[0] === "table.js"\n    && coreSourceByDomain.table.sources[1] === "table-render-lifecycle.js"\n    && coreSourceByDomain.table.sources[2] === "table-interaction-bindings.js"',
    'coreSourceByDomain.table?.sources?.length !== 2\n  || coreSourceByDomain.table.sources[0] !== "table.js"\n  || coreSourceByDomain.table.sources[1] !== "table-interaction-bindings.js"':
        'coreSourceByDomain.table?.sources?.length !== 3\n  || coreSourceByDomain.table.sources[0] !== "table.js"\n  || coreSourceByDomain.table.sources[1] !== "table-render-lifecycle.js"\n  || coreSourceByDomain.table.sources[2] !== "table-interaction-bindings.js"',
}
changed = []
for path in sorted(SITE.glob("validate*.mjs")):
    text = read(path)
    original = text
    for old, new in replacements.items():
        text = text.replace(old, new)
    if text != original:
        write(path, text)
        changed.append(path.name)
if not changed:
    raise RuntimeError("No structural Table fragment-order validators were updated")

stale_table_assertions = (
    'tableCoreManifest?.sources?.length === 2\n    && tableCoreManifest.sources[0] === "table.js"\n    && tableCoreManifest.sources[1] === "table-interaction-bindings.js"',
    'coreSourceByDomain.table?.sources?.length === 2\n    && coreSourceByDomain.table.sources[0] === "table.js"\n    && coreSourceByDomain.table.sources[1] === "table-interaction-bindings.js"',
    'coreSourceByDomain.table?.sources?.length !== 2\n  || coreSourceByDomain.table.sources[0] !== "table.js"\n  || coreSourceByDomain.table.sources[1] !== "table-interaction-bindings.js"',
)
for path in sorted(SITE.glob("validate*.mjs")):
    text = read(path)
    if any(stale in text for stale in stale_table_assertions):
        raise RuntimeError(f"Stale two-fragment Table assertion remains in {path}")

print("Split Table render/view lifecycle into a third manifest-owned fragment.")
print("Updated structural validators:", ", ".join(changed))
