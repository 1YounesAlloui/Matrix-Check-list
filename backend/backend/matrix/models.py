from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
import re


def validate_hex_color(value):
    if not re.match(r"^#[0-9A-Fa-f]{6}$", value):
        raise Exception(f"'{value}' is not a valid hex color (e.g. #3A7BFF).")


class Plan(models.Model):
    SCHEDULE_TYPES = [
        ("daily", "Daily"),
        ("weekdays", "Specific Weekdays"),
        ("every_n_days", "Every N Days"),
        ("one_time", "One Time"),
    ]

    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="plans")
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50, default="check-circle")
    color = models.CharField(max_length=7, default="#6C63FF")
    schedule_type = models.CharField(max_length=20, choices=SCHEDULE_TYPES, default="daily")
    # For weekdays: {"weekdays": [0,1,2,3,4]}  (0=Mon…6=Sun)
    # For every_n_days: {"interval": 3}
    # For one_time: {"date": "2025-01-15"}
    schedule_config = models.JSONField(default=dict, blank=True)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    reminder_time = models.TimeField(null=True, blank=True)
    # Percentage of weighted tasks that must be done to count day as complete
    completion_threshold = models.PositiveSmallIntegerField(
        default=100,
        validators=[MinValueValidator(1), MaxValueValidator(100)],
    )
    archived = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order", "created_at"]

    def __str__(self):
        return f"{self.owner.username} / {self.name}"


class Task(models.Model):
    PRIORITY_CHOICES = [
        ("low", "Low"),
        ("normal", "Normal"),
        ("high", "High"),
    ]

    plan = models.ForeignKey(Plan, on_delete=models.CASCADE, related_name="tasks")
    title = models.CharField(max_length=200)
    note = models.TextField(blank=True)
    target = models.CharField(max_length=100, blank=True)  # e.g. "3 sets", "30 min"
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default="normal")
    weight = models.PositiveSmallIntegerField(default=1, validators=[MinValueValidator(1)])
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["order", "created_at"]

    def __str__(self):
        return f"{self.plan.name} / {self.title}"


class CompletionLog(models.Model):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name="logs")
    plan = models.ForeignKey(Plan, on_delete=models.CASCADE, related_name="logs")
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="logs")
    date = models.DateField()
    completed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("task", "date")]
        indexes = [
            models.Index(fields=["user", "date"]),
            models.Index(fields=["plan", "date"]),
        ]

    def __str__(self):
        return f"{self.task} on {self.date}"


class SkipDay(models.Model):
    plan = models.ForeignKey(Plan, on_delete=models.CASCADE, related_name="skip_days")
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="skip_days")
    date = models.DateField()
    reason = models.CharField(max_length=200, blank=True)

    class Meta:
        unique_together = [("plan", "user", "date")]
        indexes = [models.Index(fields=["user", "date"])]

    def __str__(self):
        return f"Skip {self.plan.name} on {self.date}"


class DayNote(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="day_notes")
    date = models.DateField()
    mood = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
    )
    text = models.TextField(blank=True)

    class Meta:
        unique_together = [("user", "date")]
        indexes = [models.Index(fields=["user", "date"])]

    def __str__(self):
        return f"Note for {self.user.username} on {self.date}"
