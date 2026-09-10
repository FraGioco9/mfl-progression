from __future__ import annotations

import re
from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text(encoding="utf-8")
    if old not in text:
        raise RuntimeError(f"Missing pattern in {path}: {old[:120]!r}")
    file.write_text(text.replace(old, new, 1), encoding="utf-8")


def sub_once(path: str, pattern: str, replacement: str) -> None:
    file = Path(path)
    text = file.read_text(encoding="utf-8")
    updated, count = re.subn(pattern, replacement, text, count=1, flags=re.DOTALL)
    if count != 1:
        raise RuntimeError(f"Expected one regex match in {path}, got {count}: {pattern[:120]!r}")
    file.write_text(updated, encoding="utf-8")


# ---------------------------------------------------------------------------
# Flow clubs: visible bounded progress + safe previous-database reuse.
# ---------------------------------------------------------------------------
replace_once(
    "scripts/database/clubs.py",
    "MIN_FLOW_SPLIT_BATCH_SIZE = 10\n",
    "MIN_FLOW_SPLIT_BATCH_SIZE = 10\n"
    "CLUB_COLUMNS = (\n"
    "    \"club_id\", \"name\", \"city\", \"country\", \"primary_color\",\n"
    "    \"secondary_color\", \"status\", \"division\", \"owner_wallet_address\",\n"
    "    \"owner_name\", \"signed_player_ids\", \"current_competition_ids\",\n"
    ")\n",
)

replace_once(
    "scripts/database/clubs.py",
    "\ndef fetch_club_snapshots(\n",
    "\ndef _should_log_progress(completed: int, total: int) -> bool:\n"
    "    return total <= 10 or completed == 1 or completed == total or completed % 10 == 0\n\n\n"
    "def fetch_club_snapshots(\n",
)

sub_once(
    "scripts/database/clubs.py",
    r"def fetch_club_snapshots\(.*?\n    return snapshots\n\n\ndef candidate_wallet_addresses",
    '''def fetch_club_snapshots(
    club_ids: Iterable[int | str],
    execute_script: FlowExecute | None = None,
    log: Callable[[str], None] = print,
) -> dict[str, dict[str, Any]]:
    execute = _flow_execute(execute_script)
    normalized_ids = sorted({int(club_id) for club_id in club_ids})
    snapshots: dict[str, dict[str, Any]] = {}

    def fetch_batch(batch: list[Any]) -> list[dict[str, Any]]:
        response = execute(
            FLOW_CLUB_SNAPSHOTS_SCRIPT,
            [_uint64_array(int(value) for value in batch)],
            f"MFLClub snapshots {batch[0]}-{batch[-1]}",
        )
        decoded = cadence_decode(response)
        if not isinstance(decoded, list):
            raise RuntimeError("Flow MFLClub snapshot response was not an array")
        return [item for item in decoded if isinstance(item, dict)]

    total_batches = (
        (len(normalized_ids) + FLOW_CLUB_BATCH_SIZE - 1) // FLOW_CLUB_BATCH_SIZE
        if normalized_ids
        else 0
    )
    log(
        f"Flow club snapshots: {len(normalized_ids)} candidates across "
        f"{total_batches} batches"
    )
    for batch_number, offset in enumerate(
        range(0, len(normalized_ids), FLOW_CLUB_BATCH_SIZE),
        start=1,
    ):
        batch = normalized_ids[offset:offset + FLOW_CLUB_BATCH_SIZE]
        rows = _split_resilient(
            batch,
            minimum_size=MIN_FLOW_SPLIT_BATCH_SIZE,
            fetch=fetch_batch,
            label="Flow club snapshots",
        )
        for row in rows:
            club_id = str(row.get("clubId") or "").strip()
            if club_id:
                snapshots[club_id] = row
        if _should_log_progress(batch_number, total_batches):
            log(
                f"Flow club snapshots batch {batch_number}/{total_batches}: "
                f"requested {len(batch)}, returned {len(rows)}, total {len(snapshots)}"
            )
    return snapshots


def candidate_wallet_addresses''',
)

sub_once(
    "scripts/database/clubs.py",
    r"def fetch_detail_owner_hints\(.*?\n    return hints\n\n\ndef fetch_club_owners",
    '''def fetch_detail_owner_hints(
    club_ids: Iterable[str],
    request_json: JsonRequest,
    limiter: Any = None,
    log: Callable[[str], None] = print,
) -> dict[str, str]:
    """Use individual PlayMFL club responses only to locate wallets for Flow verification."""
    hints: dict[str, str] = {}
    normalized_ids = {_normalized_club_id(value) for value in club_ids}
    ordered_ids = sorted((value for value in normalized_ids if value), key=int)
    total = len(ordered_ids)
    log(f"Club owner fallback details: {total} clubs")
    for completed, club_id in enumerate(ordered_ids, start=1):
        outcome = "no owner hint"
        try:
            payload = request_json(
                CLUB_DETAIL_URL.format(club_id=club_id),
                f"Club owner hint {club_id}",
                limiter,
            )
        except RuntimeError:
            outcome = "unavailable after retries"
        else:
            if isinstance(payload, dict):
                owner = payload.get("ownedBy") if isinstance(payload.get("ownedBy"), dict) else {}
                address = str(owner.get("walletAddress") or "").strip().lower()
                if address:
                    hints[club_id] = address
                    outcome = "owner hint found"
        if _should_log_progress(completed, total):
            log(
                f"Club owner fallback detail {completed}/{total}: "
                f"club {club_id}, {outcome}"
            )
    return hints


def fetch_club_owners''',
)

