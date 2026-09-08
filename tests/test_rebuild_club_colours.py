from __future__ import annotations

import unittest

from scripts.database import rebuild_database


class RebuildClubColoursTests(unittest.TestCase):
    def test_validated_club_contract_players_uses_merged_mapping_values(self) -> None:
        player = {
            "id": 7,
            "activeContract": {
                "club": {
                    "id": 42,
                    "mainColor": "#ABCDEF",
                    "secondaryColor": "#123456",
                }
            },
        }
        merged_players = {7: player}

        contract_players = rebuild_database.validated_club_contract_players(merged_players)

        self.assertEqual(list(contract_players), [player])

    def test_validated_club_contract_players_rejects_total_colour_loss(self) -> None:
        merged_players = {
            7: {
                "id": 7,
                "activeContract": {
                    "club": {
                        "id": 42,
                        "name": "Colourless FC",
                    }
                },
            }
        }

        with self.assertRaisesRegex(RuntimeError, "no club colours"):
            rebuild_database.validated_club_contract_players(merged_players)

    def test_validated_club_contract_players_allows_empty_dataset(self) -> None:
        self.assertEqual(
            list(rebuild_database.validated_club_contract_players({})),
            [],
        )


if __name__ == "__main__":
    unittest.main()
