from pathlib import Path

root = Path("site")
shared_path = root / "modules/core-sources/shared.js"
source = shared_path.read_text(encoding="utf-8").replace("\r\n", "\n").replace("\r", "\n")
start = "function clubRouteTargetFromPath() {"
end_marker = "window.mflReloadIncrementalPage = reloadIncrementalPage;"
remainder_start = "let pendingViewButtonPointer = null;"
assert source.startswith(start), "Shared head moved before incremental-routing extraction."
end_index = source.index(end_marker) + len(end_marker)
fragment = source[:end_index].rstrip() + "\n"
remainder = source[end_index:].lstrip("\n")
assert fragment.startswith(start)
assert fragment.rstrip().endswith(end_marker)
assert "async function reloadIncrementalPage(page = state.page, options = {}) {" in fragment
assert remainder.startswith(remainder_start), "Incremental-routing tail boundary moved."
(root / "modules/core-sources/shared-incremental-routing.js").write_text(fragment, encoding="utf-8")
shared_path.write_text(remainder, encoding="utf-8")

manifest_path = root / "modules/core-source-manifest.js"
manifest = manifest_path.read_text(encoding="utf-8")
old_manifest = '"shared-wallet-row-classification.js", "shared-html-escaping.js", "shared.js"'
new_manifest = '"shared-wallet-row-classification.js", "shared-html-escaping.js", "shared-incremental-routing.js", "shared.js"'
assert manifest.count(old_manifest) == 1
manifest_path.write_text(manifest.replace(old_manifest, new_manifest), encoding="utf-8")

ownership_path = root / "validate-core-source-ownership.mjs"
ownership = ownership_path.read_text(encoding="utf-8")
replacements = [
    ("sharedEntry?.sources?.length === 20", "sharedEntry?.sources?.length === 21"),
    ('&& sharedEntry.sources[19] === "shared.js"', '&& sharedEntry.sources[19] === "shared-incremental-routing.js"\n    && sharedEntry.sources[20] === "shared.js"'),
    ("before universal HTML escaping before remaining shared behavior", "before universal HTML escaping before incremental routing/cache/request before remaining shared behavior"),
    ('const sharedHtmlEscaping = await read("./modules/core-sources/shared-html-escaping.js");\nconst sharedRemaining = await read("./modules/core-sources/shared.js");', 'const sharedHtmlEscaping = await read("./modules/core-sources/shared-html-escaping.js");\nconst sharedIncrementalRouting = await read("./modules/core-sources/shared-incremental-routing.js");\nconst sharedRemaining = await read("./modules/core-sources/shared.js");'),
    ('''invariant(
  sharedRemaining.startsWith("function clubRouteTargetFromPath() {")
    && !sharedRemaining.includes("function csvEscape")
    && !sharedRemaining.includes("function mflChunkFromPublicData")
    && !sharedRemaining.includes("function progressionDataColumns"),
  "Remaining Shared behavior must begin at the live incremental-routing boundary and keep unused serialization/data helpers retired.",
);''', '''invariant(
  sharedIncrementalRouting.startsWith("function clubRouteTargetFromPath() {")
    && sharedIncrementalRouting.replace(/\\s*$/, "").endsWith("window.mflReloadIncrementalPage = reloadIncrementalPage;")
    && !sharedIncrementalRouting.includes("function csvEscape")
    && !sharedIncrementalRouting.includes("function mflChunkFromPublicData")
    && !sharedIncrementalRouting.includes("function progressionDataColumns"),
  "Shared incremental routing must own canonical route targeting, cache/request coordination, incremental payload application, and reload through the published reload facade.",
);
invariant(
  sharedRemaining.startsWith("let pendingViewButtonPointer = null;")
    && !sharedRemaining.includes("function csvEscape")
    && !sharedRemaining.includes("function mflChunkFromPublicData")
    && !sharedRemaining.includes("function progressionDataColumns"),
  "Remaining Shared behavior must begin at the view-button pointer/interaction boundary and keep unused serialization/data helpers retired.",
);'''),
    ('&& !sharedHtmlEscaping.includes("function mflChunkFromPublicData"),', '&& !sharedHtmlEscaping.includes("function clubRouteTargetFromPath")\n    && !sharedIncrementalRouting.includes("let pendingViewButtonPointer"),'),
    ("wallet-row classification, and HTML escaping must not absorb later ownership domains.", "wallet-row classification, HTML escaping, and incremental routing must not absorb later ownership domains."),
]
for old, new in replacements:
    assert ownership.count(old) == 1, f"Ownership anchor missing: {old}"
    ownership = ownership.replace(old, new)
ownership_path.write_text(ownership, encoding="utf-8")

for relative in ["validate.mjs", "validate-club-route-core.mjs"]:
    path = root / relative
    text = path.read_text(encoding="utf-8")
    assert text.count("sources?.length === 20") == 1, f"{relative}: Shared count anchor moved"
    text = text.replace("sources?.length === 20", "sources?.length === 21")
    if relative == "validate.mjs":
        old_tail = '&& sharedCoreManifest.sources[19] === "shared.js"'
        new_tail = '&& sharedCoreManifest.sources[19] === "shared-incremental-routing.js"\n    && sharedCoreManifest.sources[20] === "shared.js"'
    else:
        old_tail = '&& coreSourceByDomain.shared.sources[19] === "shared.js"'
        new_tail = '&& coreSourceByDomain.shared.sources[19] === "shared-incremental-routing.js"\n    && coreSourceByDomain.shared.sources[20] === "shared.js"'
    assert text.count(old_tail) == 1, f"{relative}: Shared tail anchor moved"
    path.write_text(text.replace(old_tail, new_tail), encoding="utf-8")
