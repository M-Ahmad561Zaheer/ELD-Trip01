import time

from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .serializers import TripPlanRequestSerializer
from .services.geocoding_service import (
    GeocodingError,
    NominatimGeocodingService,
)
from .services.hos_engine import (
    HOSEngine,
    HOSEngineError,
)
from .services.route_geometry_service import (
    RouteGeometryError,
    RouteGeometryService,
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
    route_geometry_service = RouteGeometryService()

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

        hos_engine = HOSEngine(
            current_cycle_used=trip_data["current_cycle_used"]
        )

        schedule = hos_engine.generate_schedule(route)

        schedule["events"] = (
            route_geometry_service.attach_coordinates_to_events(
                events=schedule["events"],
                geometry=route["geometry"],
            )
        )

        stop_markers = route_geometry_service.build_stop_markers(
            schedule["events"]
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

    except HOSEngineError as exc:
        return Response(
            {
                "success": False,
                "message": str(exc),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    except RouteGeometryError as exc:
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
            "message": (
                "Trip route and HOS schedule generated successfully."
            ),
            "data": {
                "locations": {
                    "current": current_location,
                    "pickup": pickup_location,
                    "dropoff": dropoff_location,
                },
                "route": route,
                "schedule": schedule,
                "stop_markers": stop_markers,
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