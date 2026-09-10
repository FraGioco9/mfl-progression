from __future__ import annotations

import sqlite3
import tempfile
import unittest
from pathlib import Path

from scripts.database import competition_storage as storage
from scripts.database import competitions


class CompetitionGenerationSelectionTests(unittest.TestCase):
    def test_diamond_prefers_winner_over_recreated_ids(self) -> None:
        root = {
            "id": 488,
            "name": "Diamond League",
            "division": 1,
            "competitions": [
                {"id": 15568, "type": "LEAGUE", "code": "DMND"},
                {"id": 16162, "type": "LEAGUE", "code": "DMND"},
                {
                    "id": 16757,
                    "type": "LEAGUE",
                    "code": "DMND",
                    "winner": {"club": {"id": 5628}},
                },
            ],
        }
        selected = competitions.select_root_competitions(root)
        self.assertEqual([item["id"] for item in selected], [16757])

    def test_winner_selects_its_whole_recreated_generation(self) -> None:
        root = {
            "id": 487,
            "name": "Platinum Division",
            "division": 2,
            "competitions": [
                {"id": 10, "type": "LEAGUE", "code": "PLAT"},
                {"id": 11, "type": "LEAGUE", "code": "PLAT"},
                {"id": 20, "type": "LEAGUE", "code": "PLAT"},
                {"id": 21, "type": "LEAGUE", "code": "PLAT", "winner": {"club": {"id": 1}}},
            ],
        }
        selected = competitions.select_root_competitions(root)
        self.assertEqual([item["id"] for item in selected], [20, 21])

    def test_no_winner_uses_newest_contiguous_generation_not_full_capacity(self) -> None:
        root = {
            "id": 486,
            "name": "Gold Division",
            "division": 3,
            "competitions": [
                {"id": 1, "type": "LEAGUE", "code": "GOLD"},
                {"id": 2, "type": "LEAGUE", "code": "GOLD"},
                {"id": 3, "type": "LEAGUE", "code": "GOLD"},
                {"id": 4, "type": "LEAGUE", "code": "GOLD"},
                {"id": 10, "type": "LEAGUE", "code": "GOLD"},
                {"id": 11, "type": "LEAGUE", "code": "GOLD"},
                {"id": 12, "type": "LEAGUE", "code": "GOLD"},
            ],
        }
        selected = competitions.select_root_competitions(root)
        self.assertEqual([item["id"] for item in selected], [10, 11, 12])

    def test_unique_named_league_slots_can_span_noncontiguous_ids(self) -> None:
        root = {
            "id": 248,
            "name": "Flint Division",
            "division": 10,
            "competitions": [
                {"id": 5433, "name": "Flint – League  1", "type": "LEAGUE", "code": "FLT", "winner": {"club": {"id": 1}}},
                {"id": 5434, "name": "Flint – League  2", "type": "LEAGUE", "code": "FLT", "winner": {"club": {"id": 2}}},
                {"id": 5669, "name": "Flint – League  46", "type": "LEAGUE", "code": "FLT", "winner": {"club": {"id": 46}}},
            ],
        }
        selected = competitions.select_root_competitions(root)
        self.assertEqual([item["id"] for item in selected], [5433, 5434, 5669])

    def test_duplicate_named_slots_across_multiple_generations_fail_instead_of_guessing(self) -> None:
        root = {
            "id": 488,
            "name": "Diamond League",
            "division": 1,
            "competitions": [
                {"id": 1, "name": "Diamond – League 1", "type": "LEAGUE", "code": "DMND", "winner": {"club": {"id": 1}}},
                {"id": 10, "name": "Diamond – League 1", "type": "LEAGUE", "code": "DMND", "winner": {"club": {"id": 2}}},
            ],
        }
        with self.assertRaisesRegex(RuntimeError, "multiple recreated generations"):
            competitions.select_root_competitions(root)

    def test_winners_across_multiple_generations_fail_instead_of_guessing(self) -> None:
        root = {
            "id": 488,
            "name": "Diamond League",
            "division": 1,
            "competitions": [
                {"id": 1, "type": "LEAGUE", "code": "DMND", "winner": {"club": {"id": 1}}},
                {"id": 10, "type": "LEAGUE", "code": "DMND", "winner": {"club": {"id": 2}}},
            ],
        }
        with self.assertRaisesRegex(RuntimeError, "multiple recreated generations"):
            competitions.select_root_competitions(root)

    def test_generation_above_division_maximum_fails(self) -> None:
        root = {
            "id": 488,
            "name": "Diamond League",
            "division": 1,
            "competitions": [
                {"id": 10, "type": "LEAGUE", "code": "DMND"},
                {"id": 11, "type": "LEAGUE", "code": "DMND"},
            ],
        }
        with self.assertRaisesRegex(RuntimeError, "above the expected maximum"):
            competitions.select_root_competitions(root)

    def test_playoffs_are_excluded_from_discovery(self) -> None:
        root = {
            "id": 900,
            "name": "Playoff",
            "competitions": [
                {"id": 1, "type": "CUP", "code": "P:DMND", "name": "Diamond Playoff"},
                {"id": 2, "type": "CUP", "code": "TITAN", "name": "Titans Cup"},
            ],
        }
        selected = competitions.select_root_competitions(root)
        self.assertEqual([item["id"] for item in selected], [2])


