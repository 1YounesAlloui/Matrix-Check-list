from django.contrib import admin
from .models import Plan, Task, CompletionLog, SkipDay, DayNote


@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):
    list_display = ["name", "owner", "schedule_type", "archived", "created_at"]
    list_filter = ["archived", "schedule_type"]
    search_fields = ["name", "owner__username"]


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ["title", "plan", "priority", "weight", "order"]
    list_filter = ["priority"]
    search_fields = ["title", "plan__name"]


@admin.register(CompletionLog)
class CompletionLogAdmin(admin.ModelAdmin):
    list_display = ["task", "plan", "user", "date", "completed_at"]
    list_filter = ["date"]
    search_fields = ["user__username"]


@admin.register(SkipDay)
class SkipDayAdmin(admin.ModelAdmin):
    list_display = ["plan", "user", "date", "reason"]


@admin.register(DayNote)
class DayNoteAdmin(admin.ModelAdmin):
    list_display = ["user", "date", "mood"]
