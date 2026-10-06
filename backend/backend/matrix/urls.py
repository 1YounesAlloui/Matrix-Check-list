"""Matrix app URL configuration."""
from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from matrix.views.auth import register, me
from matrix.views.plans import plan_list, plan_detail, plan_duplicate, plan_reorder
from matrix.views.tasks import task_list, task_detail, task_reorder
from matrix.views.completions import toggle
from matrix.views.today import today_view
from matrix.views.calendar import calendar_view
from matrix.views.matrix import matrix_view
from matrix.views.stats import stats_summary
from matrix.views.insights import insights_view
from matrix.views.skips import skip_list, skip_detail
from matrix.views.notes import note_by_date
from matrix.views.export import export_data, import_data
from matrix.views.templates import template_list, template_apply

urlpatterns = [
    # ── Auth ──────────────────────────────────────────────────────────────────
    path("auth/register/", register, name="auth-register"),
    path("auth/login/", TokenObtainPairView.as_view(), name="auth-login"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="auth-refresh"),
    path("auth/me/", me, name="auth-me"),

    # ── Plans ─────────────────────────────────────────────────────────────────
    path("plans/", plan_list, name="plan-list"),
    path("plans/reorder/", plan_reorder, name="plan-reorder"),
    path("plans/<int:pk>/", plan_detail, name="plan-detail"),
    path("plans/<int:pk>/duplicate/", plan_duplicate, name="plan-duplicate"),

    # ── Tasks ─────────────────────────────────────────────────────────────────
    path("tasks/", task_list, name="task-list"),
    path("tasks/reorder/", task_reorder, name="task-reorder"),
    path("tasks/<int:pk>/", task_detail, name="task-detail"),

    # ── Completions ───────────────────────────────────────────────────────────
    path("completions/toggle/", toggle, name="completion-toggle"),

    # ── Aggregated views ──────────────────────────────────────────────────────
    path("today/", today_view, name="today"),
    path("calendar/", calendar_view, name="calendar"),
    path("matrix/", matrix_view, name="matrix"),

    # ── Stats & insights ──────────────────────────────────────────────────────
    path("stats/summary/", stats_summary, name="stats-summary"),
    path("insights/", insights_view, name="insights"),

    # ── Skip days ─────────────────────────────────────────────────────────────
    path("skips/", skip_list, name="skip-list"),
    path("skips/<int:pk>/", skip_detail, name="skip-detail"),

    # ── Day notes ─────────────────────────────────────────────────────────────
    path("notes/<str:date_str>/", note_by_date, name="note-by-date"),

    # ── Export / Import ───────────────────────────────────────────────────────
    path("export/", export_data, name="export"),
    path("import/", import_data, name="import"),

    # ── Templates ─────────────────────────────────────────────────────────────
    path("templates/", template_list, name="template-list"),
    path("templates/<str:key>/apply/", template_apply, name="template-apply"),

    # ── OpenAPI docs ──────────────────────────────────────────────────────────
    path("schema/", SpectacularAPIView.as_view(), name="schema"),
    path("docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="docs"),
]
