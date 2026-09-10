from __future__ import annotations

"""Discover, backfill, and refresh official non-playoff MFL competitions."""

import sqlite3
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any
from urllib.parse import urlencode

from scripts.database import competition_storage as storage

PLAYMFL_API_BASE_URL = "https://z519wdyajg.execute-api.us-east-1.amazonaws.com/prod"
CURRENT_COMPETITIONS_URL = f"{PLAYMFL_API_BASE_URL}/competitions?upcoming=true"
SEASON_HISTORY_URL = f"{PLAYMFL_API_BASE_URL}/competitions/seasonHistory"
COMPETITION_DETAIL_URL = f"{PLAYMFL_API_BASE_URL}/competitions/{{competition_id}}"
DETAIL_WORKERS = 8

RequestJson = Callable[[str, str, Any], Any]
Log = Callable[[str], None]


def league_capacity(division: Any) -> int | None:
    try:
        resolved = int(division)
    except (TypeError, ValueError):
        return None
    return 1 << (resolved - 1) if 1 <= resolved <= 10 else None


def _competition_id(value: Any) -> int | None:
    try:
        return None if value in (None, "") else int(value)
    except (TypeError, ValueError):
        return None


def _season_id(competition: Any) -> int | None:
    if not isinstance(competition, dict):
        return None
    season = competition.get("season")
    if isinstance(season, dict):
        resolved = _competition_id(season.get("id"))
        if resolved is not None:
            return resolved
    return _competition_id(competition.get("seasonId"))


def _is_playoff_summary(competition: dict[str, Any]) -> bool:
    code = str(competition.get("code") or "").strip().upper()
    name = str(competition.get("name") or "").strip().lower()
    return code.startswith(storage.PLAYOFF_CODE_PREFIX) or "playoff" in name


def _candidate(
    competition: dict[str, Any],
    root: dict[str, Any] | None = None,
) -> dict[str, Any] | None:
    competition_id = _competition_id(competition.get("id"))
    if competition_id is None or _is_playoff_summary(competition):
        return None
    root = root or {}
    winner = competition.get("winner")
    return {
        "id": competition_id,
        "root_competition_id": _competition_id(root.get("id")),
        "primary_color": str(competition.get("primaryColor") or "").strip(),
        "has_winner": isinstance(winner, dict) and bool(winner),
        "type": str(competition.get("type") or "").strip().upper(),
    }


def _contiguous_generations(candidates: list[dict[str, Any]]) -> list[list[dict[str, Any]]]:
    """Split one league root into recreated generations using its contiguous ID runs."""
    ordered = sorted(candidates, key=lambda item: item["id"])
    generations: list[list[dict[str, Any]]] = []
    for candidate in ordered:
        if not generations or candidate["id"] != generations[-1][-1]["id"] + 1:
            generations.append([candidate])
        else:
            generations[-1].append(candidate)
    return generations


def select_root_competitions(root: Any) -> list[dict[str, Any]]:
    """Resolve obsolete recreated league generations using winner-first maximum rules."""
    if not isinstance(root, dict):
        return []
    candidates = [
        candidate
        for competition in root.get("competitions", [])
        if isinstance(competition, dict)
        for candidate in [_candidate(competition, root)]
        if candidate is not None
    ]
    if not candidates:
        return []

    capacity = league_capacity(root.get("division"))
    league_candidates = [item for item in candidates if item["type"] == "LEAGUE"]
    if capacity is None or not league_candidates:
        return sorted(candidates, key=lambda item: item["id"])

    generations = _contiguous_generations(league_candidates)
    winner_generations = [
        generation
        for generation in generations
        if any(item["has_winner"] for item in generation)
    ]
    root_name = str(root.get("name") or root.get("id") or "unknown root")

    if len(winner_generations) > 1:
        raise RuntimeError(
            f"{root_name} has winner-bearing competitions across multiple recreated generations"
        )

    selected_generation = winner_generations[0] if winner_generations else generations[-1]
    winner_count = sum(item["has_winner"] for item in selected_generation)
    if winner_count > capacity:
        raise RuntimeError(
            f"{root_name} has {winner_count} winner-bearing league competitions, "
            f"above the expected maximum of {capacity}"
        )
    if len(selected_generation) > capacity:
        raise RuntimeError(
            f"{root_name} newest valid generation has {len(selected_generation)} league "
            f"competitions, above the expected maximum of {capacity}"
        )

    selected_by_id = {item["id"]: item for item in selected_generation}

    # A root is normally all-league or all-cup. Preserve any non-league entries rather
    # than silently dropping an unexpected official format from discovery.
    for item in candidates:
        if item["type"] != "LEAGUE":
            selected_by_id[item["id"]] = item
    return sorted(selected_by_id.values(), key=lambda item: item["id"])


