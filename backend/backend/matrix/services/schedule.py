"""
Schedule service — pure Python, no Django ORM calls.

is_scheduled(plan, date) → bool
date_range(start, end) → list[date]
"""
from __future__ import annotations
from datetime import date, timedelta


def date_range(start: date, end: date) -> list[date]:
    """Return every date from start to end inclusive."""
    days = (end - start).days + 1
    return [start + timedelta(days=i) for i in range(days)]


def is_scheduled(plan, check_date: date) -> bool:
    """
    Return True if `plan` is scheduled on `check_date`.
    Works with plain Plan ORM instances (accesses .schedule_type,
    .schedule_config, .start_date, .end_date).
    """
    # Must be within the plan's active window
    if check_date < plan.start_date:
        return False
    if plan.end_date and check_date > plan.end_date:
        return False

    stype = plan.schedule_type
    cfg = plan.schedule_config or {}

    if stype == "daily":
        return True

    if stype == "weekdays":
        # cfg = {"weekdays": [0, 1, 2, 3, 4]}  (0 = Monday)
        allowed = cfg.get("weekdays", [])
        return check_date.weekday() in allowed

    if stype == "every_n_days":
        interval = cfg.get("interval", 1)
        if interval < 1:
            interval = 1
        delta = (check_date - plan.start_date).days
        return delta % interval == 0

    if stype == "one_time":
        target = cfg.get("date")
        if target:
            try:
                from datetime import date as _date
                td = _date.fromisoformat(target)
                return check_date == td
            except ValueError:
                return False
        return False

    return False
