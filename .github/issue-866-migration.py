from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file_path = Path(path)
    text = file_path.read_text(encoding="utf-8")
    if text.count(old) != 1:
        raise RuntimeError(f"Expected exactly one match in {path}: {old[:80]!r}; found {text.count(old)}")
    file_path.write_text(text.replace(old, new, 1), encoding="utf-8")


replace_once(
    "scripts/database/competitions.py",
    "import sqlite3\n",
    "import re\nimport sqlite3\n",
)
replace_once(
    "scripts/database/competitions.py",
    '        "primary_color": str(competition.get("primaryColor") or "").strip(),\n        "has_winner": isinstance(winner, dict) and bool(winner),\n',
    '        "primary_color": str(competition.get("primaryColor") or "").strip(),\n        "name": str(competition.get("name") or "").strip(),\n        "has_winner": isinstance(winner, dict) and bool(winner),\n',
)
replace_once(
    "scripts/database/competitions.py",
    "def select_root_competitions(root: Any) -> list[dict[str, Any]]:\n",
    '''_LEAGUE_ORDINAL_PATTERN = re.compile(r"\\bLeague\\s+(\\d+)\\s*$", re.IGNORECASE)\n\n\ndef _league_ordinal(candidate: dict[str, Any]) -> int | None:\n    match = _LEAGUE_ORDINAL_PATTERN.search(str(candidate.get("name") or "").strip())\n    if match is None:\n        return None\n    try:\n        ordinal = int(match.group(1))\n    except (TypeError, ValueError):\n        return None\n    return ordinal if ordinal > 0 else None\n\n\ndef _has_unique_in_range_league_ordinals(\n    candidates: list[dict[str, Any]],\n    capacity: int,\n) -> bool:\n    """Recognize one league generation even when API competition IDs contain gaps."""\n    ordinals = [_league_ordinal(candidate) for candidate in candidates]\n    return (\n        bool(ordinals)\n        and all(ordinal is not None for ordinal in ordinals)\n        and len(set(ordinals)) == len(ordinals)\n        and min(ordinals) >= 1\n        and max(ordinals) <= capacity\n    )\n\n\ndef season_number_from_id(season_id: int) -> int:\n    """Convert raw MFL API season IDs (11+) to displayed seasons (1+)."""\n    return season_id - storage.FIRST_SEASON_ID + 1\n\n\ndef season_label(season_id: int) -> str:\n    return f"Season {season_number_from_id(season_id)} (seasonId {season_id})"\n\n\ndef select_root_competitions(root: Any) -> list[dict[str, Any]]:\n''',
)
replace_once(
    "scripts/database/competitions.py",
    '''    generations = _contiguous_generations(league_candidates)\n    winner_generations = [\n        generation\n        for generation in generations\n        if any(item["has_winner"] for item in generation)\n    ]\n    root_name = str(root.get("name") or root.get("id") or "unknown root")\n\n    if len(winner_generations) > 1:\n        raise RuntimeError(\n            f"{root_name} has winner-bearing competitions across multiple recreated generations"\n        )\n\n    selected_generation = winner_generations[0] if winner_generations else generations[-1]\n''',
    '''    root_name = str(root.get("name") or root.get("id") or "unknown root")\n    if _has_unique_in_range_league_ordinals(league_candidates, capacity):\n        # MFL can allocate a later competition ID to a league slot in the same season.\n        # Unique League 1..N names prove these entries are one logical generation even\n        # when their IDs are not contiguous (Season 7 Flint has League 46 at a later ID).\n        selected_generation = league_candidates\n    else:\n        generations = _contiguous_generations(league_candidates)\n        winner_generations = [\n            generation\n            for generation in generations\n            if any(item["has_winner"] for item in generation)\n        ]\n        if len(winner_generations) > 1:\n            raise RuntimeError(\n                f"{root_name} has winner-bearing competitions across multiple recreated generations"\n            )\n        selected_generation = winner_generations[0] if winner_generations else generations[-1]\n''',
)
replace_once(
    "scripts/database/competitions.py",
    '        raise RuntimeError(f"Season {season_id} history response was not an object")\n',
    '        raise RuntimeError(f"{season_label(season_id)} history response was not an object")\n',
)
replace_once(
    "scripts/database/competitions.py",
    '''        raise RuntimeError(\n            f"Season history requested {season_id} but response reported {response_season}"\n        )\n''',
    '''        raise RuntimeError(\n            f"{season_label(season_id)} history response reported seasonId {response_season}"\n        )\n''',
)
replace_once(
    "scripts/database/competitions.py",
    '        raise RuntimeError(f"Season {season_id} history response had no rootCompetitions list")\n',
    '        raise RuntimeError(f"{season_label(season_id)} history response had no rootCompetitions list")\n',
)
replace_once(
    "scripts/database/competitions.py",
    '        f"Competition season history {season_id}",\n',
    '        f"Competition {season_label(season_id)} history",\n',
)
replace_once(
    "scripts/database/competitions.py",
    '''        log(\n            "Competition historical backfill: "\n            f"{total_seasons} seasons from seasonId {storage.FIRST_SEASON_ID} "\n            f"to {current_season_id}; already stored {len(already_stored)} competitions"\n        )\n''',
    '''        log(\n            "Competition historical backfill: "\n            f"{total_seasons} seasons from {season_label(storage.FIRST_SEASON_ID)} "\n            f"to {season_label(current_season_id)}; "\n            f"already stored {len(already_stored)} competitions"\n        )\n''',
)
replace_once(
    "scripts/database/competitions.py",
    '''            progress_prefix = (\n                f"Competition historical season {season_index}/{total_seasons} "\n                f"(seasonId {season_id})"\n            )\n''',
    '''            display_season = season_number_from_id(season_id)\n            progress_prefix = (\n                f"Competition historical Season {display_season}/{total_seasons} "\n                f"(seasonId {season_id})"\n            )\n''',
)
replace_once(
    "scripts/database/competitions.py",
    '                progress_label=f"Competition season {season_id} detail",\n',
    '                progress_label=f"Competition Season {display_season} detail (seasonId {season_id})",\n',
)

