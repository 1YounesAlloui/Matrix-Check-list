"""Insights view: rule-based smart insights."""
from __future__ import annotations
from datetime import date

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from matrix.views.calendar import calendar_view
from matrix.views.stats import stats_summary
from matrix.services.insights import generate_insights


def _parse_date(value, fallback):
    try:
        return date.fromisoformat(value) if value else fallback
    except ValueError:
        return fallback


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def insights_view(request):
    """
    GET /api/insights/?start=YYYY-MM-DD&end=YYYY-MM-DD
    Calls calendar and stats logic then runs insights engine.
    """
    today = date.today()
    start = _parse_date(request.query_params.get("start"), today.replace(day=1))
    end = _parse_date(request.query_params.get("end"), today)

    # Re-use the calendar and stats views by calling them as functions
    cal_response = calendar_view(request._request if hasattr(request, "_request") else request)
    stats_response = stats_summary(request._request if hasattr(request, "_request") else request)

    calendar_data = cal_response.data if hasattr(cal_response, "data") else []
    plan_stats = stats_response.data.get("plans", []) if hasattr(stats_response, "data") else []

    insights = generate_insights(list(calendar_data), plan_stats)
    return Response({"insights": insights, "count": len(insights)})
