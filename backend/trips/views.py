import time

from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .serializers import TripPlanRequestSerializer
from .services.geocoding_service import (
    GeocodingError,
    NominatimGeocodingService,
)
from .services.routing_service import (
    OSRMRoutingService,
    RoutingError,
)


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

    geocoding_service = NominatimGeocodingService()
    routing_service = OSRMRoutingService()

    try:
        current_location = geocoding_service.geocode(
            trip_data["current_location"]
        )

        time.sleep(1)

        pickup_location = geocoding_service.geocode(
            trip_data["pickup_location"]
        )

        time.sleep(1)

        dropoff_location = geocoding_service.geocode(
            trip_data["dropoff_location"]
        )

        route = routing_service.calculate_route(
            [
                current_location,
                pickup_location,
                dropoff_location,
            ]
        )

    except GeocodingError as exc:
        return Response(
            {
                "success": False,
                "message": str(exc),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    except RoutingError as exc:
        return Response(
            {
                "success": False,
                "message": str(exc),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    cycle_limit = 70
    current_cycle_used = trip_data["current_cycle_used"]
    remaining_cycle_hours = round(
        cycle_limit - current_cycle_used,
        2,
    )

    return Response(
        {
            "success": True,
            "message": "Trip route calculated successfully.",
            "data": {
                "locations": {
                    "current": current_location,
                    "pickup": pickup_location,
                    "dropoff": dropoff_location,
                },
                "route": route,
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