replace_once(
    "tests/test_competition_data.py",
    '''    def test_winners_across_multiple_generations_fail_instead_of_guessing(self) -> None:\n''',
    '''    def test_unique_named_league_slots_can_span_noncontiguous_ids(self) -> None:\n        root = {\n            "id": 248,\n            "name": "Flint Division",\n            "division": 10,\n            "competitions": [\n                {"id": 5433, "name": "Flint – League  1", "type": "LEAGUE", "code": "FLT", "winner": {"club": {"id": 1}}},\n                {"id": 5434, "name": "Flint – League  2", "type": "LEAGUE", "code": "FLT", "winner": {"club": {"id": 2}}},\n                {"id": 5669, "name": "Flint – League  46", "type": "LEAGUE", "code": "FLT", "winner": {"club": {"id": 46}}},\n            ],\n        }\n        selected = competitions.select_root_competitions(root)\n        self.assertEqual([item["id"] for item in selected], [5433, 5434, 5669])\n\n    def test_duplicate_named_slots_across_multiple_generations_fail_instead_of_guessing(self) -> None:\n        root = {\n            "id": 488,\n            "name": "Diamond League",\n            "division": 1,\n            "competitions": [\n                {"id": 1, "name": "Diamond – League 1", "type": "LEAGUE", "code": "DMND", "winner": {"club": {"id": 1}}},\n                {"id": 10, "name": "Diamond – League 1", "type": "LEAGUE", "code": "DMND", "winner": {"club": {"id": 2}}},\n            ],\n        }\n        with self.assertRaisesRegex(RuntimeError, "multiple recreated generations"):\n            competitions.select_root_competitions(root)\n\n    def test_winners_across_multiple_generations_fail_instead_of_guessing(self) -> None:\n''',
)
replace_once(
    "tests/test_competition_data.py",
    '            progress_label="Competition season 11 detail",\n',
    '            progress_label="Competition Season 1 detail (seasonId 11)",\n',
)
replace_once(
    "tests/test_competition_data.py",
    '''                "Competition season 11 detail: 1/12",\n                "Competition season 11 detail: 10/12",\n                "Competition season 11 detail: 12/12",\n''',
    '''                "Competition Season 1 detail (seasonId 11): 1/12",\n                "Competition Season 1 detail (seasonId 11): 10/12",\n                "Competition Season 1 detail (seasonId 11): 12/12",\n''',
)
replace_once(
    "tests/test_competition_data.py",
    '''class CompetitionProgressLoggingTests(unittest.TestCase):\n''',
    '''class CompetitionProgressLoggingTests(unittest.TestCase):\n    def test_raw_season_id_is_not_used_as_display_season(self) -> None:\n        self.assertEqual(competitions.season_number_from_id(17), 7)\n        self.assertEqual(competitions.season_label(17), "Season 7 (seasonId 17)")\n\n''',
)

print("Issue #866 migration applied")
