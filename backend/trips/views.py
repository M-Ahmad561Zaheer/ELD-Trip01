from django.shortcuts import render

# Create your views here.
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response


@api_view(["GET"])
def health_check(request):
    return Response(
        {
            "success": True,
            "message": "ELD Trip Planner API is running.",
        },
        status=status.HTTP_200_OK,
    )