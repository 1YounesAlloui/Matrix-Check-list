"""
Serializers for the Matrix API.
"""
from __future__ import annotations
import re
from datetime import date
from django.contrib.auth.models import User
from rest_framework import serializers
from .models import Plan, Task, CompletionLog, SkipDay, DayNote


# ── Helpers ────────────────────────────────────────────────────────────────────

def _validate_hex_color(value: str) -> str:
    if not re.match(r"^#[0-9A-Fa-f]{6}$", value):
        raise serializers.ValidationError(f"'{value}' is not a valid hex color (e.g. #3A7BFF).")
    return value


# ── Auth ────────────────────────────────────────────────────────────────────────

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password2 = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ["username", "email", "password", "password2"]

    def validate(self, attrs):
        if attrs["password"] != attrs["password2"]:
            raise serializers.ValidationError({"password2": "Passwords do not match."})
        return attrs

    def create(self, validated_data):
        validated_data.pop("password2")
        return User.objects.create_user(**validated_data)


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email", "date_joined"]
        read_only_fields = fields


# ── Plan ────────────────────────────────────────────────────────────────────────

class PlanSerializer(serializers.ModelSerializer):
    task_count = serializers.SerializerMethodField()

    class Meta:
        model = Plan
        fields = [
            "id", "name", "description", "icon", "color",
            "schedule_type", "schedule_config",
            "start_date", "end_date",
            "reminder_time", "completion_threshold",
            "archived", "order",
            "created_at", "updated_at",
            "task_count",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "task_count"]

    def get_task_count(self, obj) -> int:
        return obj.tasks.count()

    def validate_color(self, value):
        return _validate_hex_color(value)

    def validate_completion_threshold(self, value):
        if not 1 <= value <= 100:
            raise serializers.ValidationError("completion_threshold must be between 1 and 100.")
        return value

    def validate(self, attrs):
        # end_date >= start_date
        start = attrs.get("start_date", getattr(self.instance, "start_date", None))
        end = attrs.get("end_date", getattr(self.instance, "end_date", None))
        if start and end and end < start:
            raise serializers.ValidationError({"end_date": "end_date must be >= start_date."})

        # Validate schedule_config against schedule_type
        stype = attrs.get("schedule_type", getattr(self.instance, "schedule_type", "daily"))
        cfg = attrs.get("schedule_config", getattr(self.instance, "schedule_config", {}))
        if stype == "weekdays":
            wds = cfg.get("weekdays")
            if not isinstance(wds, list) or not all(isinstance(d, int) and 0 <= d <= 6 for d in wds):
                raise serializers.ValidationError(
                    {"schedule_config": "weekdays must be a list of integers 0-6."}
                )
        elif stype == "every_n_days":
            interval = cfg.get("interval")
            if not isinstance(interval, int) or interval < 1:
                raise serializers.ValidationError(
                    {"schedule_config": "interval must be a positive integer."}
                )
        elif stype == "one_time":
            d = cfg.get("date")
            if not d:
                raise serializers.ValidationError(
                    {"schedule_config": "one_time requires a 'date' field."}
                )
            try:
                date.fromisoformat(d)
            except ValueError:
                raise serializers.ValidationError(
                    {"schedule_config": "'date' must be ISO format YYYY-MM-DD."}
                )
        return attrs


# ── Task ────────────────────────────────────────────────────────────────────────

class TaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = [
            "id", "plan", "title", "note", "target",
            "priority", "weight", "order", "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def validate_plan(self, plan):
        request = self.context.get("request")
        if request and plan.owner != request.user:
            raise serializers.ValidationError("You do not own this plan.")
        return plan


# ── CompletionLog ──────────────────────────────────────────────────────────────

class CompletionLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompletionLog
        fields = ["id", "task", "plan", "user", "date", "completed_at"]
        read_only_fields = ["id", "plan", "user", "completed_at"]


class ToggleSerializer(serializers.Serializer):
    task = serializers.PrimaryKeyRelatedField(queryset=Task.objects.all())
    date = serializers.DateField()

    def validate_date(self, value):
        if value > date.today():
            raise serializers.ValidationError("Cannot toggle a future date.")
        return value

    def validate(self, attrs):
        request = self.context["request"]
        task = attrs["task"]
        if task.plan.owner != request.user:
            raise serializers.ValidationError({"task": "Task belongs to another user."})
        return attrs


# ── SkipDay ────────────────────────────────────────────────────────────────────

class SkipDaySerializer(serializers.ModelSerializer):
    class Meta:
        model = SkipDay
        fields = ["id", "plan", "date", "reason"]
        read_only_fields = ["id"]

    def validate_plan(self, plan):
        request = self.context.get("request")
        if request and plan.owner != request.user:
            raise serializers.ValidationError("You do not own this plan.")
        return plan


# ── DayNote ────────────────────────────────────────────────────────────────────

class DayNoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = DayNote
        fields = ["id", "date", "mood", "text"]
        read_only_fields = ["id", "date"]

    def validate_mood(self, value):
        if value is not None and not 1 <= value <= 5:
            raise serializers.ValidationError("mood must be between 1 and 5.")
        return value


# ── Reorder ────────────────────────────────────────────────────────────────────

class ReorderSerializer(serializers.Serializer):
    ids = serializers.ListField(child=serializers.IntegerField(), allow_empty=False)
