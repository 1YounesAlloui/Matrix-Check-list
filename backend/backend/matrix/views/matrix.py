"""
Matrix view: GitHub-style contribution grid.

GET /api/matrix/?start=YYYY-MM-DD&end=YYYY-MM-DD

Returns:
{
  "columns": ["2025-01-01", ...],
  "rows": [
    {
      "plan_id": 1,
      "plan_name": "Gym",
      "plan_color": "#FF5733",
      "tasks": [
        {
          "task_id": 5,
          "task_title": "Push-ups",
          "cells": {
            "2025-01-01": "done" | "missed" | "not_scheduled" | "skipped" | "future"
          }
        }
      ]
    }
  ]
}
"""
from __future__ import annotations
from datetime import date
from collections import defaultdict

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from matrix.models import Plan, CompletionLog, SkipDay
from matrix.services.schedule import is_scheduled, date_range


def _parse_date(value, fallback):
    try:
        return date.fromisoformat(value) if value else fallback
    except ValueError:
        return fallback


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def matrix_view(request):
    today = date.today()
    start = _parse_date(request.query_params.get("start"), today.replace(day=1))
    end = _parse_date(request.query_params.get("end"), today)

    if end < start:
        return Response({"detail": "end must be >= start."}, status=400)

    days = date_range(start, end)
    columns = [d.isoformat() for d in days]

    # Fetch plans + tasks in 2 queries
    plans = list(
        Plan.objects.filter(owner=request.user, archived=False)
        .prefetch_related("tasks")
        .order_by("order", "created_at")
    )
    all_plan_ids = [p.id for p in plans]

    # Fetch completions and skips in 2 queries
    completions = CompletionLog.objects.filter(
        user=request.user, date__range=(start, end), plan_id__in=all_plan_ids
    ).values("task_id", "plan_id", "date")

    done_set: set[tuple] = set()  # (task_id, date)
    for c in completions:
        done_set.add((c["task_id"], c["date"]))

    skips = SkipDay.objects.filter(
        user=request.user, date__range=(start, end), plan_id__in=all_plan_ids
    ).values("plan_id", "date")
    skip_set: set[tuple] = {(s["plan_id"], s["date"]) for s in skips}

    rows = []
    for plan in plans:
        tasks = list(plan.tasks.all())
        if not tasks:
            continue

        task_rows = []
        for task in tasks:
            cells: dict[str, str] = {}
            for day in days:
                day_iso = day.isoformat()
                if not is_scheduled(plan, day):
                    cells[day_iso] = "not_scheduled"
                elif (plan.id, day) in skip_set:
                    cells[day_iso] = "skipped"
                elif day > today:
                    cells[day_iso] = "future"
                elif (task.id, day) in done_set:
                    cells[day_iso] = "done"
                else:
                    cells[day_iso] = "missed"
            task_rows.append({
                "task_id": task.id,
                "task_title": task.title,
                "cells": cells,
            })

        rows.append({
            "plan_id": plan.id,
            "plan_name": plan.name,
            "plan_color": plan.color,
            "plan_icon": plan.icon,
            "tasks": task_rows,
        })

    return Response({"columns": columns, "rows": rows})
