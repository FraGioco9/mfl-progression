from pathlib import Path

root = Path("site")
shared_path = root / "modules/core-sources/shared.js"
source = shared_path.read_text(encoding="utf-8").replace("\r\n", "\n").replace("\r", "\n")
assert source.startswith("function mflChunkFromPublicData(chunk) {"), "Shared head moved before dead-helper cleanup."
assert source.count("function mflChunkFromPublicData(chunk) {") == 1
assert source.count("function progressionDataColumns(manifest) {") == 1
live_start = "function clubRouteTargetFromPath() {"
remainder = source[source.index(live_start):]
assert remainder.startswith(live_start)
assert "mflChunkFromPublicData" not in remainder
assert "progressionDataColumns" not in remainder
shared_path.write_text(remainder, encoding="utf-8")

ownership_path = root / "validate-core-source-ownership.mjs"
ownership = ownership_path.read_text(encoding="utf-8")
old = '''invariant(
  sharedRemaining.startsWith("function mflChunkFromPublicData(chunk) {")
    && !sharedRemaining.includes("function csvEscape"),
  "Remaining Shared behavior must begin at the incremental public-data routing boundary and keep unused csvEscape retired.",
);'''
new = '''invariant(
  sharedRemaining.startsWith("function clubRouteTargetFromPath() {")
    && !sharedRemaining.includes("function csvEscape")
    && !sharedRemaining.includes("function mflChunkFromPublicData")
    && !sharedRemaining.includes("function progressionDataColumns"),
  "Remaining Shared behavior must begin at the live incremental-routing boundary and keep unused serialization/data helpers retired.",
);'''
assert ownership.count(old) == 1
ownership_path.write_text(ownership.replace(old, new), encoding="utf-8")
