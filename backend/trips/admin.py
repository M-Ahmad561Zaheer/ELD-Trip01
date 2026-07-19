from django.contrib import admin

from .models import TripPlan


@admin.register(TripPlan)
class TripPlanAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "current_location",
        "pickup_location",
        "dropoff_location",
        "current_cycle_used",
        "distance_miles",
        "driving_hours",
        "fuel_stops",
        "rest_periods",
        "created_at",
    )

    list_filter = (
        "created_at",
        "fuel_stops",
        "rest_periods",
    )

    search_fields = (
        "current_location",
        "pickup_location",
        "dropoff_location",
    )

    readonly_fields = (
        "created_at",
        "request_payload",
        "response_payload",
    )

    ordering = ("-created_at",)