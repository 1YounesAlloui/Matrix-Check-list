"""
Calendar endpoint: one entry per day with aggregated progress.

GET /api/calendar/?start=YYYY-MM-DD&end=YYYY-MM-DD&plan=<id>

Returns a list of day objects, fetching completions and skips in
a constant number of queries regardless of date range size.
"""
from __future__ import annotations
from datetime import date
from collections import defaultdict

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from matrix.models import Plan, Task, CompletionLog, SkipDay, DayNote
from matrix.services.schedule import is_scheduled, date_range
from matrix.services.progress import compute_plan_progress, compute_overall_progress


def _parse_date(value: str | None, fallback: date) -> date:
    try:
        return date.fromisoformat(value) if value else fallback
    except ValueError:
        return fallback


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def calendar_view(request):
    today = date.today()
    start = _parse_date(request.query_params.get("start"), today.replace(day=1))
    end = _parse_date(request.query_params.get("end"), today)
    plan_filter = request.query_params.get("plan")

    if end < start:
        return Response({"detail": "end must be >= start."}, status=400)

    days = date_range(start, end)

    # ── Fetch data in a small number of queries ─────────────────────────────
    plans_qs = Plan.objects.filter(owner=request.user, archived=False).prefetch_related("tasks")
    if plan_filter:
        plans_qs = plans_qs.filter(id=plan_filter)
    all_plans = list(plans_qs)
    all_plan_ids = [p.id for p in all_plans]

    # One query for all completions in range
    completions = CompletionLog.objects.filter(
        user=request.user, date__range=(start, end), plan_id__in=all_plan_ids
    ).values("task_id", "plan_id", "date")

    # Group by (plan_id, date) → set of task_ids
    completed_by_plan_date: dict[tuple, set] = defaultdict(set)
    for c in completions:
        completed_by_plan_date[(c["plan_id"], c["date"])].add(c["task_id"])

    # One query for all skips in range
    skips = SkipDay.objects.filter(
        user=request.user, date__range=(start, end), plan_id__in=all_plan_ids
    ).values("plan_id", "date")
    skipped_set: set[tuple] = {(s["plan_id"], s["date"]) for s in skips}

    # One query for day notes
    notes = DayNote.objects.filter(
        user=request.user, date__range=(start, end)
    ).values("date", "mood", "text")
    notes_by_date: dict[date, dict] = {n["date"]: n for n in notes}

    # ── Build response ──────────────────────────────────────────────────────
    result = []
    for day in days:
        scheduled = [p for p in all_plans if is_scheduled(p, day)]
        note_info = notes_by_date.get(day, {})

        if not scheduled:
            result.append({
                "date": day.isoformat(),
                "is_today": day == today,
                "is_future": day > today,
                "scheduled_plans_count": 0,
                "completed_plans_count": 0,
                "total_tasks": 0,
                "completed_tasks": 0,
                "completion_percentage": 0,
                "is_perfect": False,
                "is_skipped": False,
                "has_note": day in notes_by_date,
                "mood": note_info.get("mood"),
            })
            continue

        plan_progresses = []
        completed_plan_count = 0
        is_all_skipped = True
        for plan in scheduled:
            is_skip = (plan.id, day) in skipped_set
            if not is_skip:
                is_all_skipped = False
            done_ids = completed_by_plan_date.get((plan.id, day), set())
            progress = compute_plan_progress(
                list(plan.tasks.all()), done_ids, plan.completion_threshold
            )
            if not is_skip:
                plan_progresses.append(progress)
                if progress["is_complete"]:
                    completed_plan_count += 1

        overall = compute_overall_progress(plan_progresses) if plan_progresses else {
            "total_tasks": 0, "completed_tasks": 0, "percentage": 0, "is_complete": False
        }

        result.append({
            "date": day.isoformat(),
            "is_today": day == today,
            "is_future": day > today,
            "scheduled_plans_count": len(scheduled),
            "completed_plans_count": completed_plan_count,
            "total_tasks": overall["total_tasks"],
            "completed_tasks": overall["completed_tasks"],
            "completion_percentage": overall["percentage"],
            "is_perfect": overall["is_complete"] and not is_all_skipped,
            "is_skipped": is_all_skipped,
            "has_note": day in notes_by_date,
            "mood": note_info.get("mood"),
        })

    # ── Compute summary stats ───────────────────────────────────────────────
    scheduled_days = [d for d in result if d["scheduled_plans_count"] > 0]
    perfect_days = sum(1 for d in scheduled_days if d["is_perfect"])
    avg_completion = (
        round(sum(d["completion_percentage"] for d in scheduled_days) / len(scheduled_days))
        if scheduled_days else 0
    )

    # Streak: consecutive days up to today where is_perfect (from most recent going back)
    past_scheduled = [d for d in scheduled_days if not d["is_future"]]
    past_scheduled.sort(key=lambda d: d["date"], reverse=True)
    current_streak = 0
    for d in past_scheduled:
        if d["is_perfect"]:
            current_streak += 1
        else:
            break

    best_streak = 0
    run = 0
    for d in sorted(scheduled_days, key=lambda d: d["date"]):
        if d["is_perfect"]:
            run += 1
            best_streak = max(best_streak, run)
        else:
            run = 0

    return Response({
        "days": result,
        "summary": {
            "total_days": len(days),
            "scheduled_days": len(scheduled_days),
            "perfect_days": perfect_days,
            "average_completion": avg_completion,
            "current_streak": current_streak,
            "best_streak": best_streak,
        },
    })
