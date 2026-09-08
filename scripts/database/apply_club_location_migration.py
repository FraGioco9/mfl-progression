from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def replace_once(path: Path, old: str, new: str) -> None:
    text = path.read_text(encoding="utf-8")
    if old not in text:
        raise RuntimeError(f"Expected source block not found in {path}")
    path.write_text(text.replace(old, new, 1), encoding="utf-8")


clubs = ROOT / "scripts/database/clubs.py"
replace_once(
    clubs,
    '''    name = str(_first_value(\n        club.get("name"),\n        entry.get("clubName"),\n        entry.get("name"),\n    ) or "").strip()\n    division = _first_value(\n''',
    '''    name = str(_first_value(\n        club.get("name"),\n        entry.get("clubName"),\n        entry.get("name"),\n    ) or "").strip()\n    location = _mapping(_first_value(club.get("location"), entry.get("location")))\n    city = str(_first_value(\n        club.get("city"),\n        entry.get("city"),\n        location.get("city"),\n    ) or "").strip()\n    country = str(_first_value(\n        club.get("country"),\n        club.get("nation"),\n        entry.get("country"),\n        entry.get("nation"),\n        location.get("country"),\n        location.get("nation"),\n    ) or "").strip()\n    division = _first_value(\n''',
)
replace_once(
    clubs,
    '''        "name": name,\n        "division": "" if division is None else str(division).strip(),\n''',
    '''        "name": name,\n        "city": city,\n        "country": country,\n        "division": "" if division is None else str(division).strip(),\n''',
)
replace_once(
    clubs,
    '''            name TEXT NOT NULL DEFAULT '',\n            division TEXT NOT NULL DEFAULT '',\n''',
    '''            name TEXT NOT NULL DEFAULT '',\n            city TEXT NOT NULL DEFAULT '',\n            country TEXT NOT NULL DEFAULT '',\n            division TEXT NOT NULL DEFAULT '',\n''',
)
replace_once(
    clubs,
    '''            name,\n            division,\n            owner_wallet_address,\n''',
    '''            name,\n            city,\n            country,\n            division,\n            owner_wallet_address,\n''',
)
replace_once(
    clubs,
    ''') VALUES (?, ?, ?, ?, ?, ?, ?, ?)\n''',
    ''') VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)\n''',
)
replace_once(
    clubs,
    '''                club["name"],\n                club["division"],\n                club["owner_wallet_address"],\n''',
    '''                club["name"],\n                club["city"],\n                club["country"],\n                club["division"],\n                club["owner_wallet_address"],\n''',
)

runtime = ROOT / "scripts/database/prepare_runtime_database.py"
replace_once(
    runtime,
    '''          name TEXT NOT NULL,\n          normalized_name TEXT NOT NULL,\n          division INTEGER,\n''',
    '''          name TEXT NOT NULL,\n          normalized_name TEXT NOT NULL,\n          city TEXT NOT NULL DEFAULT '',\n          country TEXT NOT NULL DEFAULT '',\n          division INTEGER,\n''',
)
replace_once(
    runtime,
    '''    if "clubs" in table_names(connection):\n        connection.execute(\n            """\n            INSERT INTO runtime_clubs (\n              club_id,\n              name,\n              normalized_name,\n              division,\n''',
    '''    if "clubs" in table_names(connection):\n        club_columns = {str(row[1]) for row in connection.execute("PRAGMA table_info(clubs)")}\n        city_expression = "coalesce(city, '')" if "city" in club_columns else "''"\n        country_expression = "coalesce(country, '')" if "country" in club_columns else "''"\n        connection.execute(\n            f"""\n            INSERT INTO runtime_clubs (\n              club_id,\n              name,\n              normalized_name,\n              city,\n              country,\n              division,\n''',
)
replace_once(
    runtime,
    '''              club_id,\n              name,\n              normalize_search(name),\n              CAST(NULLIF(division, '') AS INTEGER),\n''',
    '''              club_id,\n              name,\n              normalize_search(name),\n              {city_expression},\n              {country_expression},\n              CAST(NULLIF(division, '') AS INTEGER),\n''',
)

