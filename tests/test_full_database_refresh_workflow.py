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

    def test_manual_fetch_options_default_to_enabled(self) -> None:
        for option in (
            "fetch_progressions",
            "fetch_competitions",
            "send_progression_emails",
        ):
            option_tail = self.workflow.split(f"      {option}:\n", 1)[1]
            option_block = option_tail[:300]
            self.assertIn("default: true", option_block)
            self.assertIn("type: boolean", option_block)

    def test_rebuild_receives_fetch_options(self) -> None:
        self.assertIn(
            "MFL_FETCH_PROGRESSIONS: ${{ inputs.fetch_progressions }}",
            self.workflow,
        )
        self.assertIn(
            "MFL_FETCH_COMPETITIONS: ${{ inputs.fetch_competitions }}",
            self.workflow,
        )

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
