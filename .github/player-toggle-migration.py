from pathlib import Path


def replace(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    if old not in text:
        raise SystemExit(f"missing pattern in {path}: {old[:120]!r}")
    file.write_text(text.replace(old, new, 1))

# Workflow input + environment wiring.
replace(
    ".github/workflows/full-database-refresh.yml",
    "      fetch_progressions:\n        description: Fetch player progression data; disable to reuse previous values.\n        required: false\n        default: true\n        type: boolean\n",
    "      fetch_players:\n        description: Fetch current player data; disable to reuse previous published player rows.\n        required: false\n        default: true\n        type: boolean\n      fetch_progressions:\n        description: Fetch player progression data; disable to reuse previous values.\n        required: false\n        default: true\n        type: boolean\n",
)
replace(
    ".github/workflows/full-database-refresh.yml",
    "          MFL_API_TOKEN: ${{ secrets.MFL_API_TOKEN }}\n          MFL_FETCH_PROGRESSIONS: ${{ inputs.fetch_progressions }}\n",
    "          MFL_API_TOKEN: ${{ secrets.MFL_API_TOKEN }}\n          MFL_FETCH_PLAYERS: ${{ inputs.fetch_players }}\n          MFL_FETCH_PROGRESSIONS: ${{ inputs.fetch_progressions }}\n",
)

# Rebuild: explicit safe reuse path for the normalized player table.
path = Path("scripts/database/rebuild_database.py")
text = path.read_text()
marker = "\ndef rebuild_directly() -> int:\n"
if marker not in text:
    raise SystemExit("missing rebuild_directly marker")
helper = '''\ndef restore_previous_players(\n    connection: sqlite3.Connection,\n    previous_database_path: Path | None,\n) -> int:\n    """Copy the complete normalized player table from the previous published database."""\n    if previous_database_path is None or not previous_database_path.is_file():\n        raise RuntimeError(\n            "Player fetching disabled but no previous database is available to reuse"\n        )\n\n    alias = "previous_players"\n    connection.execute(f"ATTACH DATABASE ? AS {alias}", (str(previous_database_path),))\n    try:\n        previous_tables = {\n            str(row[0])\n            for row in connection.execute(\n                f"SELECT name FROM {alias}.sqlite_master WHERE type = 'table'"\n            ).fetchall()\n        }\n        if "players" not in previous_tables:\n            raise RuntimeError(\n                "Player fetching disabled but previous database has no players table"\n            )\n\n        previous_columns = {\n            str(row[1])\n            for row in connection.execute(\n                f"PRAGMA {alias}.table_info(players)"\n            ).fetchall()\n        }\n        required_columns = set(run_flow_rebuild.PLAYER_COLUMNS)\n        missing_columns = sorted(required_columns - previous_columns)\n        if missing_columns:\n            raise RuntimeError(\n                "Player fetching disabled but previous database player schema is incomplete: "\n                + ", ".join(missing_columns)\n            )\n\n        columns = ", ".join(\n            f'"{column}"' for column in run_flow_rebuild.PLAYER_COLUMNS\n        )\n        connection.execute(\n            f"INSERT INTO players ({columns}) SELECT {columns} FROM {alias}.players"\n        )\n        connection.commit()\n    except Exception:\n        connection.rollback()\n        raise\n    finally:\n        connection.execute(f"DETACH DATABASE {alias}")\n\n    restored = int(\n        connection.execute("SELECT COUNT(*) FROM players").fetchone()[0]\n    )\n    run_flow_rebuild.log(\n        f"Player fetching disabled; reused previous player rows: {restored}"\n    )\n    return restored\n\n'''
text = text.replace(marker, helper + marker, 1)
text = text.replace(
    "def rebuild_directly() -> int:\n",
    "def rebuild_directly(*, fetch_players: bool = True) -> int:\n",
    1,
)
old_player_block = '''        source_results, _ = run_flow_rebuild.timed(\n            "All players",\n            run_flow_rebuild.fetch_all_player_sources,\n            limiter,\n        )\n        players = run_flow_rebuild.merge_players(\n            source_results["general"],\n            source_results["retired"],\n            source_results["mfl"],\n            source_results["mfl_trade"],\n        )\n        contract_players = validated_club_contract_players(players)\n        run_flow_rebuild.timed(\n            "Insert merged players",\n            run_flow_rebuild.insert_players,\n            connection,\n            players,\n        )\n'''
new_player_block = '''        if fetch_players:\n            source_results, _ = run_flow_rebuild.timed(\n                "All players",\n                run_flow_rebuild.fetch_all_player_sources,\n                limiter,\n            )\n            players = run_flow_rebuild.merge_players(\n                source_results["general"],\n                source_results["retired"],\n                source_results["mfl"],\n                source_results["mfl_trade"],\n            )\n            contract_players = validated_club_contract_players(players)\n            run_flow_rebuild.timed(\n                "Insert merged players",\n                run_flow_rebuild.insert_players,\n                connection,\n                players,\n            )\n        else:\n            run_flow_rebuild.timed(\n                "Reuse previous players",\n                restore_previous_players,\n                connection,\n                run_flow_rebuild_paged.PREVIOUS_DATABASE_PATH,\n            )\n            contract_players = ()\n'''
if old_player_block not in text:
    raise SystemExit("missing canonical player load block")
path.write_text(text.replace(old_player_block, new_player_block, 1))

# Runner: independent toggle and DB-backed progression batch planning when raw players are skipped.
replace(
    "scripts/database/rebuild_database_runner.py",
    'MFL_API_TOKEN_ENVIRONMENT_VARIABLE = "MFL_API_TOKEN"\nFETCH_PROGRESSIONS_ENVIRONMENT_VARIABLE = "MFL_FETCH_PROGRESSIONS"\n',
    'MFL_API_TOKEN_ENVIRONMENT_VARIABLE = "MFL_API_TOKEN"\nFETCH_PLAYERS_ENVIRONMENT_VARIABLE = "MFL_FETCH_PLAYERS"\nFETCH_PROGRESSIONS_ENVIRONMENT_VARIABLE = "MFL_FETCH_PROGRESSIONS"\n',
)
replace(
    "scripts/database/rebuild_database_runner.py",
    'def configure_rebuild() -> None:\n    """Install the authenticated, rate-limited production rebuild configuration."""\n    install_mfl_api_authentication()\n    fetch_progressions = environment_flag(FETCH_PROGRESSIONS_ENVIRONMENT_VARIABLE)\n',
    'def configure_rebuild() -> bool:\n    """Install the authenticated, rate-limited production rebuild configuration."""\n    install_mfl_api_authentication()\n    fetch_players = environment_flag(FETCH_PLAYERS_ENVIRONMENT_VARIABLE)\n    fetch_progressions = environment_flag(FETCH_PROGRESSIONS_ENVIRONMENT_VARIABLE)\n',
)
runner_path = Path("scripts/database/rebuild_database_runner.py")
runner = runner_path.read_text()
marker = "\n    def refresh_progressions_with_own_limiter(\n"
if marker not in runner:
    raise SystemExit("missing progression limiter marker")
helper = '''\n    def prepare_progression_batches_from_reused_players(\n        connection: sqlite3.Connection,\n    ) -> None:\n        rows = connection.execute(\n            """\n            SELECT player_id, lower(coalesce(wallet_address, '')), retirement_years\n            FROM players\n            ORDER BY player_id\n            """\n        ).fetchall()\n\n        def stub(player_id: int, wallet_address: str) -> dict[str, Any]:\n            return {\n                "id": int(player_id),\n                "ownedBy": {"walletAddress": str(wallet_address or "")},\n            }\n\n        active_players = [\n            stub(player_id, wallet_address)\n            for player_id, wallet_address, retirement_years in rows\n            if retirement_years != 0\n        ]\n        retired_players = [\n            stub(player_id, wallet_address)\n            for player_id, wallet_address, retirement_years in rows\n            if retirement_years == 0\n        ]\n        paged.ACTIVE_PROGRESSION_BATCHES = paged.prepare_progression_batches(\n            active_players,\n            "CURRENT_SEASON",\n        )\n        paged.RETIRED_PROGRESSION_BATCHES = paged.prepare_progression_batches(\n            retired_players,\n            "ALL",\n        )\n        pipeline.log(\n            "Progression batches prepared from reused player rows: "\n            f"active {len(active_players)}, retired {len(retired_players)}"\n        )\n\n'''
runner = runner.replace(marker, helper + marker, 1)
old = '''    def refresh_progressions_with_own_limiter(\n        connection: object,\n        _player_limiter: paged.RollingRateLimiter,\n    ) -> dict[str, int]:\n        progression_limiter = paged.RollingRateLimiter(\n            PROGRESSION_REQUESTS_PER_MINUTE\n        )\n'''
new = '''    def refresh_progressions_with_own_limiter(\n        connection: object,\n        _player_limiter: paged.RollingRateLimiter,\n    ) -> dict[str, int]:\n        if not fetch_players:\n            prepare_progression_batches_from_reused_players(connection)\n        progression_limiter = paged.RollingRateLimiter(\n            PROGRESSION_REQUESTS_PER_MINUTE\n        )\n'''
if old not in runner:
    raise SystemExit("missing refresh_progressions_with_own_limiter block")
runner = runner.replace(old, new, 1)
old_log = '''        "PlayMFL runtime configuration: "\n        f"/players {PLAYER_REQUESTS_PER_MINUTE} starts/min, "\n        f"/players/progressions {progression_status}, "\n'''
new_log = '''        "PlayMFL runtime configuration: "\n        f"/players {'enabled at ' + str(PLAYER_REQUESTS_PER_MINUTE) + ' starts/min' if fetch_players else 'disabled; reusing previous rows'}, "\n        f"/players/progressions {progression_status}, "\n'''
if old_log not in runner:
    raise SystemExit("missing runtime configuration log block")
runner = runner.replace(old_log, new_log, 1)
old_end = '''        f"{pipeline.MFL_WORKERS} workers"\n    )\n\n\ndef main() -> int:\n'''
new_end = '''        f"{pipeline.MFL_WORKERS} workers"\n    )\n    return fetch_players\n\n\ndef main() -> int:\n'''
if old_end not in runner:
    raise SystemExit("missing configure_rebuild end")
runner = runner.replace(old_end, new_end, 1)
runner = runner.replace(
    "        configure_rebuild()\n        return rebuild.rebuild_directly()\n",
    "        fetch_players = configure_rebuild()\n        return rebuild.rebuild_directly(fetch_players=fetch_players)\n",
    1,
)
runner_path.write_text(runner)

# Workflow contract tests.
replace(
    "tests/test_full_database_refresh_workflow.py",
    '        defaults = {\n            "fetch_progressions": "true",\n',
    '        defaults = {\n            "fetch_players": "true",\n            "fetch_progressions": "true",\n',
)
replace(
    "tests/test_full_database_refresh_workflow.py",
    '        self.assertIn(\n            "MFL_FETCH_PROGRESSIONS: ${{ inputs.fetch_progressions }}",\n            self.workflow,\n        )\n',
    '        self.assertIn(\n            "MFL_FETCH_PLAYERS: ${{ inputs.fetch_players }}",\n            self.workflow,\n        )\n        self.assertIn(\n            "MFL_FETCH_PROGRESSIONS: ${{ inputs.fetch_progressions }}",\n            self.workflow,\n        )\n',
)

# Runner/reuse regression coverage.
test_path = Path("tests/test_rebuild_database_runner_options.py")
tests = test_path.read_text()
anchor = "    def test_competition_environment_variables_are_split(self) -> None:\n"
addition = '''    def test_player_environment_variable_is_explicit(self) -> None:\n        self.assertEqual(\n            runner.FETCH_PLAYERS_ENVIRONMENT_VARIABLE,\n            "MFL_FETCH_PLAYERS",\n        )\n\n    def test_disabled_player_fetch_reuses_complete_previous_rows(self) -> None:\n        with tempfile.TemporaryDirectory() as directory:\n            previous_path = Path(directory) / "previous.db"\n            previous = sqlite3.connect(previous_path)\n            runner.pipeline.create_schema(previous)\n            previous.execute(\n                """\n                INSERT INTO players (\n                    player_id, wallet_address, wallet_name, name, retirement_years,\n                    overall, player_seasons, overall_prog_all, next_overall\n                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)\n                """,\n                (42, "0xabc", "Agent", "Player Forty Two", 3, 81, 7, 5, 82.5),\n            )\n            previous.commit()\n            previous.close()\n\n            current = sqlite3.connect(":memory:")\n            try:\n                runner.pipeline.create_schema(current)\n                restored = runner.rebuild.restore_previous_players(\n                    current,\n                    previous_path,\n                )\n                row = current.execute(\n                    """\n                    SELECT player_id, wallet_address, wallet_name, name,\n                           retirement_years, overall, player_seasons,\n                           overall_prog_all, next_overall\n                    FROM players\n                    """\n                ).fetchone()\n                self.assertEqual(restored, 1)\n                self.assertEqual(\n                    row,\n                    (42, "0xabc", "Agent", "Player Forty Two", 3, 81, 7, 5, 82.5),\n                )\n            finally:\n                current.close()\n\n    def test_disabled_player_fetch_fails_without_previous_database(self) -> None:\n        current = sqlite3.connect(":memory:")\n        try:\n            runner.pipeline.create_schema(current)\n            with self.assertRaisesRegex(RuntimeError, "no previous database"):\n                runner.rebuild.restore_previous_players(current, None)\n        finally:\n            current.close()\n\n'''
if anchor not in tests:
    raise SystemExit("missing runner test anchor")
test_path.write_text(tests.replace(anchor, addition + anchor, 1))

# Make sure all Python edits parse before CI.
for file_name in (
    "scripts/database/rebuild_database.py",
    "scripts/database/rebuild_database_runner.py",
    "tests/test_rebuild_database_runner_options.py",
    "tests/test_full_database_refresh_workflow.py",
):
    source = Path(file_name).read_text()
    compile(source, file_name, "exec")