class CompetitionStorageTests(unittest.TestCase):
    def setUp(self) -> None:
        self.connection = sqlite3.connect(":memory:")
        storage.create_schema(self.connection)

    def tearDown(self) -> None:
        self.connection.close()

    def detail(self, competition_id: int = 100, match_id: int = 500) -> dict:
        return {
            "id": competition_id,
            "root": {"id": 488},
            "season": {"id": 25},
            "type": "LEAGUE",
            "subType": "LEAGUE",
            "name": "Diamond League",
            "code": "DMND",
            "primaryColor": "#0081B8",
            "status": "LIVE",
            "withXp": True,
            "prizePool": "10000 $MFL",
            "startingDate": "2026-08-01T00:00:00Z",
            "rewards": [{"rank": 1, "reward": "1000 $MFL"}],
            "schedule": {
                "stages": [
                    {
                        "id": "stage-1",
                        "type": "GROUPS",
                        "name": "League",
                        "groups": [
                            {
                                "id": "group-a",
                                "name": "A",
                                "standings": [
                                    {
                                        "club": {"id": 42},
                                        "wins": 2,
                                        "draws": 1,
                                        "losses": 0,
                                        "goals": 7,
                                        "goalsAgainst": 3,
                                        "points": 7,
                                    }
                                ],
                                "rounds": [
                                    {
                                        "id": "round-1",
                                        "name": "Round 1",
                                        "matches": [
                                            {
                                                "matchId": match_id,
                                                "startDate": "2026-08-02T20:00:00Z",
                                                "status": "PLANNED",
                                                "homeSquad": {"club": {"id": 42}},
                                                "awaySquad": {"club": {"id": 43}},
                                            }
                                        ],
                                    }
                                ],
                            }
                        ],
                    }
                ]
            },
        }

    def test_only_official_non_playoff_details_are_eligible(self) -> None:
        detail = self.detail()
        self.assertTrue(storage.is_eligible_detail(detail))
        detail["withXp"] = False
        self.assertFalse(storage.is_eligible_detail(detail))
        detail["withXp"] = True
        detail["code"] = "P:DMND"
        self.assertFalse(storage.is_eligible_detail(detail))
        detail["code"] = "DMND"
        detail["name"] = "Diamond Playoff"
        self.assertFalse(storage.is_eligible_detail(detail))

    def test_child_tables_reference_competitions_with_cascade_delete(self) -> None:
        self.assertEqual(self.connection.execute("PRAGMA foreign_keys").fetchone()[0], 1)
        child_tables = (
            "competition_stages",
            "competition_groups",
            "competition_rounds",
            "competition_standings",
            "competition_rewards",
            "competition_matches",
        )
        for table in child_tables:
            foreign_keys = self.connection.execute(
                f'PRAGMA foreign_key_list("{table}")'
            ).fetchall()
            parent_links = [
                row for row in foreign_keys
                if row[2] == "competitions"
                and row[3] == "competition_id"
                and row[4] == "competition_id"
                and str(row[6]).upper() == "CASCADE"
            ]
            self.assertEqual(len(parent_links), 1, table)

        self.assertTrue(storage.persist_competition_detail(self.connection, self.detail()))
        self.connection.execute("DELETE FROM competitions WHERE competition_id = 100")
        self.connection.commit()
        for table in child_tables:
            count = self.connection.execute(
                f'SELECT COUNT(*) FROM "{table}" WHERE competition_id = 100'
            ).fetchone()[0]
            self.assertEqual(count, 0, table)

    def test_detail_persists_normalized_competition_standings_and_match(self) -> None:
        self.assertTrue(storage.persist_competition_detail(self.connection, self.detail()))
        competition = self.connection.execute(
            "SELECT season_id, code, with_xp, root_competition_id FROM competitions WHERE competition_id=100"
        ).fetchone()
        self.assertEqual(competition, (25, "DMND", 1, 488))
        standing = self.connection.execute(
            "SELECT club_id, position, wins, draws, losses, goals, goals_against, points FROM competition_standings"
        ).fetchone()
        self.assertEqual(standing, (42, 1, 2, 1, 0, 7, 3, 7.0))
        match = self.connection.execute(
            "SELECT match_id, home_club_id, away_club_id, status FROM competition_matches"
        ).fetchone()
        self.assertEqual(match, (500, 42, 43, "PLANNED"))

    def test_schedule_refresh_reschedules_removes_planned_and_preserves_completed(self) -> None:
        first = self.detail(match_id=500)
        storage.persist_competition_detail(self.connection, first, log=lambda _message: None)
        self.connection.execute(
            """
            INSERT INTO competition_matches (
              match_id, competition_id, stage_order, group_order, round_order,
              start_date, status
            ) VALUES (501, 100, 0, 0, 0, '2026-08-03T20:00:00Z', 'PLANNED')
            """
        )
        self.connection.execute(
            """
            INSERT INTO competition_matches (
              match_id, competition_id, stage_order, group_order, round_order,
              start_date, status
            ) VALUES (502, 100, 0, 0, 0, '2026-08-01T20:00:00Z', 'ENDED')
            """
        )
        self.connection.commit()

        second = self.detail(match_id=500)
        second["schedule"]["stages"][0]["groups"][0]["rounds"][0]["matches"][0]["startDate"] = (
            "2026-08-04T21:00:00Z"
        )
        logs: list[str] = []
        storage.persist_competition_detail(self.connection, second, log=logs.append)

        rows = self.connection.execute(
            "SELECT match_id, start_date, status FROM competition_matches ORDER BY match_id"
        ).fetchall()
        self.assertEqual(
            rows,
            [
                (500, "2026-08-04T21:00:00Z", "PLANNED"),
                (502, "2026-08-01T20:00:00Z", "ENDED"),
            ],
        )
        self.assertTrue(any("preserving it for history" in message for message in logs))

    def test_missing_schedule_does_not_erase_existing_matches(self) -> None:
        storage.persist_competition_detail(self.connection, self.detail(), log=lambda _message: None)
        refresh = self.detail()
        del refresh["schedule"]
        storage.persist_competition_detail(self.connection, refresh, log=lambda _message: None)
        count = self.connection.execute("SELECT COUNT(*) FROM competition_matches").fetchone()[0]
        self.assertEqual(count, 1)

    def test_previous_database_history_is_restored(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            previous_path = Path(directory) / "previous.db"
            previous = sqlite3.connect(previous_path)
            storage.create_schema(previous)
            storage.persist_competition_detail(previous, self.detail(), log=lambda _message: None)
            previous.close()

            fresh = sqlite3.connect(":memory:")
            try:
                restored = storage.restore_previous_history(
                    fresh,
                    previous_path,
                    log=lambda _message: None,
                )
                self.assertEqual(restored, 1)
                self.assertEqual(storage.stored_competition_ids(fresh), {100})
                self.assertEqual(
                    fresh.execute("SELECT COUNT(*) FROM competition_matches").fetchone()[0],
                    1,
                )
            finally:
                fresh.close()


class CompetitionProgressLoggingTests(unittest.TestCase):
    def test_raw_season_id_is_not_used_as_display_season(self) -> None:
        self.assertEqual(competitions.season_number_from_id(17), 7)
        self.assertEqual(competitions.season_label(17), "Season 7 (seasonId 17)")

    def test_detail_fetch_reports_bounded_progress(self) -> None:
        candidates = [{"id": competition_id} for competition_id in range(1, 13)]
        logs: list[str] = []

        details = competitions._fetch_details(
            candidates,
            lambda _url, label, _limiter: {"id": int(label.rsplit(" ", 1)[1])},
            None,
            log=logs.append,
            progress_label="Competition Season 1 detail (seasonId 11)",
        )

        self.assertEqual(len(details), 12)
        self.assertEqual(
            logs,
            [
                "Competition Season 1 detail (seasonId 11): 1/12",
                "Competition Season 1 detail (seasonId 11): 10/12",
                "Competition Season 1 detail (seasonId 11): 12/12",
            ],
        )


if __name__ == "__main__":
    unittest.main()