def discover_season_candidates(payload: Any, season_id: int) -> list[dict[str, Any]]:
    if not isinstance(payload, dict):
        raise RuntimeError(f"Season {season_id} history response was not an object")
    response_season = _competition_id(payload.get("seasonId"))
    if response_season is not None and response_season != season_id:
        raise RuntimeError(
            f"Season history requested {season_id} but response reported {response_season}"
        )
    roots = payload.get("rootCompetitions")
    if not isinstance(roots, list):
        raise RuntimeError(f"Season {season_id} history response had no rootCompetitions list")

    by_id: dict[int, dict[str, Any]] = {}
    for root in roots:
        for candidate in select_root_competitions(root):
            by_id[candidate["id"]] = candidate
    return list(by_id.values())


def _competition_list(payload: Any) -> list[dict[str, Any]]:
    if isinstance(payload, list):
        return [item for item in payload if isinstance(item, dict)]
    if not isinstance(payload, dict):
        return []
    for key in ("competitions", "items", "results"):
        value = payload.get(key)
        if isinstance(value, list):
            return [item for item in value if isinstance(item, dict)]
    data = payload.get("data")
    return _competition_list(data) if isinstance(data, (dict, list)) else []


def current_season_id_from_index(payload: Any) -> int | None:
    """Resolve the newest raw MFL season ID without persisting index entries."""
    season_ids = [
        season_id
        for competition in _competition_list(payload)
        for season_id in [_season_id(competition)]
        if season_id is not None
    ]
    if isinstance(payload, dict):
        payload_season = _season_id(payload)
        if payload_season is not None:
            season_ids.append(payload_season)
    return max(season_ids) if season_ids else None


def current_candidates(payload: Any) -> list[dict[str, Any]]:
    """Return only LIVE current-index candidates worth a detail request."""
    by_id: dict[int, dict[str, Any]] = {}
    for competition in _competition_list(payload):
        if str(competition.get("status") or "").strip().upper() != "LIVE":
            continue
        # Avoid an unnecessary detail request when the index explicitly says non-XP.
        if competition.get("withXp") is False:
            continue
        candidate = _candidate(competition)
        if candidate is not None:
            root = competition.get("root")
            if isinstance(root, dict):
                candidate["root_competition_id"] = _competition_id(root.get("id"))
            by_id[candidate["id"]] = candidate
    return list(by_id.values())


def _fetch_details(
    candidates: list[dict[str, Any]],
    request_json: RequestJson,
    limiter: Any,
) -> list[tuple[dict[str, Any], Any]]:
    if not candidates:
        return []

    def fetch(candidate: dict[str, Any]) -> tuple[dict[str, Any], Any]:
        competition_id = candidate["id"]
        detail = request_json(
            COMPETITION_DETAIL_URL.format(competition_id=competition_id),
            f"Competition {competition_id}",
            limiter,
        )
        return candidate, detail

    results: list[tuple[dict[str, Any], Any]] = []
    with ThreadPoolExecutor(max_workers=min(DETAIL_WORKERS, len(candidates))) as executor:
        futures = [executor.submit(fetch, candidate) for candidate in candidates]
        for future in as_completed(futures):
            results.append(future.result())
    return results