sub_once(
    "scripts/database/clubs.py",
    r"def fetch_club_owners\(.*?\n    return owners\n\n\ndef _to_int",
    '''def fetch_club_owners(
    wallet_addresses: Iterable[str],
    execute_script: FlowExecute | None = None,
    log: Callable[[str], None] = print,
    phase: str = "Flow club owners",
) -> dict[str, str]:
    execute = _flow_execute(execute_script)
    addresses = sorted({str(value).strip().lower() for value in wallet_addresses if value})
    owners: dict[str, str] = {}

    def fetch_batch(batch: list[Any]) -> list[dict[str, Any]]:
        response = execute(
            FLOW_CLUB_OWNERS_SCRIPT,
            [_address_array(str(value) for value in batch)],
            f"MFLClub owners ({len(batch)} wallets)",
        )
        decoded = cadence_decode(response)
        if not isinstance(decoded, list):
            raise RuntimeError("Flow MFLClub owner response was not an array")
        return [item for item in decoded if isinstance(item, dict)]

    total_batches = (
        (len(addresses) + FLOW_OWNER_BATCH_SIZE - 1) // FLOW_OWNER_BATCH_SIZE
        if addresses
        else 0
    )
    log(f"{phase}: {len(addresses)} wallets across {total_batches} batches")
    for batch_number, offset in enumerate(
        range(0, len(addresses), FLOW_OWNER_BATCH_SIZE),
        start=1,
    ):
        batch = addresses[offset:offset + FLOW_OWNER_BATCH_SIZE]
        rows = _split_resilient(
            batch,
            minimum_size=MIN_FLOW_SPLIT_BATCH_SIZE,
            fetch=fetch_batch,
            label=phase,
        )
        resolved_this_batch = 0
        for row in rows:
            club_id = str(row.get("clubId") or "").strip()
            owner = str(row.get("owner") or "").strip().lower()
            if not club_id or not owner:
                continue
            previous = owners.get(club_id)
            if previous and previous != owner:
                raise RuntimeError(
                    f"Flow returned multiple owners for club {club_id}: {previous}, {owner}"
                )
            if previous is None:
                resolved_this_batch += 1
            owners[club_id] = owner
        if _should_log_progress(batch_number, total_batches):
            log(
                f"{phase} batch {batch_number}/{total_batches}: checked {len(batch)} wallets, "
                f"resolved {resolved_this_batch} clubs, total {len(owners)}"
            )
    return owners


def _to_int''',
)

restore_clubs = '''\n\ndef restore_previous_clubs(
    connection: sqlite3.Connection,
    previous_database_path: Path | None,
    log: Callable[[str], None] = print,
) -> int:
    """Reuse canonical club records while reconciling relationships from current rows."""
    if previous_database_path is None or not previous_database_path.is_file():
        raise RuntimeError(
            "Club fetching disabled but no previous database is available to reuse"
        )

    database_uri = f"{previous_database_path.resolve().as_uri()}?mode=ro"
    previous = sqlite3.connect(database_uri, uri=True)
    try:
        tables = {
            str(row[0])
            for row in previous.execute(
                "SELECT name FROM sqlite_master WHERE type = 'table'"
            ).fetchall()
        }
        if "clubs" not in tables:
            raise RuntimeError(
                "Club fetching disabled but previous database has no clubs table"
            )
        previous_columns = {
            str(row[1])
            for row in previous.execute("PRAGMA table_info(clubs)").fetchall()
        }
        missing_columns = sorted(set(CLUB_COLUMNS) - previous_columns)
        if missing_columns:
            raise RuntimeError(
                "Club fetching disabled but previous database club schema is incomplete: "
                + ", ".join(missing_columns)
            )
        columns = ", ".join(f'"{column}"' for column in CLUB_COLUMNS)
        rows = previous.execute(f"SELECT {columns} FROM clubs").fetchall()
    finally:
        previous.close()

    if not rows:
        raise RuntimeError(
            "Club fetching disabled but previous database contains no club records"
        )

    ensure_club_schema(connection)
    placeholders = ", ".join("?" for _ in CLUB_COLUMNS)
    columns = ", ".join(f'"{column}"' for column in CLUB_COLUMNS)
    connection.executemany(
        f"INSERT INTO clubs ({columns}) VALUES ({placeholders})",
        rows,
    )

    signed_players = signed_players_by_club(connection)
    existing_club_ids = {
        str(row[0])
        for row in connection.execute("SELECT club_id FROM clubs").fetchall()
    }
    missing_referenced_clubs = sorted(
        set(signed_players) - existing_club_ids,
        key=lambda value: int(value) if value.isdigit() else value,
    )
    if missing_referenced_clubs:
        raise RuntimeError(
            "Club fetching disabled but current players reference clubs absent from the "
            "previous database: " + ", ".join(missing_referenced_clubs)
        )

    names = owner_names(connection)
    updates: list[tuple[str, str, str]] = []
    owner_names_updated = 0
    signed_link_count = 0
    for club_id, owner_wallet_address, previous_owner_name in connection.execute(
        "SELECT club_id, owner_wallet_address, owner_name FROM clubs ORDER BY club_id"
    ).fetchall():
        club_key = str(club_id)
        signed = sorted({int(player_id) for player_id in signed_players.get(club_key, [])})
        signed_link_count += len(signed)
        wallet = str(owner_wallet_address or "").strip().lower()
        resolved_owner_name = names.get(wallet) or str(previous_owner_name or "")
        if resolved_owner_name != str(previous_owner_name or ""):
            owner_names_updated += 1
        updates.append(
            (
                json.dumps(signed, separators=(",", ":")),
                resolved_owner_name,
                club_key,
            )
        )
    connection.executemany(
        "UPDATE clubs SET signed_player_ids = ?, owner_name = ? WHERE club_id = ?",
        updates,
    )
    connection.commit()
    log(
        f"Club fetching disabled; reused previous clubs: {len(rows)}; "
        f"reconciled {signed_link_count} signed-player links and "
        f"{owner_names_updated} owner names"
    )
    return len(rows)
'''
replace_once(
    "scripts/database/clubs.py",
    "\ndef refresh_clubs(\n",
    restore_clubs + "\n\ndef refresh_clubs(\n",
)

