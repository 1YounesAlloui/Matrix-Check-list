from __future__ import annotations
from django.contrib.auth.models import User
from rest_framework import authentication


class SingleUserAuthentication(authentication.BaseAuthentication):
    """
    Single-user mode authentication:
    Automatically associates unauthenticated requests with the single user (demo/first user),
    removing any need for login or JWT tokens.
    """

    def authenticate(self, request):
        if "HTTP_AUTHORIZATION" in request.META:
            return None

        user = User.objects.filter(username="demo").first() or User.objects.first()
        if not user:
            user, _ = User.objects.get_or_create(username="me", defaults={"email": "me@localhost"})
        return (user, None)