def _persist_details(
    connection: sqlite3.Connection,
    details: list[tuple[dict[str, Any], Any]],
    log: Log,
) -> tuple[int, set[int]]:
    saved = 0
    seasons: set[int] = set()
    for candidate, detail in details:
        season_id = _season_id(detail)
        if season_id is not None:
            seasons.add(season_id)
        if storage.persist_competition_detail(
            connection,
            detail,
            root_competition_id=candidate.get("root_competition_id"),
            discovery_primary_color=candidate.get("primary_color", ""),
            log=log,
        ):
            saved += 1
    return saved, seasons


def _season_history(
    season_id: int,
    request_json: RequestJson,
    limiter: Any,
) -> Any:
    query = urlencode({"seasonId": season_id})
    return request_json(
        f"{SEASON_HISTORY_URL}?{query}",
        f"Competition season history {season_id}",
        limiter,
    )


def refresh_competitions(
    connection: sqlite3.Connection,
    previous_database_path: Path | None,
    request_json: RequestJson,
    limiter: Any,
    log: Log = print,
    *,
    fetch_live: bool = True,
    backfill_historical: bool = False,
) -> dict[str, int]:
    """Restore permanent history, optionally refresh LIVE data, and optionally backfill."""
    storage.create_schema(connection)
    restored = storage.restore_previous_history(connection, previous_database_path, log)

    current_payload: Any = None
    live_candidates: list[dict[str, Any]] = []
    live_saved = 0
    live_seasons: set[int] = set()

    # Both live refresh and historical backfill can use this one index request. Historical
    # mode uses it only to resolve the current season boundary when needed.
    if fetch_live or backfill_historical:
        current_payload = request_json(
            CURRENT_COMPETITIONS_URL,
            "Current competitions",
            limiter,
        )

    if fetch_live:
        live_candidates = current_candidates(current_payload)
        live_details = _fetch_details(live_candidates, request_json, limiter)
        live_saved, live_seasons = _persist_details(connection, live_details, log)

    historical_discovered = 0
    historical_requested = 0
    historical_saved = 0

    if backfill_historical:
        current_season_id = (
            max(live_seasons)
            if live_seasons
            else current_season_id_from_index(current_payload)
        )
        if current_season_id is None:
            current_season_id = storage.max_stored_season_id(connection)
        if current_season_id is None or current_season_id < storage.FIRST_SEASON_ID:
            raise RuntimeError("Could not determine the current MFL season for competition backfill")

        already_stored = storage.stored_competition_ids(connection)
        for season_id in range(storage.FIRST_SEASON_ID, current_season_id + 1):
            payload = _season_history(season_id, request_json, limiter)
            candidates = discover_season_candidates(payload, season_id)
            historical_discovered += len(candidates)
            missing = [
                candidate
                for candidate in candidates
                if candidate["id"] not in already_stored
            ]
            if not missing:
                continue
            historical_requested += len(missing)
            details = _fetch_details(missing, request_json, limiter)
            saved, _ = _persist_details(connection, details, log)
            historical_saved += saved
            already_stored.update(
                candidate["id"]
                for candidate, detail in details
                if storage.is_eligible_detail(detail)
            )
            log(
                f"Competition season {season_id}: discovered {len(candidates)}, "
                f"requested {len(missing)}, saved {saved}"
            )

    total = int(connection.execute("SELECT COUNT(*) FROM competitions").fetchone()[0])
    stats = {
        "restored": restored,
        "live_discovered": len(live_candidates),
        "live_saved": live_saved,
        "historical_discovered": historical_discovered,
        "historical_requested": historical_requested,
        "historical_saved": historical_saved,
        "total": total,
    }
    log(
        "Competition data: "
        f"restored {restored}, live {live_saved}/{len(live_candidates)}, "
        f"historical detail requests {historical_requested}, total stored {total}"
    )
    return stats
