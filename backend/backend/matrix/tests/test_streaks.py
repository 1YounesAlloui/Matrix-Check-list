"""Tests for the streak service."""
import unittest
from datetime import date
from matrix.services.streaks import compute_streak


class TestStreaks(unittest.TestCase):
    def _dates(self, *isos):
        return [date.fromisoformat(d) for d in isos]

    def test_empty_schedule(self):
        result = compute_streak([], set(), set())
        self.assertEqual(result["current_streak"], 0)
        self.assertEqual(result["best_streak"], 0)

    def test_simple_streak(self):
        sched = self._dates("2025-01-01", "2025-01-02", "2025-01-03")
        complete = {date(2025, 1, 1), date(2025, 1, 2), date(2025, 1, 3)}
        result = compute_streak(sched, complete, set(), today=date(2025, 1, 3))
        self.assertEqual(result["current_streak"], 3)
        self.assertEqual(result["best_streak"], 3)

    def test_streak_broken(self):
        sched = self._dates("2025-01-01", "2025-01-02", "2025-01-03", "2025-01-04")
        complete = {date(2025, 1, 1), date(2025, 1, 2), date(2025, 1, 4)}
        # Jan 3 missed — current streak is just 1 (Jan 4), best is 2
        result = compute_streak(sched, complete, set(), today=date(2025, 1, 4))
        self.assertEqual(result["current_streak"], 1)
        self.assertEqual(result["best_streak"], 2)

    def test_skip_day_does_not_break_streak(self):
        sched = self._dates("2025-01-01", "2025-01-02", "2025-01-03", "2025-01-04")
        complete = {date(2025, 1, 1), date(2025, 1, 2), date(2025, 1, 4)}
        skipped = {date(2025, 1, 3)}  # Jan 3 skipped — neutral
        result = compute_streak(sched, complete, skipped, today=date(2025, 1, 4))
        # Skip is neutral so current streak should be 3+ (1, 2, skip, 4)
        self.assertEqual(result["current_streak"], 3)

    def test_skip_only_days(self):
        sched = self._dates("2025-01-01", "2025-01-02")
        complete = set()
        skipped = {date(2025, 1, 1), date(2025, 1, 2)}
        result = compute_streak(sched, complete, skipped, today=date(2025, 1, 2))
        # All skipped → no streak increment but no break either
        self.assertEqual(result["current_streak"], 0)

    def test_best_streak_historical(self):
        sched = self._dates(
            "2025-01-01", "2025-01-02", "2025-01-03",
            "2025-01-04", "2025-01-05",
        )
        complete = {
            date(2025, 1, 1), date(2025, 1, 2), date(2025, 1, 3),
            # Gap on Jan 4
            date(2025, 1, 5),
        }
        result = compute_streak(sched, complete, set(), today=date(2025, 1, 5))
        self.assertEqual(result["best_streak"], 3)
        self.assertEqual(result["current_streak"], 1)
