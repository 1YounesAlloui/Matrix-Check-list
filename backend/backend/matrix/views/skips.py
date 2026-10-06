"""Skip days: create and delete."""
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from matrix.models import SkipDay
from matrix.serializers import SkipDaySerializer


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def skip_list(request):
    if request.method == "GET":
        qs = SkipDay.objects.filter(user=request.user).order_by("-date")
        return Response(SkipDaySerializer(qs, many=True).data)

    serializer = SkipDaySerializer(data=request.data, context={"request": request})
    serializer.is_valid(raise_exception=True)
    serializer.save(user=request.user)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def skip_detail(request, pk):
    skip = get_object_or_404(SkipDay, pk=pk, user=request.user)
    skip.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)
