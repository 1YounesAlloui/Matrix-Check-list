"""
Insights service — rule-based smart insights, pure Python.

generate_insights(calendar_data, plan_stats) → list[dict]

calendar_data: list of day dicts from the calendar endpoint
plan_stats: list of plan stat dicts from the stats endpoint
"""
from __future__ import annotations
from collections import defaultdict
from datetime import date


WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


def generate_insights(calendar_data: list[dict], plan_stats: list[dict]) -> list[dict]:
    """Return a list of insight dicts, each with {type, message, severity}."""
    insights: list[dict] = []

    # ── Weekday performance ────────────────────────────────────────────────────
    weekday_totals: dict[int, list[int]] = defaultdict(list)
    for day in calendar_data:
        if day.get("scheduled_plans", 0) > 0 and not day.get("is_skipped"):
            wd = date.fromisoformat(day["date"]).weekday()
            weekday_totals[wd].append(day.get("percentage", 0))

    if weekday_totals:
        avg_by_day = {wd: sum(vals) / len(vals) for wd, vals in weekday_totals.items()}
        if len(avg_by_day) >= 2:
            best_wd = max(avg_by_day, key=lambda k: avg_by_day[k])
            worst_wd = min(avg_by_day, key=lambda k: avg_by_day[k])
            best_pct = round(avg_by_day[best_wd])
            worst_pct = round(avg_by_day[worst_wd])
            if best_wd != worst_wd and best_pct - worst_pct >= 20:
                insights.append({
                    "type": "weekday_pattern",
                    "message": (
                        f"You complete {best_pct}% of tasks on {WEEKDAY_NAMES[best_wd]}s "
                        f"but only {worst_pct}% on {WEEKDAY_NAMES[worst_wd]}s."
                    ),
                    "severity": "info",
                })

    # ── Streak proximity ───────────────────────────────────────────────────────
    for plan in plan_stats:
        current = plan.get("current_streak", 0)
        best = plan.get("best_streak", 0)
        gap = best - current
        if current > 0 and 0 < gap <= 5:
            insights.append({
                "type": "streak_close_to_best",
                "message": (
                    f"Your '{plan['name']}' streak is only {gap} day(s) away from your best!"
                ),
                "severity": "motivational",
            })

    # ── Low completion warning ─────────────────────────────────────────────────
    for plan in plan_stats:
        rate = plan.get("completion_rate", 100)
        if 0 < rate < 40:
            insights.append({
                "type": "low_completion",
                "message": (
                    f"'{plan['name']}' has a {rate}% completion rate. "
                    "Consider reducing tasks or adjusting the schedule."
                ),
                "severity": "warning",
            })

    # ── Perfect day encouragement ──────────────────────────────────────────────
    perfect = sum(1 for d in calendar_data if d.get("is_complete") and not d.get("is_skipped"))
    total_sched = sum(1 for d in calendar_data if d.get("scheduled_plans", 0) > 0)
    if total_sched > 0 and perfect / total_sched >= 0.8:
        insights.append({
            "type": "high_consistency",
            "message": f"Amazing! {perfect} out of {total_sched} scheduled days were perfect. Keep it up!",
            "severity": "positive",
        })

    return insights