replace_once(
    "scripts/database/clubs.py",
    "    previous_database_path: Path | None = None,\n) -> int:\n    \"\"\"Build every canonical ClubData record, with Flow-verified ownership when it exists.\"\"\"\n    total_supply = fetch_total_supply(execute_script)\n",
    "    previous_database_path: Path | None = None,\n"
    "    log: Callable[[str], None] = print,\n"
    ") -> int:\n"
    "    \"\"\"Build every canonical ClubData record, with Flow-verified ownership when it exists.\"\"\"\n"
    "    log(\"Flow club total supply: requesting\")\n"
    "    total_supply = fetch_total_supply(execute_script)\n"
    "    log(f\"Flow club total supply: {total_supply}\")\n",
)
replace_once(
    "scripts/database/clubs.py",
    "    if request_json is not None:\n        payload = request_json(CLUB_INDEX_URL, \"Club discovery index\", limiter)\n        index_ids, owner_hints = club_index_hints(payload)\n\n    wallets = set(candidate_wallet_addresses(connection))\n    wallets.update(owner_hints.values())\n    owners = fetch_club_owners(wallets, execute_script) if wallets else {}\n",
    "    if request_json is not None:\n"
    "        log(\"Club discovery index: requesting\")\n"
    "        payload = request_json(CLUB_INDEX_URL, \"Club discovery index\", limiter)\n"
    "        index_ids, owner_hints = club_index_hints(payload)\n"
    "        log(\n"
    "            f\"Club discovery index loaded: {len(index_ids)} club IDs, \"\n"
    "            f\"{len(owner_hints)} owner hints\"\n"
    "        )\n\n"
    "    wallets = set(candidate_wallet_addresses(connection))\n"
    "    wallets.update(owner_hints.values())\n"
    "    log(f\"Flow club owner candidates: {len(wallets)} wallets\")\n"
    "    owners = (\n"
    "        fetch_club_owners(wallets, execute_script, log)\n"
    "        if wallets\n"
    "        else {}\n"
    "    )\n",
)
replace_once(
    "scripts/database/clubs.py",
    "    snapshots = fetch_club_snapshots(candidate_ids, execute_script)\n",
    "    log(f\"Flow club snapshot candidates: {len(candidate_ids)} clubs\")\n"
    "    snapshots = fetch_club_snapshots(candidate_ids, execute_script, log)\n",
)
replace_once(
    "scripts/database/clubs.py",
    "    if request_json is not None and detail_fallback_ids:\n        detail_hints = fetch_detail_owner_hints(\n            detail_fallback_ids,\n            request_json,\n            limiter,\n        )\n        new_wallets = set(detail_hints.values()) - wallets\n        if new_wallets:\n            owners.update(fetch_club_owners(new_wallets, execute_script))\n            wallets.update(new_wallets)\n",
    "    log(\n"
    "        f\"Club owner fallback candidates: {len(detail_fallback_ids)} clubs \"\n"
    "        f\"without a Flow-verified owner\"\n"
    "    )\n"
    "    if request_json is not None and detail_fallback_ids:\n"
    "        detail_hints = fetch_detail_owner_hints(\n"
    "            detail_fallback_ids,\n"
    "            request_json,\n"
    "            limiter,\n"
    "            log,\n"
    "        )\n"
    "        new_wallets = set(detail_hints.values()) - wallets\n"
    "        if new_wallets:\n"
    "            owners.update(\n"
    "                fetch_club_owners(\n"
    "                    new_wallets,\n"
    "                    execute_script,\n"
    "                    log,\n"
    "                    \"Flow fallback club owners\",\n"
    "                )\n"
    "            )\n"
    "            wallets.update(new_wallets)\n",
)
replace_once(
    "scripts/database/clubs.py",
    "    print(\n        f\"Canonical Flow clubs saved: {len(records)} \"",
    "    log(\n        f\"Canonical Flow clubs saved: {len(records)} \"",
)
replace_once(
    "scripts/database/clubs.py",
    "        f\"statuses={status_counts})\",\n        flush=True,\n    )\n",
    "        f\"statuses={status_counts})\"\n    )\n",
)


