"""
Stats view: completion rate, streaks, weekday analysis, plan comparison.

GET /api/stats/summary/?start=YYYY-MM-DD&end=YYYY-MM-DD&plan=<id>
"""
from __future__ import annotations
from datetime import date
from collections import defaultdict

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from matrix.models import Plan, CompletionLog, SkipDay
from matrix.services.schedule import is_scheduled, date_range
from matrix.services.progress import compute_plan_progress
from matrix.services.streaks import compute_streak


def _parse_date(value, fallback):
    try:
        return date.fromisoformat(value) if value else fallback
    except ValueError:
        return fallback


WEEKDAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def stats_summary(request):
    today = date.today()
    # Default: last 30 days
    start = _parse_date(request.query_params.get("start"), today.replace(day=1))
    end = _parse_date(request.query_params.get("end"), today)
    plan_filter = request.query_params.get("plan")

    days = date_range(start, end)
    past_days = [d for d in days if d <= today]

    plans_qs = Plan.objects.filter(owner=request.user, archived=False).prefetch_related("tasks")
    if plan_filter:
        plans_qs = plans_qs.filter(id=plan_filter)
    all_plans = list(plans_qs)
    all_plan_ids = [p.id for p in all_plans]

    # Bulk fetch completions and skips
    completions = list(CompletionLog.objects.filter(
        user=request.user, date__range=(start, end), plan_id__in=all_plan_ids
    ).values("task_id", "plan_id", "date"))

    completed_by_plan_date: dict[tuple, set] = defaultdict(set)
    for c in completions:
        completed_by_plan_date[(c["plan_id"], c["date"])].add(c["task_id"])

    skips = list(SkipDay.objects.filter(
        user=request.user, date__range=(start, end), plan_id__in=all_plan_ids
    ).values("plan_id", "date"))
    skip_set: set[tuple] = {(s["plan_id"], s["date"]) for s in skips}

    # ── Per-plan stats ─────────────────────────────────────────────────────────
    plan_stats = []
    for plan in all_plans:
        tasks = list(plan.tasks.all())
        scheduled = [d for d in days if is_scheduled(plan, d)]
        past_scheduled = [d for d in scheduled if d <= today]

        complete_dates: set[date] = set()
        for d in past_scheduled:
            done_ids = completed_by_plan_date.get((plan.id, d), set())
            progress = compute_plan_progress(tasks, done_ids, plan.completion_threshold)
            if progress["is_complete"]:
                complete_dates.add(d)

        skip_dates_plan = {s[1] for s in skip_set if s[0] == plan.id}
        streak_info = compute_streak(past_scheduled, complete_dates, skip_dates_plan)

        n_sched = len([d for d in past_scheduled if d not in skip_dates_plan])
        completion_rate = round((len(complete_dates) / n_sched) * 100) if n_sched > 0 else 0

        plan_stats.append({
            "id": plan.id,
            "name": plan.name,
            "color": plan.color,
            "icon": plan.icon,
            "completion_rate": completion_rate,
            "perfect_days": len(complete_dates),
            "current_streak": streak_info["current_streak"],
            "best_streak": streak_info["best_streak"],
            "total_completed": sum(
                len(completed_by_plan_date.get((plan.id, d), set()))
                for d in past_days
            ),
        })

    # ── Overall / weekday breakdown ────────────────────────────────────────────
    weekday_data: dict[int, list[int]] = defaultdict(list)
    perfect_days = 0
    for d in past_days:
        scheduled_plans_day = [p for p in all_plans if is_scheduled(p, d)]
        if not scheduled_plans_day:
            continue
        day_progresses = []
        for plan in scheduled_plans_day:
            if (plan.id, d) in skip_set:
                continue
            done_ids = completed_by_plan_date.get((plan.id, d), set())
            prog = compute_plan_progress(list(plan.tasks.all()), done_ids, plan.completion_threshold)
            day_progresses.append(prog)
        if not day_progresses:
            continue
        total_w = sum(p["total_weight"] for p in day_progresses)
        done_w = sum(p["done_weight"] for p in day_progresses)
        pct = round((done_w / total_w) * 100) if total_w > 0 else 0
        weekday_data[d.weekday()].append(pct)
        if all(p["is_complete"] for p in day_progresses):
            perfect_days += 1

    completion_by_weekday = {
        WEEKDAY_NAMES[wd]: round(sum(vals) / len(vals)) if vals else 0
        for wd, vals in weekday_data.items()
    }

    # Global totals
    total_completed = sum(p["total_completed"] for p in plan_stats)
    all_rates = [p["completion_rate"] for p in plan_stats if p["completion_rate"] is not None]
    overall_rate = round(sum(all_rates) / len(all_rates)) if all_rates else 0

    return Response({
        "start": start.isoformat(),
        "end": end.isoformat(),
        "overall_completion_rate": overall_rate,
        "perfect_days": perfect_days,
        "total_completed": total_completed,
        "completion_by_weekday": completion_by_weekday,
        "plans": plan_stats,
    })
