from __future__ import annotations

import unittest

from tests.workflow_sources import read_workflow


class FullDatabaseRefreshWorkflowTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.workflow = read_workflow(".github/workflows/full-database-refresh.yml")
        cls.restore_step = cls.workflow.split(
            "- name: Restore previous database", 1
        )[1].split("- name: Rebuild database", 1)[0]

    def test_previous_database_candidates_come_from_artifacts_not_recent_runs(self) -> None:
        self.assertIn(
            "actions/artifacts?name=mfl_database&per_page=100",
            self.restore_step,
        )
        self.assertIn("gh api --paginate", self.restore_step)
        self.assertIn("expired == false", self.restore_step)
        self.assertIn("| sort -r", self.restore_step)
        self.assertNotIn("gh run list", self.restore_step)
        self.assertNotIn("--limit 100", self.restore_step)

    def test_restore_falls_back_and_uses_canonical_validation(self) -> None:
        self.assertIn('gh run download "$RUN_ID"', self.restore_step)
        self.assertIn("trying the next candidate", self.restore_step)
        self.assertIn(
            "python -m scripts.database.prepare_runtime_database previous-database/mfl_database.db --validate-only",
            self.restore_step,
        )
        self.assertNotIn("PRAGMA table_info(players)", self.restore_step)
        self.assertNotIn("sqlite3.connect", self.restore_step)

    def test_manual_refresh_options_use_safe_defaults(self) -> None:
        defaults = {
            "fetch_progressions": "true",
            "fetch_live_competitions": "true",
            "backfill_historical_competitions": "false",
            "send_progression_emails": "true",
        }
        for option, expected_default in defaults.items():
            option_tail = self.workflow.split(f"      {option}:\n", 1)[1]
            option_block = option_tail[:350]
            self.assertIn(f"default: {expected_default}", option_block)
            self.assertIn("type: boolean", option_block)

    def test_rebuild_receives_split_competition_options(self) -> None:
        self.assertIn(
            "MFL_FETCH_PROGRESSIONS: ${{ inputs.fetch_progressions }}",
            self.workflow,
        )
        self.assertIn(
            "MFL_FETCH_LIVE_COMPETITIONS: ${{ inputs.fetch_live_competitions }}",
            self.workflow,
        )
        self.assertIn(
            "MFL_BACKFILL_HISTORICAL_COMPETITIONS: ${{ inputs.backfill_historical_competitions }}",
            self.workflow,
        )
        self.assertNotIn("      fetch_competitions:\n", self.workflow)
        self.assertNotIn("MFL_FETCH_COMPETITIONS:", self.workflow)

    def test_progression_email_requires_restored_database_and_enabled_progressions(self) -> None:
        self.assertIn(
            "inputs.send_progression_emails && inputs.fetch_progressions",
            self.workflow,
        )
        self.assertIn(
            "hashFiles('builder/previous-database/mfl_database.db') != ''",
            self.workflow,
        )

    def test_scheduler_metadata_inputs_remain_available(self) -> None:
        for option in (
            "trigger_source",
            "intended_at",
            "occurrence_key",
            "triggered_at",
        ):
            self.assertIn(f"      {option}:\n", self.workflow)


if __name__ == "__main__":
    unittest.main()
