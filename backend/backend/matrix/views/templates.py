"""
Built-in plan templates.

GET  /api/templates/           → list available templates
POST /api/templates/{key}/apply/ → create plan + tasks from template
"""
from __future__ import annotations
from datetime import date
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from matrix.models import Plan, Task
from matrix.serializers import PlanSerializer


TEMPLATES: dict[str, dict] = {
    "gym": {
        "name": "Gym",
        "description": "Classic gym workout tracker",
        "icon": "dumbbell",
        "color": "#FF5733",
        "schedule_type": "weekdays",
        "schedule_config": {"weekdays": [0, 2, 4]},  # Mon, Wed, Fri
        "completion_threshold": 80,
        "tasks": [
            {"title": "Warm-up (10 min)", "weight": 1, "priority": "normal"},
            {"title": "Compound lifts", "weight": 3, "target": "3 sets", "priority": "high"},
            {"title": "Accessory work", "weight": 2, "target": "2 sets", "priority": "normal"},
            {"title": "Cool-down / stretch", "weight": 1, "priority": "low"},
        ],
    },
    "study": {
        "name": "Study",
        "description": "Daily study session",
        "icon": "book-open",
        "color": "#3A7BFF",
        "schedule_type": "daily",
        "schedule_config": {},
        "completion_threshold": 100,
        "tasks": [
            {"title": "Review yesterday's notes", "weight": 1, "priority": "normal"},
            {"title": "Main study block", "weight": 3, "target": "2 hours", "priority": "high"},
            {"title": "Practice problems", "weight": 2, "priority": "high"},
            {"title": "Summarize key points", "weight": 1, "priority": "normal"},
        ],
    },
    "morning_routine": {
        "name": "Morning Routine",
        "description": "Start the day right",
        "icon": "sun",
        "color": "#F59E0B",
        "schedule_type": "daily",
        "schedule_config": {},
        "completion_threshold": 80,
        "tasks": [
            {"title": "Make bed", "weight": 1, "priority": "low"},
            {"title": "Drink water (500 ml)", "weight": 1, "priority": "normal"},
            {"title": "Exercise / walk", "weight": 2, "target": "20 min", "priority": "high"},
            {"title": "Cold shower", "weight": 1, "priority": "normal"},
            {"title": "Journal / plan day", "weight": 1, "priority": "normal"},
            {"title": "Healthy breakfast", "weight": 1, "priority": "normal"},
        ],
    },
    "deep_work": {
        "name": "Deep Work",
        "description": "Focused work sessions",
        "icon": "zap",
        "color": "#7C3AED",
        "schedule_type": "weekdays",
        "schedule_config": {"weekdays": [0, 1, 2, 3, 4]},
        "completion_threshold": 100,
        "tasks": [
            {"title": "Block distractions", "weight": 1, "priority": "high"},
            {"title": "Deep work block 1", "weight": 3, "target": "90 min", "priority": "high"},
            {"title": "Break", "weight": 1, "target": "15 min", "priority": "normal"},
            {"title": "Deep work block 2", "weight": 3, "target": "90 min", "priority": "high"},
            {"title": "Review & next-day prep", "weight": 1, "priority": "normal"},
        ],
    },
    "reading": {
        "name": "Reading",
        "description": "Daily reading habit",
        "icon": "book",
        "color": "#059669",
        "schedule_type": "daily",
        "schedule_config": {},
        "completion_threshold": 100,
        "tasks": [
            {"title": "Read", "weight": 1, "target": "30 pages", "priority": "normal"},
            {"title": "Take notes", "weight": 1, "priority": "normal"},
        ],
    },
    "ramadan": {
        "name": "Ramadan Tracker",
        "description": "Ramadan worship and goals",
        "icon": "moon",
        "color": "#0EA5E9",
        "schedule_type": "daily",
        "schedule_config": {},
        "completion_threshold": 80,
        "tasks": [
            {"title": "Fajr prayer on time", "weight": 2, "priority": "high"},
            {"title": "Quran recitation", "weight": 2, "target": "1 juz", "priority": "high"},
            {"title": "Afternoon prayer on time", "weight": 2, "priority": "high"},
            {"title": "Maghrib prayer on time", "weight": 2, "priority": "high"},
            {"title": "Isha & Tarawih", "weight": 2, "priority": "high"},
            {"title": "Suhoor meal", "weight": 1, "priority": "normal"},
            {"title": "Charity / good deed", "weight": 1, "priority": "normal"},
        ],
    },
    "weekly_cleaning": {
        "name": "Weekly Cleaning",
        "description": "Keep the home tidy",
        "icon": "home",
        "color": "#EC4899",
        "schedule_type": "weekdays",
        "schedule_config": {"weekdays": [5]},  # Saturday
        "completion_threshold": 80,
        "tasks": [
            {"title": "Vacuum / sweep floors", "weight": 2, "priority": "high"},
            {"title": "Mop", "weight": 1, "priority": "normal"},
            {"title": "Clean bathrooms", "weight": 2, "priority": "high"},
            {"title": "Wipe kitchen surfaces", "weight": 2, "priority": "high"},
            {"title": "Laundry", "weight": 1, "priority": "normal"},
            {"title": "Take out trash", "weight": 1, "priority": "normal"},
        ],
    },
}


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def template_list(request):
    result = [
        {
            "key": key,
            "name": t["name"],
            "description": t["description"],
            "icon": t["icon"],
            "color": t["color"],
            "schedule_type": t.get("schedule_type", "daily"),
            "schedule_config": t.get("schedule_config", {}),
            "completion_threshold": t.get("completion_threshold", 100),
            "task_count": len(t.get("tasks", [])),
            "tasks": t.get("tasks", []),
        }
        for key, t in TEMPLATES.items()
    ]
    return Response(result)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def template_apply(request, key):
    tmpl = TEMPLATES.get(key)
    if not tmpl:
        return Response({"detail": "Template not found."}, status=status.HTTP_404_NOT_FOUND)

    plan = Plan.objects.create(
        owner=request.user,
        name=tmpl["name"],
        description=tmpl["description"],
        icon=tmpl["icon"],
        color=tmpl["color"],
        schedule_type=tmpl["schedule_type"],
        schedule_config=tmpl["schedule_config"],
        start_date=date.today(),
        completion_threshold=tmpl["completion_threshold"],
    )
    for i, t in enumerate(tmpl["tasks"]):
        Task.objects.create(
            plan=plan,
            title=t["title"],
            note="",
            target=t.get("target", ""),
            priority=t.get("priority", "normal"),
            weight=t.get("weight", 1),
            order=i,
        )
    return Response(PlanSerializer(plan).data, status=status.HTTP_201_CREATED)
