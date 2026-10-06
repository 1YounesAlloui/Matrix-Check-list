"""Tasks CRUD + reorder."""
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from matrix.models import Task, Plan
from matrix.serializers import TaskSerializer, ReorderSerializer


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def task_list(request):
    if request.method == "GET":
        qs = Task.objects.filter(plan__owner=request.user)
        plan_id = request.query_params.get("plan")
        if plan_id:
            qs = qs.filter(plan_id=plan_id)
        return Response(TaskSerializer(qs, many=True).data)

    # POST
    serializer = TaskSerializer(data=request.data, context={"request": request})
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(["GET", "PATCH", "PUT", "DELETE"])
@permission_classes([IsAuthenticated])
def task_detail(request, pk):
    task = get_object_or_404(Task, pk=pk, plan__owner=request.user)

    if request.method == "GET":
        return Response(TaskSerializer(task).data)

    if request.method in ("PATCH", "PUT"):
        partial = request.method == "PATCH"
        serializer = TaskSerializer(task, data=request.data, partial=partial,
                                    context={"request": request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    task.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def task_reorder(request):
    serializer = ReorderSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    ids = serializer.validated_data["ids"]
    tasks = {t.id: t for t in Task.objects.filter(id__in=ids, plan__owner=request.user)}
    for i, tid in enumerate(ids):
        if tid in tasks:
            tasks[tid].order = i
    Task.objects.bulk_update(tasks.values(), ["order"])
    return Response({"detail": "Reordered."})