# ---------------------------------------------------------------------------
# Database rebuild: wallet/club/player-season controls with fail-safe reuse.
# ---------------------------------------------------------------------------
rebuild_helpers = '''\n\ndef restore_previous_wallets(
    connection: sqlite3.Connection,
    previous_database_path: Path | None,
) -> int:
    """Copy normalized leaderboard wallets from the previous published database."""
    if previous_database_path is None or not previous_database_path.is_file():
        raise RuntimeError(
            "Wallet fetching disabled but no previous database is available to reuse"
        )

    database_uri = f"{previous_database_path.resolve().as_uri()}?mode=ro"
    previous = sqlite3.connect(database_uri, uri=True)
    try:
        tables = {
            str(row[0])
            for row in previous.execute(
                "SELECT name FROM sqlite_master WHERE type = 'table'"
            ).fetchall()
        }
        if "wallets" not in tables:
            raise RuntimeError(
                "Wallet fetching disabled but previous database has no wallets table"
            )
        previous_columns = {
            str(row[1])
            for row in previous.execute("PRAGMA table_info(wallets)").fetchall()
        }
        required_columns = {"wallet_address", "name"}
        missing_columns = sorted(required_columns - previous_columns)
        if missing_columns:
            raise RuntimeError(
                "Wallet fetching disabled but previous database wallet schema is incomplete: "
                + ", ".join(missing_columns)
            )
        rows = previous.execute(
            "SELECT lower(wallet_address), name FROM wallets "
            "WHERE coalesce(wallet_address, '') <> '' ORDER BY lower(wallet_address)"
        ).fetchall()
    finally:
        previous.close()

    if not rows:
        raise RuntimeError(
            "Wallet fetching disabled but previous database contains no wallet records"
        )
    connection.executemany(
        "INSERT OR REPLACE INTO wallets(wallet_address, name) VALUES (?, ?)",
        rows,
    )
    connection.executemany(
        "INSERT OR REPLACE INTO wallets(wallet_address, name) VALUES (?, ?)",
        (
            (run_flow_rebuild.MFL_WALLET_ADDRESS, run_flow_rebuild.MFL_WALLET_NAME),
            (run_flow_rebuild.MFL_TRADE_WALLET_ADDRESS, run_flow_rebuild.MFL_TRADE_WALLET_NAME),
        ),
    )
    connection.commit()
    restored = int(connection.execute("SELECT COUNT(*) FROM wallets").fetchone()[0])
    run_flow_rebuild.log(
        f"Wallet fetching disabled; reused previous wallet rows: {restored}"
    )
    return restored


def reuse_resolved_player_seasons(connection: sqlite3.Connection) -> dict[str, int]:
    """Skip external season recovery only when every current player is already resolved."""
    total_players = int(connection.execute("SELECT COUNT(*) FROM players").fetchone()[0])
    unresolved = run_flow_rebuild.unresolved_player_season_count(connection)
    if unresolved:
        raise RuntimeError(
            "Player-season fetching disabled but "
            f"{unresolved} players are unresolved; enable Fetch player seasons"
        )
    run_flow_rebuild.log(
        f"Player-season fetching disabled; reused resolved seasons for {total_players} players"
    )
    return {
        "already_known": total_players,
        "recovered_from_flow": 0,
        "recovered_from_mfl_history": 0,
        "still_unresolved": 0,
    }
'''
replace_once(
    "scripts/database/rebuild_database.py",
    "\ndef restore_previous_players(\n",
    rebuild_helpers + "\n\ndef restore_previous_players(\n",
)

