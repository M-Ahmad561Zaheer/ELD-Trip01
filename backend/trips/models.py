from django.db import models


class TripPlan(models.Model):
    current_location = models.CharField(max_length=255)
    pickup_location = models.CharField(max_length=255)
    dropoff_location = models.CharField(max_length=255)

    current_cycle_used = models.DecimalField(
        max_digits=5,
        decimal_places=2,
    )

    distance_miles = models.DecimalField(
        max_digits=10,
        decimal_places=2,
    )

    driving_hours = models.DecimalField(
        max_digits=10,
        decimal_places=2,
    )

    total_elapsed_hours = models.DecimalField(
        max_digits=10,
        decimal_places=2,
    )

    fuel_stops = models.PositiveIntegerField(default=0)
    rest_periods = models.PositiveIntegerField(default=0)
    eld_log_days = models.PositiveIntegerField(default=0)

    request_payload = models.JSONField(default=dict)
    response_payload = models.JSONField(default=dict)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return (
            f"{self.current_location} → "
            f"{self.pickup_location} → "
            f"{self.dropoff_location}"
        )