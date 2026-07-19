import os

import requests
from dotenv import load_dotenv

load_dotenv()


class RoutingError(Exception):
    """Raised when route calculation fails."""


class OSRMRoutingService:
    def __init__(self):
        self.base_url = os.getenv(
            "OSRM_BASE_URL",
            "https://router.project-osrm.org",
        ).rstrip("/")

    def calculate_route(self, locations):
        if len(locations) < 2:
            raise RoutingError(
                "At least two locations are required to calculate a route."
            )

        coordinates = []

        for location in locations:
            latitude = location.get("latitude")
            longitude = location.get("longitude")

            if latitude is None or longitude is None:
                raise RoutingError(
                    "A location is missing latitude or longitude."
                )

            # OSRM expects longitude,latitude
            coordinates.append(f"{longitude},{latitude}")

        coordinates_string = ";".join(coordinates)

        url = (
            f"{self.base_url}/route/v1/driving/"
            f"{coordinates_string}"
        )

        params = {
            "overview": "full",
            "geometries": "geojson",
            "steps": "true",
        }

        try:
            response = requests.get(
                url,
                params=params,
                timeout=30,
                headers={
                    "User-Agent": "ELDTripPlanner/1.0",
                },
            )

            response.raise_for_status()

        except requests.exceptions.Timeout as exc:
            raise RoutingError(
                "The routing service request timed out. Please try again."
            ) from exc

        except requests.exceptions.ConnectionError as exc:
            raise RoutingError(
                "Unable to connect to the routing service. "
                "Check your internet connection or OSRM URL."
            ) from exc

        except requests.exceptions.HTTPError as exc:
            raise RoutingError(
                f"Routing service returned HTTP "
                f"{response.status_code}: {response.text[:300]}"
            ) from exc

        except requests.exceptions.RequestException as exc:
            raise RoutingError(
                f"Routing service request failed: {str(exc)}"
            ) from exc

        try:
            data = response.json()
        except ValueError as exc:
            raise RoutingError(
                "The routing service returned an invalid response."
            ) from exc

        if data.get("code") != "Ok":
            raise RoutingError(
                data.get(
                    "message",
                    "The routing service could not calculate the route.",
                )
            )

        routes = data.get("routes", [])

        if not routes:
            raise RoutingError(
                "No route was found between the selected locations."
            )

        selected_route = routes[0]

        distance_meters = selected_route.get("distance", 0)
        duration_seconds = selected_route.get("duration", 0)

        return {
            "distance_meters": round(distance_meters, 2),
            "distance_kilometers": round(
                distance_meters / 1000,
                2,
            ),
            "distance_miles": round(
                distance_meters / 1609.344,
                2,
            ),
            "duration_seconds": round(duration_seconds, 2),
            "duration_hours": round(
                duration_seconds / 3600,
                2,
            ),
            "geometry": selected_route.get(
                "geometry",
                {},
            ),
            "legs": selected_route.get(
                "legs",
                [],
            ),
        }