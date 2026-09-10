from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file_path = Path(path)
    content = file_path.read_text(encoding="utf-8")
    if content.count(old) != 1:
        raise RuntimeError(f"Expected exactly one match in {path}, found {content.count(old)}")
    file_path.write_text(content.replace(old, new, 1), encoding="utf-8")


replace_once(
    "scripts/database/competitions.py",
    '''def _has_unique_in_range_league_ordinals(
    candidates: list[dict[str, Any]],
    capacity: int,
) -> bool:
    """Recognize one league generation even when API competition IDs contain gaps."""
    ordinals = [_league_ordinal(candidate) for candidate in candidates]
    return (
        bool(ordinals)
        and all(ordinal is not None for ordinal in ordinals)
        and len(set(ordinals)) == len(ordinals)
        and min(ordinals) >= 1
        and max(ordinals) <= capacity
    )
''',
    '''def _ordinal_generations(
    candidates: list[dict[str, Any]],
) -> list[list[dict[str, Any]]] | None:
    """Split recreated leagues on League N resets while tolerating competition-ID gaps."""
    ordered = sorted(candidates, key=lambda item: item["id"])
    ordinals = [_league_ordinal(candidate) for candidate in ordered]
    if not ordered or any(ordinal is None for ordinal in ordinals):
        return None

    generations: list[list[dict[str, Any]]] = []
    previous_ordinal: int | None = None
    for candidate, ordinal in zip(ordered, ordinals, strict=True):
        assert ordinal is not None
        if previous_ordinal is None or ordinal <= previous_ordinal:
            generations.append([])
        generations[-1].append(candidate)
        previous_ordinal = ordinal
    return generations
''',
)

replace_once(
    "scripts/database/competitions.py",
    '''    root_name = str(root.get("name") or root.get("id") or "unknown root")
    if _has_unique_in_range_league_ordinals(league_candidates, capacity):
        # MFL can allocate a later competition ID to a league slot in the same season.
        # Unique League 1..N names prove these entries are one logical generation even
        # when their IDs are not contiguous (Season 7 Flint has League 46 at a later ID).
        selected_generation = league_candidates
    else:
        generations = _contiguous_generations(league_candidates)
        winner_generations = [
            generation
            for generation in generations
            if any(item["has_winner"] for item in generation)
        ]
        if len(winner_generations) > 1:
            raise RuntimeError(
                f"{root_name} has winner-bearing competitions across multiple recreated generations"
            )
        selected_generation = winner_generations[0] if winner_generations else generations[-1]
''',
    '''    root_name = str(root.get("name") or root.get("id") or "unknown root")
    ordinal_generations = _ordinal_generations(league_candidates)
    if ordinal_generations is not None:
        max_ordinal = max(_league_ordinal(item) or 0 for item in league_candidates)
        if max_ordinal > capacity:
            raise RuntimeError(
                f"{root_name} has League {max_ordinal}, above the expected maximum of {capacity}"
            )
        # MFL can allocate later competition IDs to slots in the same league generation.
        # A recreated generation restarts the League N sequence; an ID gap by itself does
        # not. This keeps Season 7 Flint League 46 and Season 13 Flint Leagues 96-99 with
        # their preceding logical generations while still separating true recreations.
        generations = ordinal_generations
    else:
        generations = _contiguous_generations(league_candidates)

    winner_generations = [
        generation
        for generation in generations
        if any(item["has_winner"] for item in generation)
    ]
    if len(winner_generations) > 1:
        raise RuntimeError(
            f"{root_name} has winner-bearing competitions across multiple recreated generations"
        )
    selected_generation = winner_generations[0] if winner_generations else generations[-1]
''',
)

replace_once(
    "tests/test_competition_data.py",
    '''    def test_unique_named_league_slots_can_span_noncontiguous_ids(self) -> None:
        root = {
            "id": 248,
            "name": "Flint Division",
            "division": 10,
            "competitions": [
                {"id": 5433, "name": "Flint – League  1", "type": "LEAGUE", "code": "FLT", "winner": {"club": {"id": 1}}},
                {"id": 5434, "name": "Flint – League  2", "type": "LEAGUE", "code": "FLT", "winner": {"club": {"id": 2}}},
                {"id": 5669, "name": "Flint – League  46", "type": "LEAGUE", "code": "FLT", "winner": {"club": {"id": 46}}},
            ],
        }
        selected = competitions.select_root_competitions(root)
        self.assertEqual([item["id"] for item in selected], [5433, 5434, 5669])
''',
    '''    def test_unique_named_league_slots_can_span_noncontiguous_ids(self) -> None:
        root = {
            "id": 248,
            "name": "Flint Division",
            "division": 10,
            "competitions": [
                {
                    "id": 5432 + ordinal,
                    "name": f"Flint – League {ordinal}",
                    "type": "LEAGUE",
                    "code": "FLT",
                    "winner": {"club": {"id": ordinal}},
                }
                for ordinal in range(1, 46)
            ]
            + [
                {
                    "id": 5669,
                    "name": "Flint – League 46",
                    "type": "LEAGUE",
                    "code": "FLT",
                    "winner": {"club": {"id": 46}},
                }
            ],
        }
        selected = competitions.select_root_competitions(root)
        self.assertEqual(len(selected), 46)
        self.assertEqual([item["id"] for item in selected][-2:], [5477, 5669])

    def test_ordinal_reset_separates_recreation_but_later_ids_stay_in_winning_generation(self) -> None:
        obsolete = [
            {
                "id": 13182 + ordinal,
                "name": f"Flint – League {ordinal}",
                "type": "LEAGUE",
                "code": "FLT",
            }
            for ordinal in range(1, 94)
        ]
        winning = [
            {
                "id": 13733 + ordinal,
                "name": f"Flint – League {ordinal}",
                "type": "LEAGUE",
                "code": "FLT",
                "winner": {"club": {"id": ordinal}},
            }
            for ordinal in range(1, 96)
        ] + [
            {
                "id": 13946 + ordinal,
                "name": f"Flint – League {ordinal}",
                "type": "LEAGUE",
                "code": "FLT",
                "winner": {"club": {"id": ordinal}},
            }
            for ordinal in range(96, 100)
        ]
        root = {
            "id": 429,
            "name": "Flint Division",
            "division": 10,
            "competitions": obsolete + winning,
        }

        selected = competitions.select_root_competitions(root)

        self.assertEqual(len(selected), 99)
        self.assertEqual(selected[0]["id"], 13734)
        self.assertEqual(selected[-1]["id"], 14045)
        self.assertTrue(all(item["has_winner"] for item in selected))
''',
)
