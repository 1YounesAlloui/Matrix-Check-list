"""
seed_demo: Creates a demo user with 4 plans and ~3 months of realistic history.

Usage: python manage.py seed_demo [--reset]
"""
from __future__ import annotations
import random
from datetime import date, timedelta
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User

from matrix.models import Plan, Task, CompletionLog, SkipDay, DayNote


DEMO_USERNAME = "demo"
DEMO_PASSWORD = "demo1234"

PLANS = [
    {
        "name": "Morning Workout",
        "icon": "dumbbell",
        "color": "#FF5733",
        "schedule_type": "weekdays",
        "schedule_config": {"weekdays": [0, 1, 2, 3, 4]},
        "completion_threshold": 80,
        "tasks": [
            ("Warm-up jog", 1, "10 min", "normal"),
            ("Push-ups", 2, "3×15", "high"),
            ("Pull-ups", 2, "3×8", "high"),
            ("Core work", 1, "15 min", "normal"),
            ("Stretch", 1, "10 min", "low"),
        ],
    },
    {
        "name": "Study — Python",
        "icon": "code",
        "color": "#3A7BFF",
        "schedule_type": "daily",
        "schedule_config": {},
        "completion_threshold": 100,
        "tasks": [
            ("Review notes", 1, "", "normal"),
            ("Work through chapter", 3, "2 hours", "high"),
            ("Practice exercises", 2, "1 hour", "high"),
            ("Write summary", 1, "", "normal"),
        ],
    },
    {
        "name": "Morning Routine",
        "icon": "sun",
        "color": "#F59E0B",
        "schedule_type": "daily",
        "schedule_config": {},
        "completion_threshold": 80,
        "tasks": [
            ("Make bed", 1, "", "low"),
            ("Drink water", 1, "500 ml", "normal"),
            ("Meditate", 1, "10 min", "normal"),
            ("Healthy breakfast", 1, "", "normal"),
            ("Plan the day", 1, "", "normal"),
        ],
    },
    {
        "name": "Evening Reading",
        "icon": "book",
        "color": "#059669",
        "schedule_type": "every_n_days",
        "schedule_config": {"interval": 2},
        "completion_threshold": 100,
        "tasks": [
            ("Read", 1, "30 pages", "normal"),
            ("Take notes", 1, "", "normal"),
        ],
    },
]

MOODS = [1, 2, 3, 3, 4, 4, 4, 5, 5]
NOTE_TEXTS = [
    "Good energy today.",
    "Tough day but pushed through.",
    "Feeling great, very focused.",
    "Slept in, hard to get started.",
    "Everything clicked today!",
    "Distracted, need to improve focus.",
    "",
]

SKIP_REASONS = ["Travel", "Sick day", "Rest day", "Family event"]


class Command(BaseCommand):
    help = "Seed demo user with 4 plans and ~3 months of realistic history."

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Delete and recreate the demo user.",
        )

    def handle(self, *args, **options):
        if options["reset"]:
            User.objects.filter(username=DEMO_USERNAME).delete()
            self.stdout.write("Deleted existing demo user.")

        user, created = User.objects.get_or_create(
            username=DEMO_USERNAME,
            defaults={"email": "demo@matrix.app"},
        )
        if created:
            user.set_password(DEMO_PASSWORD)
            user.save()
            self.stdout.write(f"Created user: {DEMO_USERNAME} / {DEMO_PASSWORD}")
        else:
            self.stdout.write(f"Reusing existing user: {DEMO_USERNAME}")

        today = date.today()
        history_start = today - timedelta(days=90)

        # Create plans and tasks
        plans_objs = []
        for i, plan_data in enumerate(PLANS):
            tasks_data = plan_data.pop("tasks")
            plan, _ = Plan.objects.get_or_create(
                owner=user,
                name=plan_data["name"],
                defaults={
                    **plan_data,
                    "start_date": history_start,
                    "order": i,
                },
            )
            tasks_objs = []
            for j, (title, weight, target, priority) in enumerate(tasks_data):
                task, _ = Task.objects.get_or_create(
                    plan=plan,
                    title=title,
                    defaults={"weight": weight, "target": target, "priority": priority, "order": j},
                )
                tasks_objs.append(task)
            plans_objs.append((plan, tasks_objs))
            plan_data["tasks"] = tasks_data  # restore for potential re-runs

        # Generate history
        random.seed(42)  # Reproducible
        current = history_start
        while current <= today:
            # ~10% chance of a skip day per plan
            for plan, tasks in plans_objs:
                from matrix.services.schedule import is_scheduled
                if not is_scheduled(plan, current):
                    continue

                if random.random() < 0.08:
                    SkipDay.objects.get_or_create(
                        plan=plan, user=user, date=current,
                        defaults={"reason": random.choice(SKIP_REASONS)},
                    )
                    continue

                # Complete tasks with realistic probability
                for task in tasks:
                    completion_prob = 0.75 if current.weekday() < 5 else 0.60
                    if random.random() < completion_prob:
                        CompletionLog.objects.get_or_create(
                            task=task, date=current,
                            defaults={"plan": plan, "user": user},
                        )

            # Day notes with ~40% chance
            if random.random() < 0.40:
                DayNote.objects.get_or_create(
                    user=user,
                    date=current,
                    defaults={
                        "mood": random.choice(MOODS),
                        "text": random.choice(NOTE_TEXTS),
                    },
                )

            current += timedelta(days=1)

        self.stdout.write(self.style.SUCCESS(
            f"Seeded demo data: {len(plans_objs)} plans, "
            f"{CompletionLog.objects.filter(user=user).count()} completions, "
            f"{SkipDay.objects.filter(user=user).count()} skip days, "
            f"{DayNote.objects.filter(user=user).count()} day notes."
        ))
