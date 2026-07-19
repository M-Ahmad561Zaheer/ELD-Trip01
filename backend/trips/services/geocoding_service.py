from typing import Any

import requests
from django.conf import settings


class GeocodingError(Exception):
    """Raised when a location cannot be geocoded."""


class NominatimGeocodingService:
    BASE_URL = "https://nominatim.openstreetmap.org/search"

    def geocode(self, location: str) -> dict[str, Any]:
        params = {
            "q": location,
            "format": "jsonv2",
            "limit": 1,
            "addressdetails": 1,
        }

        headers = {
            "User-Agent": settings.NOMINATIM_USER_AGENT,
        }

        try:
            response = requests.get(
                self.BASE_URL,
                params=params,
                headers=headers,
                timeout=15,
            )
            response.raise_for_status()
        except requests.RequestException as exc:
            raise GeocodingError(
                f"Unable to connect to the geocoding service for '{location}'."
            ) from exc

        results = response.json()

        if not results:
            raise GeocodingError(
                f"Location '{location}' could not be found."
            )

        result = results[0]

        return {
            "query": location,
            "display_name": result["display_name"],
            "latitude": float(result["lat"]),
            "longitude": float(result["lon"]),
        }