replace_once(
    "scripts/database/rebuild_database.py",
    "def rebuild_directly(*, fetch_players: bool = True) -> int:\n",
    "def rebuild_directly(\n"
    "    *,\n"
    "    fetch_wallets: bool = True,\n"
    "    fetch_players: bool = True,\n"
    "    fetch_clubs: bool = True,\n"
    "    fetch_player_seasons: bool = True,\n"
    ") -> int:\n",
)
replace_once(
    "scripts/database/rebuild_database.py",
    "        run_flow_rebuild.timed(\n            \"Leaderboard wallets\",\n            run_flow_rebuild.refresh_wallets,\n            connection,\n            limiter,\n        )\n",
    "        if fetch_wallets:\n"
    "            run_flow_rebuild.timed(\n"
    "                \"Leaderboard wallets\",\n"
    "                run_flow_rebuild.refresh_wallets,\n"
    "                connection,\n"
    "                limiter,\n"
    "            )\n"
    "        else:\n"
    "            run_flow_rebuild.timed(\n"
    "                \"Reuse previous wallets\",\n"
    "                restore_previous_wallets,\n"
    "                connection,\n"
    "                run_flow_rebuild_paged.PREVIOUS_DATABASE_PATH,\n"
    "            )\n",
)
replace_once(
    "scripts/database/rebuild_database.py",
    "        run_flow_rebuild.timed(\n            \"Flow clubs and rosters\",\n            clubs.refresh_clubs,\n            connection,\n            None,\n            run_flow_rebuild.request_json,\n            limiter,\n            contract_players,\n            run_flow_rebuild_paged.PREVIOUS_DATABASE_PATH,\n        )\n",
    "        if fetch_clubs:\n"
    "            run_flow_rebuild.timed(\n"
    "                \"Flow clubs and rosters\",\n"
    "                clubs.refresh_clubs,\n"
    "                connection,\n"
    "                None,\n"
    "                run_flow_rebuild.request_json,\n"
    "                limiter,\n"
    "                contract_players,\n"
    "                run_flow_rebuild_paged.PREVIOUS_DATABASE_PATH,\n"
    "                run_flow_rebuild.log,\n"
    "            )\n"
    "        else:\n"
    "            run_flow_rebuild.timed(\n"
    "                \"Reuse previous clubs and rosters\",\n"
    "                clubs.restore_previous_clubs,\n"
    "                connection,\n"
    "                run_flow_rebuild_paged.PREVIOUS_DATABASE_PATH,\n"
    "                run_flow_rebuild.log,\n"
    "            )\n",
)
sub_once(
    "scripts/database/rebuild_database.py",
    r"        flow_started = time\.perf_counter\(\)\n        season_stats = run_flow_rebuild\.refresh_player_seasons\(connection\)\n        updated_seasons = \(\n            season_stats\[\"recovered_from_flow\"\]\n            \+ season_stats\[\"recovered_from_mfl_history\"\]\n        \)\n        flow_seconds = time\.perf_counter\(\) - flow_started\n        run_flow_rebuild\.log\(\n            f\"\\n=== Flow seasons ===\\nFlow seasons updated: \{updated_seasons\} \"\n            f\"in \{run_flow_rebuild\.format_duration\(flow_seconds\)\}\"\n        \)\n",
    '''        flow_started = time.perf_counter()
        if fetch_player_seasons:
            season_stats = run_flow_rebuild.refresh_player_seasons(connection)
            updated_seasons = (
                season_stats["recovered_from_flow"]
                + season_stats["recovered_from_mfl_history"]
            )
            flow_seconds = time.perf_counter() - flow_started
            run_flow_rebuild.log(
                f"\n=== Flow seasons ===\nFlow seasons updated: {updated_seasons} "
                f"in {run_flow_rebuild.format_duration(flow_seconds)}"
            )
        else:
            season_stats = reuse_resolved_player_seasons(connection)
            updated_seasons = 0
            flow_seconds = time.perf_counter() - flow_started
            run_flow_rebuild.log(
                f"\n=== Flow seasons ===\nFlow season fetch disabled: "
                f"{season_stats['already_known']} already resolved, 0 unresolved "
                f"in {run_flow_rebuild.format_duration(flow_seconds)}"
            )
''',
)


