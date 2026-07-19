from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path


def home(request):
    return JsonResponse(
        {
            "success": True,
            "message": "ELD Trip Planner Backend API",
            "endpoints": {
                "admin": "/admin/",
                "health": "/api/health/",
                "plan_trip": "/api/trips/plan/",
            },
        }
    )


urlpatterns = [
    path("", home, name="home"),
    path("admin/", admin.site.urls),
    path("api/", include("trips.urls")),
]