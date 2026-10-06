"""Today view: plans scheduled for a given date with tasks and done state."""
from __future__ import annotations
from datetime import date
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from matrix.models import Plan, Task, CompletionLog, SkipDay
from matrix.services.schedule import is_scheduled
from matrix.services.progress import compute_plan_progress


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def today_view(request):
    """
    GET /api/today/?date=YYYY-MM-DD
    Returns scheduled plans with tasks and completion state.
    """
    date_str = request.query_params.get("date")
    try:
        target_date = date.fromisoformat(date_str) if date_str else date.today()
    except ValueError:
        return Response({"detail": "Invalid date format. Use YYYY-MM-DD."}, status=400)

    # Fetch all active plans for the user — single query
    plans = list(
        Plan.objects.filter(owner=request.user, archived=False)
        .prefetch_related("tasks")
    )
    scheduled_plans = [p for p in plans if is_scheduled(p, target_date)]

    if not scheduled_plans:
        return Response({
            "date": target_date.isoformat(),
            "plans": [],
            "overall_percentage": 0,
            "overall_complete": False,
        })

    plan_ids = [p.id for p in scheduled_plans]

    # Fetch completions and skips for this date — two queries total
    done_task_ids = set(
        CompletionLog.objects.filter(
            user=request.user, date=target_date, plan_id__in=plan_ids
        ).values_list("task_id", flat=True)
    )
    skip_plan_ids = set(
        SkipDay.objects.filter(
            user=request.user, date=target_date, plan_id__in=plan_ids
        ).values_list("plan_id", flat=True)
    )

    result_plans = []
    all_progresses = []

    for plan in scheduled_plans:
        tasks = list(plan.tasks.all())
        is_skipped = plan.id in skip_plan_ids
        progress = compute_plan_progress(
            tasks,
            done_task_ids,
            threshold=plan.completion_threshold,
        )

        task_data = [
            {
                "id": t.id,
                "title": t.title,
                "note": t.note,
                "target": t.target,
                "priority": t.priority,
                "weight": t.weight,
                "order": t.order,
                "completed": t.id in done_task_ids,
            }
            for t in tasks
        ]

        result_plans.append({
            "id": plan.id,
            "name": plan.name,
            "icon": plan.icon,
            "color": plan.color,
            "is_skipped": is_skipped,
            "tasks": task_data,
            **progress,
        })
        if not is_skipped:
            all_progresses.append(progress)

    # Overall progress across non-skipped plans
    total_weight = sum(p["total_weight"] for p in all_progresses)
    done_weight = sum(p["done_weight"] for p in all_progresses)
    overall_pct = round((done_weight / total_weight) * 100) if total_weight > 0 else 0
    overall_complete = all(p["is_complete"] for p in all_progresses) if all_progresses else False

    return Response({
        "date": target_date.isoformat(),
        "plans": result_plans,
        "overall_percentage": overall_pct,
        "overall_complete": overall_complete,
    })