# ---------------------------------------------------------------------------
# Runner: parse and publish the new controls.
# ---------------------------------------------------------------------------
replace_once(
    "scripts/database/rebuild_database_runner.py",
    "MFL_API_TOKEN_ENVIRONMENT_VARIABLE = \"MFL_API_TOKEN\"\nFETCH_PLAYERS_ENVIRONMENT_VARIABLE = \"MFL_FETCH_PLAYERS\"\n",
    "MFL_API_TOKEN_ENVIRONMENT_VARIABLE = \"MFL_API_TOKEN\"\n"
    "FETCH_WALLETS_ENVIRONMENT_VARIABLE = \"MFL_FETCH_WALLETS\"\n"
    "FETCH_PLAYERS_ENVIRONMENT_VARIABLE = \"MFL_FETCH_PLAYERS\"\n"
    "FETCH_CLUBS_ENVIRONMENT_VARIABLE = \"MFL_FETCH_CLUBS\"\n"
    "FETCH_PLAYER_SEASONS_ENVIRONMENT_VARIABLE = \"MFL_FETCH_PLAYER_SEASONS\"\n",
)
replace_once(
    "scripts/database/rebuild_database_runner.py",
    "def configure_rebuild() -> bool:\n",
    "def configure_rebuild() -> dict[str, bool]:\n",
)
replace_once(
    "scripts/database/rebuild_database_runner.py",
    "    fetch_players = environment_flag(FETCH_PLAYERS_ENVIRONMENT_VARIABLE)\n    fetch_progressions = environment_flag(FETCH_PROGRESSIONS_ENVIRONMENT_VARIABLE)\n",
    "    fetch_wallets = environment_flag(FETCH_WALLETS_ENVIRONMENT_VARIABLE)\n"
    "    fetch_players = environment_flag(FETCH_PLAYERS_ENVIRONMENT_VARIABLE)\n"
    "    fetch_clubs = environment_flag(FETCH_CLUBS_ENVIRONMENT_VARIABLE)\n"
    "    fetch_player_seasons = environment_flag(\n"
    "        FETCH_PLAYER_SEASONS_ENVIRONMENT_VARIABLE\n"
    "    )\n"
    "    fetch_progressions = environment_flag(FETCH_PROGRESSIONS_ENVIRONMENT_VARIABLE)\n",
)
replace_once(
    "scripts/database/rebuild_database_runner.py",
    "        \"PlayMFL runtime configuration: \"\n        f\"/players {'enabled at ' + str(PLAYER_REQUESTS_PER_MINUTE) + ' starts/min' if fetch_players else 'disabled; reusing previous rows'}, \"\n        f\"/players/progressions {progression_status}, \"\n",
    "        \"PlayMFL runtime configuration: \"\n"
    "        f\"wallets {'enabled' if fetch_wallets else 'disabled; reusing previous rows'}, \"\n"
    "        f\"/players {'enabled at ' + str(PLAYER_REQUESTS_PER_MINUTE) + ' starts/min' if fetch_players else 'disabled; reusing previous rows'}, \"\n"
    "        f\"clubs/rosters {'enabled' if fetch_clubs else 'disabled; reusing previous rows'}, \"\n"
    "        f\"player seasons {'enabled' if fetch_player_seasons else 'disabled; requiring resolved rows'}, \"\n"
    "        f\"/players/progressions {progression_status}, \"\n",
)
replace_once(
    "scripts/database/rebuild_database_runner.py",
    "    return fetch_players\n\n\ndef main() -> int:\n    install_thread_error_logging()\n    try:\n        fetch_players = configure_rebuild()\n        return rebuild.rebuild_directly(fetch_players=fetch_players)\n",
    "    return {\n"
    "        \"fetch_wallets\": fetch_wallets,\n"
    "        \"fetch_players\": fetch_players,\n"
    "        \"fetch_clubs\": fetch_clubs,\n"
    "        \"fetch_player_seasons\": fetch_player_seasons,\n"
    "    }\n\n\n"
    "def main() -> int:\n"
    "    install_thread_error_logging()\n"
    "    try:\n"
    "        rebuild_options = configure_rebuild()\n"
    "        return rebuild.rebuild_directly(**rebuild_options)\n",
)


# ---------------------------------------------------------------------------
# Full database refresh inputs. This modified workflow is uploaded as a Git
# blob by the migration workflow; the bot does not push workflow-file refs.
# ---------------------------------------------------------------------------
workflow_controls_old = '''      fetch_players:
        description: Fetch current player data; disable to reuse previous published player rows.
        required: false
        default: true
        type: boolean
      fetch_progressions:
        description: Fetch player progression data; disable to reuse previous values.
        required: false
        default: true
        type: boolean
      fetch_live_competitions:
        description: Fetch and reconcile LIVE competition data; disable to reuse stored history only.
        required: false
        default: true
        type: boolean
      backfill_historical_competitions:
        description: Backfill missing historical competitions from Season 1; intended for manual maintenance.
        required: false
        default: false
        type: boolean
      send_progression_emails:
        description: Send progression notification emails after the rebuild.
        required: false
        default: true
        type: boolean
'''
workflow_controls_new = '''      fetch_wallets:
        description: Fetch leaderboard wallets; disable to reuse previous published wallet rows.
        required: false
        default: true
        type: boolean
      fetch_players:
        description: Fetch current player data; disable to reuse previous published player rows.
        required: false
        default: true
        type: boolean
      fetch_clubs:
        description: Fetch Flow clubs and rosters; disable to reuse previous clubs and reconcile local relationships.
        required: false
        default: true
        type: boolean
      fetch_live_competitions:
        description: Fetch and reconcile LIVE competition data; disable to reuse stored history only.
        required: false
        default: true
        type: boolean
      backfill_historical_competitions:
        description: Backfill missing historical competitions from Season 1; intended for manual maintenance.
        required: false
        default: false
        type: boolean
      fetch_player_seasons:
        description: Resolve missing player seasons from Flow/MFL history; disable only when all rows are already resolved.
        required: false
        default: true
        type: boolean
      fetch_progressions:
        description: Fetch player progression data; disable to reuse previous values.
        required: false
        default: true
        type: boolean
      send_progression_emails:
        description: Send progression notification emails after the rebuild.
        required: false
        default: true
        type: boolean
'''
replace_once(
    ".github/workflows/full-database-refresh.yml",
    workflow_controls_old,
    workflow_controls_new,
)
replace_once(
    ".github/workflows/full-database-refresh.yml",
    "          MFL_API_TOKEN: ${{ secrets.MFL_API_TOKEN }}\n"
    "          MFL_FETCH_PLAYERS: ${{ inputs.fetch_players }}\n"
    "          MFL_FETCH_PROGRESSIONS: ${{ inputs.fetch_progressions }}\n"
    "          MFL_FETCH_LIVE_COMPETITIONS: ${{ inputs.fetch_live_competitions }}\n"
    "          MFL_BACKFILL_HISTORICAL_COMPETITIONS: ${{ inputs.backfill_historical_competitions }}\n",
    "          MFL_API_TOKEN: ${{ secrets.MFL_API_TOKEN }}\n"
    "          MFL_FETCH_WALLETS: ${{ inputs.fetch_wallets }}\n"
    "          MFL_FETCH_PLAYERS: ${{ inputs.fetch_players }}\n"
    "          MFL_FETCH_CLUBS: ${{ inputs.fetch_clubs }}\n"
    "          MFL_FETCH_LIVE_COMPETITIONS: ${{ inputs.fetch_live_competitions }}\n"
    "          MFL_BACKFILL_HISTORICAL_COMPETITIONS: ${{ inputs.backfill_historical_competitions }}\n"
    "          MFL_FETCH_PLAYER_SEASONS: ${{ inputs.fetch_player_seasons }}\n"
    "          MFL_FETCH_PROGRESSIONS: ${{ inputs.fetch_progressions }}\n",
)


