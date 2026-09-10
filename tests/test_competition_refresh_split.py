from __future__ import annotations

import unittest

from scripts.database import competitions


class CompetitionRefreshSplitContractTests(unittest.TestCase):
    def test_current_candidates_only_include_live_competitions(self) -> None:
        payload = {
            "competitions": [
                {"id": 1, "code": "DMND", "status": "LIVE", "withXp": True},
                {"id": 2, "code": "PLAT", "status": "PLANNED", "withXp": True},
                {"id": 3, "code": "GOLD", "status": "ENDED", "withXp": True},
                {"id": 4, "code": "SLV", "status": "LIVE", "withXp": False},
                {"id": 5, "code": "P:DMND", "status": "LIVE", "withXp": True},
            ]
        }

        candidates = competitions.current_candidates(payload)

        self.assertEqual([candidate["id"] for candidate in candidates], [1])


if __name__ == "__main__":
    unittest.main()
