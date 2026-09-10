from __future__ import annotations

import re
from pathlib import Path


rebuild_path = Path("scripts/database/rebuild_database.py")
rebuild = rebuild_path.read_text(encoding="utf-8")
pattern = re.compile(
    r"        flow_started = time\.perf_counter\(\)\n"
    r"        if fetch_player_seasons:.*?"
    r"        run_flow_rebuild\.timed\(\n"
    r"            \"Persist mint ages\"",
    re.DOTALL,
)
replacement = '''        flow_started = time.perf_counter()
        if fetch_player_seasons:
            season_stats = run_flow_rebuild.refresh_player_seasons(connection)
            updated_seasons = (
                season_stats["recovered_from_flow"]
                + season_stats["recovered_from_mfl_history"]
            )
            flow_seconds = time.perf_counter() - flow_started
            run_flow_rebuild.log("")
            run_flow_rebuild.log("=== Flow seasons ===")
            run_flow_rebuild.log(
                f"Flow seasons updated: {updated_seasons} "
                f"in {run_flow_rebuild.format_duration(flow_seconds)}"
            )
        else:
            season_stats = reuse_resolved_player_seasons(connection)
            updated_seasons = 0
            flow_seconds = time.perf_counter() - flow_started
            run_flow_rebuild.log("")
            run_flow_rebuild.log("=== Flow seasons ===")
            run_flow_rebuild.log(
                f"Flow season fetch disabled: {season_stats['already_known']} already resolved, "
                f"0 unresolved in {run_flow_rebuild.format_duration(flow_seconds)}"
            )
        run_flow_rebuild.timed(
            "Persist mint ages"'''
rebuild, count = pattern.subn(lambda _match: replacement, rebuild, count=1)
if count != 1:
    raise RuntimeError(f"Expected one generated Flow-season block, got {count}")
rebuild_path.write_text(rebuild, encoding="utf-8")

clubs_path = Path("scripts/database/clubs.py")
clubs = clubs_path.read_text(encoding="utf-8")
old_sort = "        key=lambda value: int(value) if value.isdigit() else value,\n"
new_sort = "        key=lambda value: (0, int(value)) if value.isdigit() else (1, value),\n"
if old_sort not in clubs:
    raise RuntimeError("Expected generated missing-club sort key")
clubs_path.write_text(clubs.replace(old_sort, new_sort, 1), encoding="utf-8")

print("Issue #864 migration fixes applied")
