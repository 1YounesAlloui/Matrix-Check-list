"""
Streak service — pure Python, no ORM calls.

compute_streak(scheduled_dates, complete_dates, skip_dates) → dict
  Returns {current_streak, best_streak} where:
  - skipped days do NOT break a streak
  - future dates are excluded
"""
from __future__ import annotations
from datetime import date


def compute_streak(
    scheduled_dates: list[date],
    complete_dates: set[date],
    skip_dates: set[date],
    today: date | None = None,
) -> dict:
    """
    Compute current and best streak for one plan.

    Parameters
    ----------
    scheduled_dates : list[date]
        Sorted list of dates on which the plan was/is scheduled.
    complete_dates : set[date]
        Dates on which the plan was completed (percentage >= threshold).
    skip_dates : set[date]
        Dates that were explicitly skipped (rest days, travel, etc.).
    today : date
        Reference point for "current". Defaults to date.today().
    """
    today = today or date.today()

    # Only consider past-or-today scheduled dates that are not in the future
    past = sorted(d for d in scheduled_dates if d <= today)

    if not past:
        return {"current_streak": 0, "best_streak": 0}

    best = 0
    current_run = 0

    for d in past:
        if d in skip_dates:
            # Skipped day: treat as neutral — do not break, do not increment
            continue
        if d in complete_dates:
            current_run += 1
            best = max(best, current_run)
        else:
            current_run = 0

    # Walk backward from today to find the CURRENT streak
    # (must be unbroken up to the most recent actionable day)
    current_streak = 0
    for d in reversed(past):
        if d in skip_dates:
            continue
        if d in complete_dates:
            current_streak += 1
        else:
            break

    return {"current_streak": current_streak, "best_streak": best}
