from django.urls import path

from .views import health_check, plan_trip

app_name = "trips"

urlpatterns = [
    path("health/", health_check, name="health-check"),
    path("trips/plan/", plan_trip, name="plan-trip"),
]