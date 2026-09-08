from __future__ import annotations

import sqlite3
import tempfile
import unittest
from pathlib import Path

from scripts.database import prepare_runtime_database as runtime_db
from scripts.database import runtime_query_plans


def create_query_plan_database(path: Path, player_count: int = 6000) -> None:
    connection = sqlite3.connect(path)
    try:
        connection.execute(
            """
            CREATE TABLE wallets (
                wallet_address TEXT PRIMARY KEY,
                name TEXT NOT NULL DEFAULT ''
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE players (
                player_id INTEGER PRIMARY KEY,
                wallet_address TEXT NOT NULL,
                wallet_name TEXT NOT NULL DEFAULT '',
                name TEXT,
                positions TEXT,
                age INTEGER,
                retirement_years INTEGER,
                owned_since INTEGER,
                active_contract_club_id TEXT,
                active_contract_club_name TEXT,
                active_contract_club_division TEXT,
                overall INTEGER,
                goalkeeping INTEGER,
                player_seasons INTEGER
            )
            """
        )
        wallets = {
            "agent-a": ("0xagent-a", "Agent A"),
            "agent-b": ("0xagent-b", "Agent B"),
            "mfl": (runtime_db.MFL_WALLET_ADDRESS, "MFL"),
        }
        connection.executemany(
            "INSERT INTO wallets(wallet_address, name) VALUES (?, ?)",
            wallets.values(),
        )
        positions = runtime_query_plans.POSITION_ORDER
        rows = []
        for player_id in range(1, player_count + 1):
            if player_id % 10 == 0:
                wallet_address, wallet_name = wallets["agent-a"]
            elif player_id % 10 == 1:
                wallet_address, wallet_name = wallets["mfl"]
            else:
                wallet_address, wallet_name = wallets["agent-b"]
            club_index = player_id % 10
            club_suffix = chr(ord("a") + club_index)
            position = positions[player_id % len(positions)]
            rows.append(
                (
                    player_id,
                    wallet_address,
                    wallet_name,
                    f"Player {player_id}",
                    position,
                    18 + (player_id % 18),
                    0 if player_id % 13 == 0 else 4,
                    1_760_000_000 + player_id,
                    f"club-{club_suffix}",
                    f"Club {club_suffix.upper()}",
                    str(1 + (club_index % 5)),
                    50 + (player_id % 50),
                    45 + (player_id % 50),
                    1 + (player_id % 5),
                )
            )
        connection.executemany(
            """
            INSERT INTO players(
                player_id,
                wallet_address,
                wallet_name,
                name,
                positions,
                age,
                retirement_years,
                owned_since,
                active_contract_club_id,
                active_contract_club_name,
                active_contract_club_division,
                overall,
                goalkeeping,
                player_seasons
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            rows,
        )
        connection.commit()
    finally:
        connection.close()


class RuntimeQueryPlanTests(unittest.TestCase):
    def prepare_database(self, directory: str) -> Path:
        database_path = Path(directory) / "mfl_database.db"
        create_query_plan_database(database_path)
        runtime_db.prepare_runtime_database(database_path)
        return database_path

    def test_representative_table_queries_stay_within_planner_budgets(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            database_path = self.prepare_database(directory)
            with sqlite3.connect(database_path) as connection:
                metrics = runtime_query_plans.assert_representative_table_query_budgets(
                    connection
                )

            self.assertEqual(
                set(metrics),
                {
                    budget.name
                    for budget in runtime_query_plans.REPRESENTATIVE_TABLE_QUERY_BUDGETS
                },
            )
            self.assertEqual(metrics["club_attributes"].temp_btrees, 1)
            self.assertEqual(
                metrics["database_attributes_first_page"].details,
                metrics["database_attributes_deep_page"].details,
            )

    def test_budget_detects_loss_of_hot_database_sort_index(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            database_path = self.prepare_database(directory)
            budget = next(
                budget
                for budget in runtime_query_plans.REPRESENTATIVE_TABLE_QUERY_BUDGETS
                if budget.name == "database_attributes_first_page"
            )
            with sqlite3.connect(database_path) as connection:
                connection.execute("DROP INDEX players_overall_index")
                connection.execute("ANALYZE")
                with self.assertRaisesRegex(
                    AssertionError,
                    "players_overall_index|full players scans|temporary B-trees",
                ):
                    runtime_query_plans.assert_query_plan_budget(connection, budget)


if __name__ == "__main__":
    unittest.main()