# ---------------------------------------------------------------------------
# Focused regression coverage.
# ---------------------------------------------------------------------------
Path("tests/test_database_refresh_controls.py").write_text(
    '''from __future__ import annotations

import json
import sqlite3
import tempfile
import unittest
from pathlib import Path

from scripts.database import clubs
from scripts.database import rebuild_database as rebuild
from scripts.database import rebuild_database_runner as runner
from scripts.database import run_flow_rebuild as pipeline
from tests.workflow_sources import read_workflow


class DatabaseRefreshControlTests(unittest.TestCase):
    def test_workflow_exposes_safe_granular_defaults_and_env_wiring(self) -> None:
        workflow = read_workflow(".github/workflows/full-database-refresh.yml")
        defaults = {
            "fetch_wallets": "true",
            "fetch_players": "true",
            "fetch_clubs": "true",
            "fetch_live_competitions": "true",
            "backfill_historical_competitions": "false",
            "fetch_player_seasons": "true",
            "fetch_progressions": "true",
            "send_progression_emails": "true",
        }
        for option, expected_default in defaults.items():
            block = workflow.split(f"      {option}:\\n", 1)[1][:420]
            self.assertIn(f"default: {expected_default}", block)
            self.assertIn("type: boolean", block)

        env_bindings = {
            "MFL_FETCH_WALLETS": "fetch_wallets",
            "MFL_FETCH_PLAYERS": "fetch_players",
            "MFL_FETCH_CLUBS": "fetch_clubs",
            "MFL_FETCH_PLAYER_SEASONS": "fetch_player_seasons",
            "MFL_FETCH_PROGRESSIONS": "fetch_progressions",
            "MFL_FETCH_LIVE_COMPETITIONS": "fetch_live_competitions",
            "MFL_BACKFILL_HISTORICAL_COMPETITIONS": "backfill_historical_competitions",
        }
        for variable, option in env_bindings.items():
            self.assertIn(f"{variable}: ${{{{ inputs.{option} }}}}", workflow)

    def test_runner_names_new_fetch_environment_variables(self) -> None:
        self.assertEqual(runner.FETCH_WALLETS_ENVIRONMENT_VARIABLE, "MFL_FETCH_WALLETS")
        self.assertEqual(runner.FETCH_CLUBS_ENVIRONMENT_VARIABLE, "MFL_FETCH_CLUBS")
        self.assertEqual(
            runner.FETCH_PLAYER_SEASONS_ENVIRONMENT_VARIABLE,
            "MFL_FETCH_PLAYER_SEASONS",
        )

    def test_wallet_reuse_copies_previous_rows_and_canonical_special_wallets(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            previous_path = Path(directory) / "previous.db"
            previous = sqlite3.connect(previous_path)
            previous.execute(
                "CREATE TABLE wallets (wallet_address TEXT PRIMARY KEY, name TEXT NOT NULL DEFAULT '')"
            )
            previous.execute("INSERT INTO wallets VALUES ('0xabc', 'Owner')")
            previous.commit()
            previous.close()

            current = sqlite3.connect(":memory:")
            try:
                current.execute(
                    "CREATE TABLE wallets (wallet_address TEXT PRIMARY KEY, name TEXT NOT NULL DEFAULT '')"
                )
                count = rebuild.restore_previous_wallets(current, previous_path)
                rows = dict(current.execute("SELECT wallet_address, name FROM wallets"))
                self.assertEqual(count, 3)
                self.assertEqual(rows["0xabc"], "Owner")
                self.assertEqual(rows[pipeline.MFL_WALLET_ADDRESS], pipeline.MFL_WALLET_NAME)
                self.assertEqual(
                    rows[pipeline.MFL_TRADE_WALLET_ADDRESS],
                    pipeline.MFL_TRADE_WALLET_NAME,
                )
            finally:
                current.close()

    def test_player_season_skip_fails_closed_if_any_player_is_unresolved(self) -> None:
        connection = sqlite3.connect(":memory:")
        try:
            connection.execute(
                "CREATE TABLE players (player_id INTEGER PRIMARY KEY, player_seasons INTEGER)"
            )
            connection.executemany(
                "INSERT INTO players VALUES (?, ?)",
                [(1, 3), (2, None)],
            )
            with self.assertRaisesRegex(RuntimeError, "1 players are unresolved"):
                rebuild.reuse_resolved_player_seasons(connection)
            connection.execute("UPDATE players SET player_seasons = 2 WHERE player_id = 2")
            stats = rebuild.reuse_resolved_player_seasons(connection)
            self.assertEqual(stats["already_known"], 2)
            self.assertEqual(stats["still_unresolved"], 0)
        finally:
            connection.close()

    def test_club_reuse_reconciles_signed_players_and_owner_names(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            previous_path = Path(directory) / "previous.db"
            previous = sqlite3.connect(previous_path)
            clubs.ensure_club_schema(previous)
            previous.execute(
                "INSERT INTO clubs VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    "42", "Club", "Bologna", "Italy", "#111111", "#222222",
                    "FOUNDED", 2, "0xabc", "Old Owner", "[99]", "[1,7]",
                ),
            )
            previous.commit()
            previous.close()

            current = sqlite3.connect(":memory:")
            try:
                current.executescript(
                    """
                    CREATE TABLE wallets (wallet_address TEXT PRIMARY KEY, name TEXT);
                    INSERT INTO wallets VALUES ('0xabc', 'New Owner');
                    CREATE TABLE players (
                        player_id INTEGER PRIMARY KEY,
                        wallet_address TEXT,
                        wallet_name TEXT,
                        active_contract_club_id TEXT
                    );
                    INSERT INTO players VALUES (3, '0xp', 'P', '42');
                    INSERT INTO players VALUES (9, '0xp', 'P', '42');
                    """
                )
                logs: list[str] = []
                count = clubs.restore_previous_clubs(current, previous_path, logs.append)
                row = current.execute(
                    "SELECT owner_name, signed_player_ids, current_competition_ids FROM clubs WHERE club_id = '42'"
                ).fetchone()
                self.assertEqual(count, 1)
                self.assertEqual(row[0], "New Owner")
                self.assertEqual(json.loads(row[1]), [3, 9])
                self.assertEqual(json.loads(row[2]), [1, 7])
                self.assertIn("reconciled 2 signed-player links", logs[-1])
            finally:
                current.close()

    def test_club_reuse_fails_if_current_players_reference_unknown_club(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            previous_path = Path(directory) / "previous.db"
            previous = sqlite3.connect(previous_path)
            clubs.ensure_club_schema(previous)
            previous.execute(
                "INSERT INTO clubs VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                ("42", "Club", "", "", None, None, "FOUNDED", 2, "", "", "[]", "[]"),
            )
            previous.commit()
            previous.close()

            current = sqlite3.connect(":memory:")
            try:
                current.executescript(
                    """
                    CREATE TABLE wallets (wallet_address TEXT PRIMARY KEY, name TEXT);
                    CREATE TABLE players (
                        player_id INTEGER PRIMARY KEY,
                        wallet_address TEXT,
                        wallet_name TEXT,
                        active_contract_club_id TEXT
                    );
                    INSERT INTO players VALUES (1, '0xp', 'P', '99');
                    """
                )
                with self.assertRaisesRegex(RuntimeError, "99"):
                    clubs.restore_previous_clubs(current, previous_path)
            finally:
                current.close()

    def test_club_detail_progress_is_bounded_like_other_fetch_phases(self) -> None:
        logs: list[str] = []

        def request_json(url: str, label: str, limiter=None):
            return {}

        clubs.fetch_detail_owner_hints(
            [str(value) for value in range(1, 26)],
            request_json,
            log=logs.append,
        )
        progress = [line for line in logs if line.startswith("Club owner fallback detail ")]
        self.assertEqual(len(progress), 4)
        self.assertTrue(progress[0].startswith("Club owner fallback detail 1/25:"))
        self.assertTrue(progress[1].startswith("Club owner fallback detail 10/25:"))
        self.assertTrue(progress[2].startswith("Club owner fallback detail 20/25:"))
        self.assertTrue(progress[3].startswith("Club owner fallback detail 25/25:"))


if __name__ == "__main__":
    unittest.main()
''',
    encoding="utf-8",
)

print("Issue #864 migration applied")
