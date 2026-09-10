from pathlib import Path
import subprocess

competitions_path = Path("scripts/database/competitions.py")
tests_path = Path("tests/test_competition_data.py")
workflow_path = Path(".github/workflows/competition-progress-logging-migration.yml")
script_path = Path(".github/scripts/apply-competition-progress-logging.py")

source = competitions_path.read_text(encoding="utf-8")

old_fetch = '''def _fetch_details(
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
'''
new_fetch = '''def _fetch_details(
    candidates: list[dict[str, Any]],
    request_json: RequestJson,
    limiter: Any,
    *,
    log: Log | None = None,
    progress_label: str = "Competition detail",
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

    total = len(candidates)
    completed = 0
    results: list[tuple[dict[str, Any], Any]] = []
    with ThreadPoolExecutor(max_workers=min(DETAIL_WORKERS, total)) as executor:
        futures = [executor.submit(fetch, candidate) for candidate in candidates]
        for future in as_completed(futures):
            results.append(future.result())
            completed += 1
            if log is not None and (
                total <= 10 or completed == 1 or completed == total or completed % 10 == 0
            ):
                log(f"{progress_label}: {completed}/{total}")
    return results
'''
assert source.count(old_fetch) == 1, "unexpected _fetch_details owner"
source = source.replace(old_fetch, new_fetch)

old_index_live = '''    # Both live refresh and historical backfill can use this one index request. Historical
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
'''
new_index_live = '''    # Both live refresh and historical backfill can use this one index request. Historical
    # mode uses it only to resolve the current season boundary when needed.
    if fetch_live or backfill_historical:
        log("Competition current index: requesting")
        current_payload = request_json(
            CURRENT_COMPETITIONS_URL,
            "Current competitions",
            limiter,
        )
        log(f"Competition current index loaded: {len(_competition_list(current_payload))} entries")

    if fetch_live:
        live_candidates = current_candidates(current_payload)
        log(f"Competition LIVE candidates: {len(live_candidates)}")
        live_details = _fetch_details(
            live_candidates,
            request_json,
            limiter,
            log=log,
            progress_label="Competition LIVE detail",
        )
        live_saved, live_seasons = _persist_details(connection, live_details, log)
    else:
        log("Competition LIVE refresh disabled")
'''
assert source.count(old_index_live) == 1, "unexpected current/live competition block"
source = source.replace(old_index_live, new_index_live)

old_history = '''        already_stored = storage.stored_competition_ids(connection)
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
'''
new_history = '''        already_stored = storage.stored_competition_ids(connection)
        total_seasons = current_season_id - storage.FIRST_SEASON_ID + 1
        log(
            "Competition historical backfill: "
            f"{total_seasons} seasons from seasonId {storage.FIRST_SEASON_ID} "
            f"to {current_season_id}; already stored {len(already_stored)} competitions"
        )
        for season_index, season_id in enumerate(
            range(storage.FIRST_SEASON_ID, current_season_id + 1),
            start=1,
        ):
            progress_prefix = (
                f"Competition historical season {season_index}/{total_seasons} "
                f"(seasonId {season_id})"
            )
            log(f"{progress_prefix}: requesting history")
            payload = _season_history(season_id, request_json, limiter)
            candidates = discover_season_candidates(payload, season_id)
            historical_discovered += len(candidates)
            missing = [
                candidate
                for candidate in candidates
                if candidate["id"] not in already_stored
            ]
            log(
                f"{progress_prefix}: discovered {len(candidates)}, "
                f"missing {len(missing)}"
            )
            if not missing:
                continue
            historical_requested += len(missing)
            details = _fetch_details(
                missing,
                request_json,
                limiter,
                log=log,
                progress_label=f"Competition season {season_id} detail",
            )
            saved, _ = _persist_details(connection, details, log)
            historical_saved += saved
            already_stored.update(
                candidate["id"]
                for candidate, detail in details
                if storage.is_eligible_detail(detail)
            )
            log(
                f"{progress_prefix} complete: requested {len(missing)}, saved {saved}; "
                f"cumulative saved {historical_saved}/{historical_requested}"
            )
    else:
        log("Competition historical backfill disabled")

    total = int(connection.execute("SELECT COUNT(*) FROM competitions").fetchone()[0])
'''
assert source.count(old_history) == 1, "unexpected historical competition block"
source = source.replace(old_history, new_history)
competitions_path.write_text(source, encoding="utf-8")

tests = tests_path.read_text(encoding="utf-8")
marker = '''\n\nif __name__ == "__main__":\n    unittest.main()\n'''
addition = '''\n\nclass CompetitionProgressLoggingTests(unittest.TestCase):
    def test_detail_fetch_reports_bounded_progress(self) -> None:
        candidates = [{"id": competition_id} for competition_id in range(1, 13)]
        logs: list[str] = []

        details = competitions._fetch_details(
            candidates,
            lambda _url, label, _limiter: {"id": int(label.rsplit(" ", 1)[1])},
            None,
            log=logs.append,
            progress_label="Competition season 11 detail",
        )

        self.assertEqual(len(details), 12)
        self.assertEqual(
            logs,
            [
                "Competition season 11 detail: 1/12",
                "Competition season 11 detail: 10/12",
                "Competition season 11 detail: 12/12",
            ],
        )
'''
assert tests.count(marker) == 1, "unexpected competition test footer"
tests = tests.replace(marker, addition + marker)
tests_path.write_text(tests, encoding="utf-8")

subprocess.run(["python", "-m", "unittest", "tests.test_competition_data"], check=True)
subprocess.run(["python", "-m", "py_compile", str(competitions_path), str(tests_path)], check=True)

script_path.unlink()
workflow_path.unlink()
subprocess.run(["git", "config", "user.name", "github-actions[bot]"], check=True)
subprocess.run(["git", "config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com"], check=True)
subprocess.run(["git", "add", "scripts/database/competitions.py", "tests/test_competition_data.py", str(script_path), str(workflow_path)], check=True)
subprocess.run(["git", "commit", "-m", "Add competition refresh progress logging"], check=True)
subprocess.run(["git", "push", "origin", "HEAD"], check=True)
