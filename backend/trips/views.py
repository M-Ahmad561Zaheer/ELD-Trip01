from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .serializers import TripPlanRequestSerializer


@api_view(["GET"])
def health_check(request):
    return Response(
        {
            "success": True,
            "message": "ELD Trip Planner API is running.",
        },
        status=status.HTTP_200_OK,
    )


@api_view(["POST"])
def plan_trip(request):
    serializer = TripPlanRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    trip_data = serializer.validated_data
    current_cycle_used = trip_data["current_cycle_used"]

    cycle_limit = 70
    remaining_cycle_hours = round(cycle_limit - current_cycle_used, 2)

    return Response(
        {
            "success": True,
            "message": "Trip request validated successfully.",
            "data": {
                "trip": {
                    "current_location": trip_data["current_location"],
                    "pickup_location": trip_data["pickup_location"],
                    "dropoff_location": trip_data["dropoff_location"],
                },
                "hos": {
                    "cycle_limit_hours": cycle_limit,
                    "current_cycle_used_hours": current_cycle_used,
                    "remaining_cycle_hours": remaining_cycle_hours,
                    "driving_limit_per_shift_hours": 11,
                    "duty_window_hours": 14,
                    "required_rest_hours": 10,
                    "break_required_after_driving_hours": 8,
                    "break_duration_minutes": 30,
                },
            },
        },
        status=status.HTTP_200_OK,
    )