tests = ROOT / "tests/test_club_leaderboard.py"
replace_once(
    tests,
    '''                    "name": "Regression FC",\n                    "division": 2,\n''',
    '''                    "name": "Regression FC",\n                    "city": "Paris",\n                    "country": "France",\n                    "division": 2,\n''',
)
replace_once(
    tests,
    '''        self.assertEqual(normalized["name"], "Regression FC")\n        self.assertEqual(normalized["division"], "2")\n''',
    '''        self.assertEqual(normalized["name"], "Regression FC")\n        self.assertEqual(normalized["city"], "Paris")\n        self.assertEqual(normalized["country"], "France")\n        self.assertEqual(normalized["division"], "2")\n''',
)
replace_once(
    tests,
    '''                        "name": "First Club",\n                        "division": 1,\n''',
    '''                        "name": "First Club",\n                        "city": "Rome",\n                        "country": "Italy",\n                        "division": 1,\n''',
)
replace_once(
    tests,
    '''                            "name": "Second Club",\n                            "division": 3,\n''',
    '''                            "name": "Second Club",\n                            "location": {"city": "Madrid", "country": "Spain"},\n                            "division": 3,\n''',
)
replace_once(
    tests,
    '''                "SELECT club_id, owner_wallet_address, logo_version, leaderboard_rank "\n                "FROM clubs ORDER BY leaderboard_rank"\n''',
    '''                "SELECT club_id, city, country, owner_wallet_address, logo_version, leaderboard_rank "\n                "FROM clubs ORDER BY leaderboard_rank"\n''',
)
replace_once(
    tests,
    '''                    ("club-1", "0xaaa", "11", 1),\n                    ("club-2", "0xbbb", "2", 2),\n''',
    '''                    ("club-1", "Rome", "Italy", "0xaaa", "11", 1),\n                    ("club-2", "Madrid", "Spain", "0xbbb", "2", 2),\n''',
)
replace_once(
    tests,
    '''                    name TEXT NOT NULL,\n                    division TEXT NOT NULL,\n''',
    '''                    name TEXT NOT NULL,\n                    city TEXT NOT NULL,\n                    country TEXT NOT NULL,\n                    division TEXT NOT NULL,\n''',
)
replace_once(
    tests,
    '''                "INSERT INTO clubs VALUES (?, ?, ?, ?, ?, ?, ?, ?)",\n                ("club-1", "Canonical Club", "2", "0xabc", "Owner", "5", 4, 777.0),\n''',
    '''                "INSERT INTO clubs VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",\n                ("club-1", "Canonical Club", "Bologna", "Italy", "2", "0xabc", "Owner", "5", 4, 777.0),\n''',
)
replace_once(
    tests,
    '''                "SELECT name, division, owner_wallet_address, logo_version, leaderboard_rank "\n                "FROM runtime_clubs WHERE club_id = 'club-1'"\n''',
    '''                "SELECT name, city, country, division, owner_wallet_address, logo_version, leaderboard_rank "\n                "FROM runtime_clubs WHERE club_id = 'club-1'"\n''',
)
replace_once(
    tests,
    '''            self.assertEqual(row, ("Canonical Club", 2, "0xabc", "5", 4))\n''',
    '''            self.assertEqual(row, ("Canonical Club", "Bologna", "Italy", 2, "0xabc", "5", 4))\n''',
)

# Add an old-artifact compatibility assertion before the module footer.
marker = '''        finally:\n            connection.close()\n\n\nif __name__ == "__main__":\n'''
addition = '''        finally:\n            connection.close()\n\n    def test_runtime_clubs_accepts_pre_location_canonical_table(self) -> None:\n        connection = sqlite3.connect(":memory:")\n        try:\n            connection.create_function(\n                "normalize_search", 1, runtime_db.normalize_search, deterministic=True\n            )\n            connection.execute(\n                """\n                CREATE TABLE players (\n                    active_contract_club_id TEXT,\n                    active_contract_club_name TEXT,\n                    active_contract_club_division TEXT\n                )\n                """\n            )\n            connection.execute(\n                """\n                CREATE TABLE clubs (\n                    club_id TEXT PRIMARY KEY,\n                    name TEXT NOT NULL,\n                    division TEXT NOT NULL,\n                    owner_wallet_address TEXT NOT NULL,\n                    owner_name TEXT NOT NULL,\n                    logo_version TEXT NOT NULL,\n                    leaderboard_rank INTEGER NOT NULL,\n                    mfl_points REAL\n                )\n                """\n            )\n            connection.execute(\n                "INSERT INTO clubs VALUES (?, ?, ?, ?, ?, ?, ?, ?)",\n                ("club-old", "Old Artifact Club", "1", "0xabc", "Owner", "2", 1, 100.0),\n            )\n\n            runtime_db.prepare_runtime_clubs(connection)\n            row = connection.execute(\n                "SELECT city, country FROM runtime_clubs WHERE club_id = 'club-old'"\n            ).fetchone()\n            self.assertEqual(row, ("", ""))\n        finally:\n            connection.close()\n\n\nif __name__ == "__main__":\n'''
replace_once(tests, marker, addition)
