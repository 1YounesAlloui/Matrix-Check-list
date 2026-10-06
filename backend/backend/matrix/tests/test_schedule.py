"""Tests for the schedule service."""
from datetime import date
import unittest
from unittest.mock import MagicMock
from matrix.services.schedule import is_scheduled, date_range


def _plan(schedule_type, schedule_config, start="2025-01-01", end=None):
    p = MagicMock()
    p.schedule_type = schedule_type
    p.schedule_config = schedule_config
    p.start_date = date.fromisoformat(start)
    p.end_date = date.fromisoformat(end) if end else None
    return p


class TestDateRange(unittest.TestCase):
    def test_single_day(self):
        d = date(2025, 1, 15)
        self.assertEqual(date_range(d, d), [d])

    def test_range(self):
        result = date_range(date(2025, 1, 1), date(2025, 1, 3))
        self.assertEqual(len(result), 3)


class TestDailySchedule(unittest.TestCase):
    def test_daily_within_range(self):
        p = _plan("daily", {})
        self.assertTrue(is_scheduled(p, date(2025, 6, 15)))

    def test_daily_before_start(self):
        p = _plan("daily", {}, start="2025-06-01")
        self.assertFalse(is_scheduled(p, date(2025, 5, 31)))

    def test_daily_after_end(self):
        p = _plan("daily", {}, end="2025-06-30")
        self.assertFalse(is_scheduled(p, date(2025, 7, 1)))


class TestWeekdaySchedule(unittest.TestCase):
    def test_scheduled_weekday(self):
        # Mon=0, Wed=2, Fri=4
        p = _plan("weekdays", {"weekdays": [0, 2, 4]})
        monday = date(2025, 1, 6)   # Monday
        self.assertTrue(is_scheduled(p, monday))

    def test_not_scheduled_weekday(self):
        p = _plan("weekdays", {"weekdays": [0, 2, 4]})
        tuesday = date(2025, 1, 7)  # Tuesday
        self.assertFalse(is_scheduled(p, tuesday))

    def test_weekend(self):
        p = _plan("weekdays", {"weekdays": [5, 6]})  # Sat, Sun
        saturday = date(2025, 1, 4)
        self.assertTrue(is_scheduled(p, saturday))


class TestEveryNDays(unittest.TestCase):
    def test_every_2_days_on_start(self):
        p = _plan("every_n_days", {"interval": 2}, start="2025-01-01")
        self.assertTrue(is_scheduled(p, date(2025, 1, 1)))

    def test_every_2_days_on_day_2(self):
        p = _plan("every_n_days", {"interval": 2}, start="2025-01-01")
        self.assertFalse(is_scheduled(p, date(2025, 1, 2)))

    def test_every_2_days_on_day_3(self):
        p = _plan("every_n_days", {"interval": 2}, start="2025-01-01")
        self.assertTrue(is_scheduled(p, date(2025, 1, 3)))

    def test_every_3_days(self):
        p = _plan("every_n_days", {"interval": 3}, start="2025-01-01")
        self.assertTrue(is_scheduled(p, date(2025, 1, 4)))
        self.assertFalse(is_scheduled(p, date(2025, 1, 5)))


class TestOneTime(unittest.TestCase):
    def test_on_target_date(self):
        p = _plan("one_time", {"date": "2025-06-15"})
        self.assertTrue(is_scheduled(p, date(2025, 6, 15)))

    def test_not_on_other_date(self):
        p = _plan("one_time", {"date": "2025-06-15"})
        self.assertFalse(is_scheduled(p, date(2025, 6, 16)))
