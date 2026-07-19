from django.db import DatabaseError
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .models import TripPlan
from .serializers import TripPlanRequestSerializer
from .services.geocoding_service import (
    GeocodingError,
    NominatimGeocodingService,
)
from .services.hos_engine import (
    HOSEngine,
    HOSEngineError,
)
from .services.log_generator import ELDLogGenerator
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
    eld_log_generator = ELDLogGenerator()

    try:
        current_location = geocoding_service.geocode(
            trip_data["current_location"]
        )


        pickup_location = geocoding_service.geocode(
            trip_data["pickup_location"]
        )

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

        daily_logs = eld_log_generator.generate_logs(
            schedule["events"]
        )
        

    except (
        GeocodingError,
        RoutingError,
        HOSEngineError,
        RouteGeometryError,
    ) as exc:
        return Response(
            {
                "success": False,
                "message": str(exc),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    except Exception as exc:
        return Response(
            {
                "success": False,
                "message": str(exc),
                "error_type": exc.__class__.__name__,
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    cycle_limit = 70
    current_cycle_used = trip_data["current_cycle_used"]

    schedule_summary = schedule.get("summary", {})

    total_elapsed_hours = schedule_summary.get(
        "total_trip_elapsed_hours",
        schedule_summary.get(
            "total_elapsed_hours",
            route.get("duration_hours", 0),
        ),
    )

    fuel_stops = schedule_summary.get(
        "fuel_stops",
        0,
    )

    rest_periods = schedule_summary.get(
        "rest_periods",
        0,
    )

    response_data = {
        "locations": {
            "current": current_location,
            "pickup": pickup_location,
            "dropoff": dropoff_location,
        },
        "route": route,
        "schedule": schedule,
        "stop_markers": stop_markers,
        "daily_logs": daily_logs,
        "hos": {
            "cycle_limit_hours": cycle_limit,
            "current_cycle_used_hours": current_cycle_used,
            "remaining_cycle_hours": round(
                cycle_limit - current_cycle_used,
                2,
            ),
            "driving_limit_per_shift_hours": 11,
            "duty_window_hours": 14,
            "required_rest_hours": 10,
            "break_required_after_driving_hours": 8,
            "break_duration_minutes": 30,
        },
    }

    try:
        trip_plan = TripPlan.objects.create(
            current_location=trip_data["current_location"],
            pickup_location=trip_data["pickup_location"],
            dropoff_location=trip_data["dropoff_location"],
            current_cycle_used=current_cycle_used,
            distance_miles=route["distance_miles"],
            driving_hours=route["duration_hours"],
            total_elapsed_hours=total_elapsed_hours,
            fuel_stops=fuel_stops,
            rest_periods=rest_periods,
            eld_log_days=len(daily_logs),
            request_payload=dict(request.data),
            response_payload=response_data,
        )
        

    except DatabaseError as exc:
        return Response(
            {
                "success": False,
                "message": (
                    "Trip was generated but could not be saved "
                    "to the database."
                ),
                "error": str(exc),
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    response_data["trip_id"] = trip_plan.id

    return Response(
        {
            "success": True,
            "message": (
                "Trip route, HOS schedule and ELD logs "
                "generated and saved successfully."
            ),
            "data": response_data,
        },
        status=status.HTTP_201_CREATED,
    )
