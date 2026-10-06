"""Export and import full JSON backup."""
from __future__ import annotations
from datetime import date, datetime
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from matrix.models import Plan, Task, CompletionLog, SkipDay, DayNote


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def export_data(request):
    """Full JSON export of the user's data."""
    user = request.user
    plans = list(Plan.objects.filter(owner=user).prefetch_related("tasks"))

    def serialize_plan(p):
        return {
            "id": p.id,
            "name": p.name,
            "description": p.description,
            "icon": p.icon,
            "color": p.color,
            "schedule_type": p.schedule_type,
            "schedule_config": p.schedule_config,
            "start_date": p.start_date.isoformat(),
            "end_date": p.end_date.isoformat() if p.end_date else None,
            "reminder_time": p.reminder_time.isoformat() if p.reminder_time else None,
            "completion_threshold": p.completion_threshold,
            "archived": p.archived,
            "order": p.order,
            "tasks": [
                {
                    "id": t.id,
                    "title": t.title,
                    "note": t.note,
                    "target": t.target,
                    "priority": t.priority,
                    "weight": t.weight,
                    "order": t.order,
                }
                for t in p.tasks.all()
            ],
        }

    completions = CompletionLog.objects.filter(user=user).values(
        "task_id", "plan_id", "date"
    )
    skips = SkipDay.objects.filter(user=user).values("plan_id", "date", "reason")
    notes = DayNote.objects.filter(user=user).values("date", "mood", "text")

    return Response({
        "exported_at": datetime.utcnow().isoformat() + "Z",
        "username": user.username,
        "plans": [serialize_plan(p) for p in plans],
        "completions": [
            {"task_id": c["task_id"], "plan_id": c["plan_id"], "date": c["date"].isoformat()}
            for c in completions
        ],
        "skips": [
            {"plan_id": s["plan_id"], "date": s["date"].isoformat(), "reason": s["reason"]}
            for s in skips
        ],
        "notes": [
            {"date": n["date"].isoformat(), "mood": n["mood"], "text": n["text"]}
            for n in notes
        ],
    })


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def import_data(request):
    """
    Import a previously exported JSON payload.
    Creates plans and tasks; skips completions/skips that already exist.
    """
    data = request.data
    user = request.user
    plan_id_map: dict[int, int] = {}  # old_id → new_id
    task_id_map: dict[int, int] = {}  # old_id → new_id

    for plan_data in data.get("plans", []):
        old_id = plan_data.pop("id", None)
        tasks_data = plan_data.pop("tasks", [])

        plan = Plan.objects.create(
            owner=user,
            name=plan_data.get("name", "Imported Plan"),
            description=plan_data.get("description", ""),
            icon=plan_data.get("icon", "check-circle"),
            color=plan_data.get("color", "#6C63FF"),
            schedule_type=plan_data.get("schedule_type", "daily"),
            schedule_config=plan_data.get("schedule_config", {}),
            start_date=plan_data.get("start_date", date.today().isoformat()),
            end_date=plan_data.get("end_date"),
            reminder_time=plan_data.get("reminder_time"),
            completion_threshold=plan_data.get("completion_threshold", 100),
            archived=plan_data.get("archived", False),
            order=plan_data.get("order", 0),
        )
        if old_id:
            plan_id_map[old_id] = plan.id

        for t in tasks_data:
            old_tid = t.pop("id", None)
            task = Task.objects.create(
                plan=plan,
                title=t.get("title", ""),
                note=t.get("note", ""),
                target=t.get("target", ""),
                priority=t.get("priority", "normal"),
                weight=t.get("weight", 1),
                order=t.get("order", 0),
            )
            if old_tid:
                task_id_map[old_tid] = task.id

    # Import completions
    created_completions = 0
    for c in data.get("completions", []):
        new_task_id = task_id_map.get(c.get("task_id"))
        new_plan_id = plan_id_map.get(c.get("plan_id"))
        if new_task_id and new_plan_id:
            try:
                CompletionLog.objects.get_or_create(
                    task_id=new_task_id,
                    date=c["date"],
                    defaults={"plan_id": new_plan_id, "user": user},
                )
                created_completions += 1
            except Exception:
                pass

    return Response({
        "detail": "Import complete.",
        "plans_created": len(plan_id_map),
        "completions_imported": created_completions,
    }, status=status.HTTP_201_CREATED)
