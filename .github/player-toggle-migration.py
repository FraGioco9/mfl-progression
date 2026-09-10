from pathlib import Path


def replace(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    if old not in text:
        raise SystemExit(f"missing pattern in {path}: {old[:100]!r}")
    file.write_text(text.replace(old, new, 1))

replace(
    '.github/workflows/full-database-refresh.yml',
    '      fetch_progressions:\n        description: Fetch player progression data; disable to reuse previous values.\n        required: false\n        default: true\n        type: boolean\n',
    '      fetch_players:\n        description: Fetch current player data; disable to reuse the previous published player rows.\n        required: false\n        default: true\n        type: boolean\n      fetch_progressions:\n        description: Fetch player progression data; disable to reuse previous values.\n        required: false\n        default: true\n        type: boolean\n',
)
replace(
    '.github/workflows/full-database-refresh.yml',
    '          MFL_API_TOKEN: ${{ secrets.MFL_API_TOKEN }}\n          MFL_FETCH_PROGRESSIONS: ${{ inputs.fetch_progressions }}\n',
    '          MFL_API_TOKEN: ${{ secrets.MFL_API_TOKEN }}\n          MFL_FETCH_PLAYERS: ${{ inputs.fetch_players }}\n          MFL_FETCH_PROGRESSIONS: ${{ inputs.fetch_progressions }}\n',
)

replace(
    'scripts/database/rebuild_database_runner.py',
    'MFL_API_TOKEN_ENVIRONMENT_VARIABLE = "MFL_API_TOKEN"\nFETCH_PROGRESSIONS_ENVIRONMENT_VARIABLE = "MFL_FETCH_PROGRESSIONS"\n',
    'MFL_API_TOKEN_ENVIRONMENT_VARIABLE = "MFL_API_TOKEN"\nFETCH_PLAYERS_ENVIRONMENT_VARIABLE = "MFL_FETCH_PLAYERS"\nFETCH_PROGRESSIONS_ENVIRONMENT_VARIABLE = "MFL_FETCH_PROGRESSIONS"\n',
)
replace(
    'scripts/database/rebuild_database_runner.py',
    '    fetch_progressions = environment_flag(FETCH_PROGRESSIONS_ENVIRONMENT_VARIABLE)\n',
    '    fetch_players = environment_flag(FETCH_PLAYERS_ENVIRONMENT_VARIABLE)\n    fetch_progressions = environment_flag(FETCH_PROGRESSIONS_ENVIRONMENT_VARIABLE)\n',
)
replace(
    'scripts/database/rebuild_database_runner.py',
    '        return rebuild.rebuild_directly()\n',
    '        return rebuild.rebuild_directly(fetch_players=environment_flag(FETCH_PLAYERS_ENVIRONMENT_VARIABLE))\n',
)
replace(
    'scripts/database/rebuild_database_runner.py',
    '        "PlayMFL runtime configuration: "\n        f"/players {PLAYER_REQUESTS_PER_MINUTE} starts/min, "\n',
    '        "PlayMFL runtime configuration: "\n        f"/players {f\'enabled at {PLAYER_REQUESTS_PER_MINUTE} starts/min\' if fetch_players else \'disabled; reusing previous rows\'}, "\n',
)

insert_marker = '\ndef rebuild_directly() -> int:\n'
file = Path('scripts/database/rebuild_database.py')
text = file.read_text()
if insert_marker not in text:
    raise SystemExit('missing rebuild_directly marker')
helper = '''\ndef restore_previous_players(\n    connection: sqlite3.Connection,\n    previous_database_path: Path | None,\n) -> int:\n    """Copy the complete normalized player table from the previous published database."""\n    if previous_database_path is None or not previous_database_path.is_file():\n        raise RuntimeError("Player fetching disabled but no previous database is available to reuse")\n\n    alias = "previous_players"\n    connection.execute(f"ATTACH DATABASE ? AS {alias}", (str(previous_database_path),))\n    try:\n        previous_tables = {\n            str(row[0])\n            for row in connection.execute(\n                f"SELECT name FROM {alias}.sqlite_master WHERE type = 'table'"\n            ).fetchall()\n        }\n        if "players" not in previous_tables:\n            raise RuntimeError("Player fetching disabled but previous database has no players table")\n        previous_columns = {\n            str(row[1])\n            for row in connection.execute(f"PRAGMA {alias}.table_info(players)").fetchall()\n        }\n        required = set(run_flow_rebuild.PLAYER_COLUMNS)\n        missing = sorted(required - previous_columns)\n        if missing:\n            raise RuntimeError(\n                "Player fetching disabled but previous database player schema is incomplete: "\n                + ", ".join(missing)\n            )\n        columns = ", ".join(f'"{column}"' for column in run_flow_rebuild.PLAYER_COLUMNS)\n        connection.execute(\n            f"INSERT INTO players ({columns}) SELECT {columns} FROM {alias}.players"\n        )\n        connection.commit()\n    finally:\n        connection.execute(f"DETACH DATABASE {alias}")\n\n    restored = int(connection.execute("SELECT COUNT(*) FROM players").fetchone()[0])\n    run_flow_rebuild.log(f"Player fetching disabled; reused previous player rows: {restored}")\n    return restored\n\n'''
text = text.replace(insert_marker, helper + insert_marker, 1)
text = text.replace('def rebuild_directly() -> int:\n', 'def rebuild_directly(*, fetch_players: bool = True) -> int:\n', 1)
old = '''        source_results, _ = run_flow_rebuild.timed(\n            "All players",\n            run_flow_rebuild.fetch_all_player_sources,\n            limiter,\n        )\n        players = run_flow_rebuild.merge_players(\n            source_results["general"],\n            source_results["retired"],\n            source_results["mfl"],\n            source_results["mfl_trade"],\n        )\n        contract_players = validated_club_contract_players(players)\n        run_flow_rebuild.timed(\n            "Insert merged players",\n            run_flow_rebuild.insert_players,\n            connection,\n            players,\n        )\n'''
new = '''        if fetch_players:\n            source_results, _ = run_flow_rebuild.timed(\n                "All players",\n                run_flow_rebuild.fetch_all_player_sources,\n                limiter,\n            )\n            players = run_flow_rebuild.merge_players(\n                source_results["general"],\n                source_results["retired"],\n                source_results["mfl"],\n                source_results["mfl_trade"],\n            )\n            contract_players = validated_club_contract_players(players)\n            run_flow_rebuild.timed(\n                "Insert merged players",\n                run_flow_rebuild.insert_players,\n                connection,\n                players,\n            )\n        else:\n            run_flow_rebuild.timed(\n                "Reuse previous players",\n                restore_previous_players,\n                connection,\n                run_flow_rebuild_paged.PREVIOUS_DATABASE_PATH,\n            )\n            contract_players = ()\n'''
if old not in text:
    raise SystemExit('missing player fetch block')
file.write_text(text.replace(old, new, 1))

replace(
    'tests/test_full_database_refresh_workflow.py',
    '        defaults = {\n            "fetch_progressions": "true",\n',
    '        defaults = {\n            "fetch_players": "true",\n            "fetch_progressions": "true",\n',
)
replace(
    'tests/test_full_database_refresh_workflow.py',
    '        self.assertIn(\n            "MFL_FETCH_PROGRESSIONS: ${{ inputs.fetch_progressions }}",\n            self.workflow,\n        )\n',
    '        self.assertIn(\n            "MFL_FETCH_PLAYERS: ${{ inputs.fetch_players }}",\n            self.workflow,\n        )\n        self.assertIn(\n            "MFL_FETCH_PROGRESSIONS: ${{ inputs.fetch_progressions }}",\n            self.workflow,\n        )\n',
)

file = Path('tests/test_rebuild_database_runner_options.py')
text = file.read_text()
anchor = '    def test_competition_environment_variables_are_split(self) -> None:\n'
test = '''    def test_player_environment_variable_is_explicit(self) -> None:\n        self.assertEqual(runner.FETCH_PLAYERS_ENVIRONMENT_VARIABLE, "MFL_FETCH_PLAYERS")\n\n'''
if anchor not in text:
    raise SystemExit('missing runner test anchor')
file.write_text(text.replace(anchor, test + anchor, 1))
