"""Toggle completion endpoint."""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from matrix.models import CompletionLog
from matrix.serializers import ToggleSerializer


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def toggle(request):
    """
    POST /api/completions/toggle/
    Body: {task: <id>, date: "YYYY-MM-DD"}
    Creates the log if missing, deletes if present.
    Returns {completed: bool, date: str, task: id}.
    """
    serializer = ToggleSerializer(data=request.data, context={"request": request})
    serializer.is_valid(raise_exception=True)

    task = serializer.validated_data["task"]
    log_date = serializer.validated_data["date"]

    existing = CompletionLog.objects.filter(task=task, date=log_date).first()
    if existing:
        existing.delete()
        completed = False
    else:
        CompletionLog.objects.create(
            task=task,
            plan=task.plan,
            user=request.user,
            date=log_date,
        )
        completed = True

    return Response({"completed": completed, "date": log_date.isoformat(), "task": task.id})
