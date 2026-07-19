from typing import Any

import requests
from django.conf import settings


class RoutingError(Exception):
    """Raised when the driving route cannot be calculated."""


class OSRMRoutingService:
    """Calculate driving routes using the OSRM Route API."""

    def __init__(self) -> None:
        self.base_url = settings.OSRM_BASE_URL.rstrip("/")

    def calculate_route(
        self,
        locations: list[dict[str, Any]],
    ) -> dict[str, Any]:
        if len(locations) < 2:
            raise RoutingError(
                "At least two locations are required to calculate a route."
            )

        coordinates = ";".join(
            f"{location['longitude']},{location['latitude']}"
            for location in locations
        )

        url = f"{self.base_url}/route/v1/driving/{coordinates}"

        params = {
            "overview": "full",
            "geometries": "geojson",
            "steps": "true",
            "alternatives": "false",
        }

        try:
            response = requests.get(
                url,
                params=params,
                timeout=30,
            )
            response.raise_for_status()
            payload = response.json()
        except requests.RequestException as exc:
            raise RoutingError(
                "Unable to connect to the routing service."
            ) from exc
        except ValueError as exc:
            raise RoutingError(
                "The routing service returned an invalid response."
            ) from exc

        if payload.get("code") != "Ok":
            message = payload.get(
                "message",
                "A driving route could not be calculated.",
            )
            raise RoutingError(message)

        routes = payload.get("routes", [])

        if not routes:
            raise RoutingError(
                "No driving route was found between the supplied locations."
            )

        route = routes[0]

        distance_meters = float(route["distance"])
        duration_seconds = float(route["duration"])

        return {
            "distance_meters": round(distance_meters, 2),
            "distance_miles": round(distance_meters / 1609.344, 2),
            "duration_seconds": round(duration_seconds, 2),
            "duration_hours": round(duration_seconds / 3600, 2),
            "geometry": route["geometry"],
            "legs": self._format_legs(route.get("legs", [])),
        }

    @staticmethod
    def _format_legs(legs: list[dict[str, Any]]) -> list[dict[str, Any]]:
        formatted_legs = []

        for index, leg in enumerate(legs, start=1):
            formatted_legs.append(
                {
                    "leg_number": index,
                    "distance_meters": round(
                        float(leg.get("distance", 0)),
                        2,
                    ),
                    "distance_miles": round(
                        float(leg.get("distance", 0)) / 1609.344,
                        2,
                    ),
                    "duration_seconds": round(
                        float(leg.get("duration", 0)),
                        2,
                    ),
                    "duration_hours": round(
                        float(leg.get("duration", 0)) / 3600,
                        2,
                    ),
                    "summary": leg.get("summary", ""),
                }
            )

        return formatted_legs