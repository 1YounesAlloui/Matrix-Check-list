"""Day notes: get or upsert by date."""
from datetime import date
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from matrix.models import DayNote
from matrix.serializers import DayNoteSerializer


@api_view(["GET", "PUT", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def note_by_date(request, date_str):
    try:
        target = date.fromisoformat(date_str)
    except ValueError:
        return Response({"detail": "Invalid date format."}, status=400)

    if request.method == "GET":
        try:
            note = DayNote.objects.get(user=request.user, date=target)
            return Response(DayNoteSerializer(note).data)
        except DayNote.DoesNotExist:
            return Response({"detail": "Not found."}, status=404)

    if request.method == "DELETE":
        DayNote.objects.filter(user=request.user, date=target).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    # PUT / PATCH — upsert
    instance, _ = DayNote.objects.get_or_create(user=request.user, date=target)
    partial = request.method == "PATCH"
    serializer = DayNoteSerializer(instance, data=request.data, partial=partial)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)
