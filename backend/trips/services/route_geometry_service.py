from math import atan2, cos, radians, sin, sqrt
from typing import Any


class RouteGeometryError(Exception):
    """Raised when route geometry cannot be processed."""


class RouteGeometryService:
    """Map route-mile positions to coordinates on GeoJSON geometry."""

    EARTH_RADIUS_MILES = 3958.8

    def attach_coordinates_to_events(
        self,
        events: list[dict[str, Any]],
        geometry: dict[str, Any],
    ) -> list[dict[str, Any]]:
        coordinates = geometry.get("coordinates", [])

        if geometry.get("type") != "LineString":
            raise RouteGeometryError(
                "Route geometry must be a GeoJSON LineString."
            )

        if len(coordinates) < 2:
            raise RouteGeometryError(
                "Route geometry does not contain enough coordinates."
            )

        cumulative_distances = self._build_cumulative_distances(
            coordinates
        )

        route_distance = cumulative_distances[-1]

        if route_distance <= 0:
            raise RouteGeometryError(
                "Route geometry distance must be greater than zero."
            )

        enriched_events = []

        for event in events:
            event_copy = event.copy()

            mile_position = float(
                event.get(
                    "end_mile",
                    event.get("start_mile", 0),
                )
            )

            longitude, latitude = self._coordinate_at_mile(
                target_mile=mile_position,
                coordinates=coordinates,
                cumulative_distances=cumulative_distances,
            )

            event_copy["location"] = {
                "latitude": round(latitude, 6),
                "longitude": round(longitude, 6),
                "mile_marker": round(mile_position, 2),
            }

            enriched_events.append(event_copy)

        return enriched_events

    def build_stop_markers(
        self,
        events: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        marker_event_types = {
            "pickup",
            "fuel",
            "break",
            "rest",
            "cycle_restart",
            "dropoff",
        }

        markers = []

        for event in events:
            if event["event_type"] not in marker_event_types:
                continue

            markers.append(
                {
                    "sequence": event["sequence"],
                    "type": event["event_type"],
                    "title": self._get_marker_title(
                        event["event_type"]
                    ),
                    "description": event["description"],
                    "day_number": event["day_number"],
                    "start_hour": event["start_hour"],
                    "duration_hours": event["duration_hours"],
                    "mile_marker": event["location"][
                        "mile_marker"
                    ],
                    "latitude": event["location"]["latitude"],
                    "longitude": event["location"]["longitude"],
                }
            )

        return markers

    def _build_cumulative_distances(
        self,
        coordinates: list[list[float]],
    ) -> list[float]:
        cumulative_distances = [0.0]
        total_distance = 0.0

        for index in range(1, len(coordinates)):
            previous = coordinates[index - 1]
            current = coordinates[index]

            segment_distance = self._haversine_distance(
                previous[1],
                previous[0],
                current[1],
                current[0],
            )

            total_distance += segment_distance
            cumulative_distances.append(total_distance)

        return cumulative_distances

    def _coordinate_at_mile(
        self,
        target_mile: float,
        coordinates: list[list[float]],
        cumulative_distances: list[float],
    ) -> tuple[float, float]:
        if target_mile <= 0:
            return coordinates[0][0], coordinates[0][1]

        total_distance = cumulative_distances[-1]

        if target_mile >= total_distance:
            return coordinates[-1][0], coordinates[-1][1]

        for index in range(1, len(cumulative_distances)):
            segment_end_distance = cumulative_distances[index]

            if target_mile <= segment_end_distance:
                segment_start_distance = cumulative_distances[
                    index - 1
                ]

                segment_length = (
                    segment_end_distance
                    - segment_start_distance
                )

                if segment_length <= 0:
                    return (
                        coordinates[index][0],
                        coordinates[index][1],
                    )

                ratio = (
                    target_mile - segment_start_distance
                ) / segment_length

                start = coordinates[index - 1]
                end = coordinates[index]

                longitude = (
                    start[0] + (end[0] - start[0]) * ratio
                )
                latitude = (
                    start[1] + (end[1] - start[1]) * ratio
                )

                return longitude, latitude

        return coordinates[-1][0], coordinates[-1][1]

    def _haversine_distance(
        self,
        latitude_1: float,
        longitude_1: float,
        latitude_2: float,
        longitude_2: float,
    ) -> float:
        lat_1 = radians(latitude_1)
        lon_1 = radians(longitude_1)
        lat_2 = radians(latitude_2)
        lon_2 = radians(longitude_2)

        delta_latitude = lat_2 - lat_1
        delta_longitude = lon_2 - lon_1

        value = (
            sin(delta_latitude / 2) ** 2
            + cos(lat_1)
            * cos(lat_2)
            * sin(delta_longitude / 2) ** 2
        )

        central_angle = 2 * atan2(
            sqrt(value),
            sqrt(1 - value),
        )

        return self.EARTH_RADIUS_MILES * central_angle

    @staticmethod
    def _get_marker_title(event_type: str) -> str:
        titles = {
            "pickup": "Pickup Stop",
            "fuel": "Fuel Stop",
            "break": "30-Minute Break",
            "rest": "10-Hour Rest",
            "cycle_restart": "34-Hour Restart",
            "dropoff": "Dropoff Stop",
        }

        return titles.get(event_type, event_type.title())