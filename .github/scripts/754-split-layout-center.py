from pathlib import Path

site = Path("site")
core = site / "modules" / "core-sources"
shared_path = core / "shared.js"
shared = shared_path.read_text(encoding="utf-8")
boundary = "/* Session-cached incremental route data and destination-first loading */"
assert shared.startswith("function syncLayoutCenter() {"), "Remaining Shared no longer starts at layout center."
assert shared.count(boundary) == 1, "Late incremental boundary must be unique."
index = shared.index(boundary)
fragment = shared[:index].rstrip() + "\n"
remaining = shared[index:]
assert fragment.endswith("})();\n"), "Layout-center fragment must end after its binding IIFE."
assert "const originalApplyFilters = applyFilters" not in fragment, "Layout-center fragment absorbed the incremental wrapper layer."
assert remaining.startswith(boundary), "Remaining Shared must begin at the late incremental layer."
(core / "shared-layout-center.js").write_text(fragment, encoding="utf-8")
shared_path.write_text(remaining, encoding="utf-8")

manifest_path = site / "modules" / "core-source-manifest.js"
manifest = manifest_path.read_text(encoding="utf-8")
old = '"shared-interaction-bindings.js", "shared-startup-lifecycle.js", "shared.js"'
new = '"shared-interaction-bindings.js", "shared-startup-lifecycle.js", "shared-layout-center.js", "shared.js"'
assert manifest.count(old) == 1, "Shared manifest tail changed."
manifest_path.write_text(manifest.replace(old, new), encoding="utf-8")

for relative, prefix in [
    ("validate.mjs", "sharedCoreManifest"),
    ("validate-club-route-core.mjs", "coreSourceByDomain.shared"),
]:
    path = site / relative
    source = path.read_text(encoding="utf-8")
    length_old = f'{prefix}?.sources?.length === 23'
    length_new = f'{prefix}?.sources?.length === 24'
    assert source.count(length_old) == 1, f"{relative} Shared count changed."
    source = source.replace(length_old, length_new)
    tail_old = (
        f'&& {prefix}.sources[21] === "shared-startup-lifecycle.js"\n'
        f'    && {prefix}.sources[22] === "shared.js"'
    )
    tail_new = (
        f'&& {prefix}.sources[21] === "shared-startup-lifecycle.js"\n'
        f'    && {prefix}.sources[22] === "shared-layout-center.js"\n'
        f'    && {prefix}.sources[23] === "shared.js"'
    )
    assert source.count(tail_old) == 1, f"{relative} Shared tail indices changed."
    path.write_text(source.replace(tail_old, tail_new), encoding="utf-8")

ownership_path = site / "validate-core-source-ownership.mjs"
ownership = ownership_path.read_text(encoding="utf-8")
assert ownership.count('sharedEntry?.sources?.length === 23') == 1
ownership = ownership.replace('sharedEntry?.sources?.length === 23', 'sharedEntry?.sources?.length === 24')
old_tail = '''&& sharedEntry.sources[21] === "shared-startup-lifecycle.js"\n    && sharedEntry.sources[22] === "shared.js"'''
new_tail = '''&& sharedEntry.sources[21] === "shared-startup-lifecycle.js"\n    && sharedEntry.sources[22] === "shared-layout-center.js"\n    && sharedEntry.sources[23] === "shared.js"'''
assert ownership.count(old_tail) == 1
ownership = ownership.replace(old_tail, new_tail)
old_message = "before global interaction bindings before Changelog/startup lifecycle before remaining shared behavior"
new_message = "before global interaction bindings before Changelog/startup lifecycle before layout-centered feedback before remaining shared behavior"
assert ownership.count(old_message) == 1
ownership = ownership.replace(old_message, new_message)
old_reads = '''const sharedStartupLifecycle = await read("./modules/core-sources/shared-startup-lifecycle.js");\nconst sharedRemaining = await read("./modules/core-sources/shared.js");'''
new_reads = '''const sharedStartupLifecycle = await read("./modules/core-sources/shared-startup-lifecycle.js");\nconst sharedLayoutCenter = await read("./modules/core-sources/shared-layout-center.js");\nconst sharedRemaining = await read("./modules/core-sources/shared.js");'''
assert ownership.count(old_reads) == 1
ownership = ownership.replace(old_reads, new_reads)
old_remaining = '''invariant(\n  sharedRemaining.startsWith("function syncLayoutCenter() {")\n    && !sharedRemaining.includes("__mflUniversalClubSearch")'''
new_remaining = '''invariant(\n  sharedLayoutCenter.startsWith("function syncLayoutCenter() {")\n    && sharedLayoutCenter.includes('window.addEventListener("resize", syncLayoutCenter, { passive: true });')\n    && sharedLayoutCenter.includes("new MutationObserver(syncLayoutCenter).observe(document.body, {")\n    && sharedLayoutCenter.replace(/\\s*$/, "").endsWith("})();")\n    && !sharedLayoutCenter.includes("const originalApplyFilters = applyFilters"),\n  "Shared layout centering must own page-content center synchronization and its resize/mutation bindings without absorbing incremental navigation overrides.",\n);\ninvariant(\n  sharedRemaining.startsWith("/* Session-cached incremental route data and destination-first loading */")\n    && sharedRemaining.includes("const originalApplyFilters = applyFilters;")\n    && !sharedRemaining.includes("__mflUniversalClubSearch")'''
assert ownership.count(old_remaining) == 1
ownership = ownership.replace(old_remaining, new_remaining)
old_remaining_message = "Remaining Shared behavior must begin at the layout-centering/late-runtime boundary with legacy Club-search wrappers and unused serialization/data helpers retired."
new_remaining_message = "Remaining Shared behavior must begin at the late incremental-runtime boundary with legacy Club-search wrappers and unused serialization/data helpers retired."
assert ownership.count(old_remaining_message) == 1
ownership = ownership.replace(old_remaining_message, new_remaining_message)
old_guard = '''&& !sharedInteractionBindings.includes("function setupChangelogSections")\n    && !sharedStartupLifecycle.includes("function syncLayoutCenter"),'''
new_guard = '''&& !sharedInteractionBindings.includes("function setupChangelogSections")\n    && !sharedStartupLifecycle.includes("function syncLayoutCenter")\n    && !sharedLayoutCenter.includes("const originalApplyFilters = applyFilters"),'''
assert ownership.count(old_guard) == 1
ownership = ownership.replace(old_guard, new_guard)
old_guard_message = "global interaction bindings, and startup lifecycle must not absorb later ownership domains."
new_guard_message = "global interaction bindings, startup lifecycle, and layout centering must not absorb later ownership domains."
assert ownership.count(old_guard_message) == 1
ownership = ownership.replace(old_guard_message, new_guard_message)
ownership_path.write_text(ownership, encoding="utf-8")
