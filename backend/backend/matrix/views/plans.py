"""Plans CRUD, duplicate, reorder, archive."""
from __future__ import annotations
from datetime import date
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from matrix.models import Plan, Task, CompletionLog, SkipDay
from matrix.serializers import PlanSerializer, ReorderSerializer


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def plan_list(request):
    if request.method == "GET":
        include_archived = request.query_params.get("archived", "false").lower() == "true"
        qs = request.user.plans.all()
        if not include_archived:
            qs = qs.filter(archived=False)
        serializer = PlanSerializer(qs, many=True)
        return Response(serializer.data)

    # POST
    serializer = PlanSerializer(data=request.data, context={"request": request})
    serializer.is_valid(raise_exception=True)
    serializer.save(owner=request.user)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(["GET", "PATCH", "PUT", "DELETE"])
@permission_classes([IsAuthenticated])
def plan_detail(request, pk):
    plan = get_object_or_404(Plan, pk=pk, owner=request.user)

    if request.method == "GET":
        return Response(PlanSerializer(plan).data)

    if request.method in ("PATCH", "PUT"):
        partial = request.method == "PATCH"
        serializer = PlanSerializer(plan, data=request.data, partial=partial,
                                    context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    # DELETE — confirm cascade (DB handles it) after soft confirmation in the client
    plan.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def plan_duplicate(request, pk):
    """Duplicate a plan and all its tasks. Returns the new plan."""
    original = get_object_or_404(Plan, pk=pk, owner=request.user)
    tasks = list(original.tasks.all())

    new_plan = Plan.objects.create(
        owner=request.user,
        name=f"{original.name} (copy)",
        description=original.description,
        icon=original.icon,
        color=original.color,
        schedule_type=original.schedule_type,
        schedule_config=original.schedule_config,
        start_date=date.today(),
        end_date=None,
        reminder_time=original.reminder_time,
        completion_threshold=original.completion_threshold,
        archived=False,
        order=original.order + 1,
    )
    for t in tasks:
        Task.objects.create(
            plan=new_plan,
            title=t.title,
            note=t.note,
            target=t.target,
            priority=t.priority,
            weight=t.weight,
            order=t.order,
        )
    return Response(PlanSerializer(new_plan).data, status=status.HTTP_201_CREATED)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def plan_reorder(request):
    """Body: {ids: [1, 3, 2]}. Sets order = index for each plan."""
    serializer = ReorderSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    ids = serializer.validated_data["ids"]
    plans = {p.id: p for p in request.user.plans.filter(id__in=ids)}
    for i, pid in enumerate(ids):
        if pid in plans:
            plans[pid].order = i
    Plan.objects.bulk_update(plans.values(), ["order"])
    return Response({"detail": "Reordered."})
