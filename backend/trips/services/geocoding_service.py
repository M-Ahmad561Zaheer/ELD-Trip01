import time
from typing import Any

import requests
from django.conf import settings
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


class GeocodingError(Exception):
    """Raised when a location cannot be geocoded."""


class NominatimGeocodingService:
    BASE_URL = "https://nominatim.openstreetmap.org/search"

    def __init__(self) -> None:
        retry_strategy = Retry(
            total=3,
            connect=3,
            read=3,
            status=3,
            backoff_factor=1,
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=["GET"],
            raise_on_status=False,
        )

        adapter = HTTPAdapter(max_retries=retry_strategy)

        self.session = requests.Session()
        self.session.mount("https://", adapter)
        self.session.mount("http://", adapter)

        self.session.headers.update(
            {
                "User-Agent": settings.NOMINATIM_USER_AGENT,
                "Accept": "application/json",
                "Accept-Language": "en",
            }
        )

    def geocode(self, location: str) -> dict[str, Any]:
        cleaned_location = location.strip()

        if not cleaned_location:
            raise GeocodingError("Location cannot be empty.")

        params = {
            "q": cleaned_location,
            "format": "jsonv2",
            "limit": 1,
            "addressdetails": 1,
            "countrycodes": "us",
        }

        try:
            response = self.session.get(
                self.BASE_URL,
                params=params,
                timeout=(10, 30),
            )

        except requests.exceptions.Timeout as exc:
            raise GeocodingError(
                f"Geocoding request timed out for '{cleaned_location}'. "
                "Please try again."
            ) from exc

        except requests.exceptions.SSLError as exc:
            raise GeocodingError(
                f"SSL connection failed while geocoding "
                f"'{cleaned_location}'."
            ) from exc

        except requests.exceptions.ConnectionError as exc:
            raise GeocodingError(
                f"Could not connect to Nominatim while geocoding "
                f"'{cleaned_location}'. Check the internet connection."
            ) from exc

        except requests.exceptions.RequestException as exc:
            raise GeocodingError(
                f"Geocoding request failed for '{cleaned_location}': "
                f"{exc}"
            ) from exc

        if response.status_code == 429:
            raise GeocodingError(
                "The geocoding service rate limit was reached. "
                "Please wait a few seconds and try again."
            )

        if response.status_code == 403:
            raise GeocodingError(
                "The geocoding service rejected the request. "
                "Check NOMINATIM_USER_AGENT in the .env file."
            )

        if response.status_code != 200:
            raise GeocodingError(
                f"Geocoding service returned HTTP "
                f"{response.status_code} for '{cleaned_location}': "
                f"{response.text[:300]}"
            )

        try:
            results = response.json()
        except ValueError as exc:
            raise GeocodingError(
                f"The geocoding service returned invalid JSON for "
                f"'{cleaned_location}'."
            ) from exc

        if not results:
            raise GeocodingError(
                f"Location '{cleaned_location}' could not be found. "
                "Enter a full US location such as "
                "'Houston, TX, USA'."
            )

        result = results[0]

        try:
            latitude = float(result["lat"])
            longitude = float(result["lon"])
        except (KeyError, TypeError, ValueError) as exc:
            raise GeocodingError(
                f"Invalid coordinates were returned for "
                f"'{cleaned_location}'."
            ) from exc

        # Respect the public Nominatim request-rate policy.
        time.sleep(1.1)

        return {
            "query": cleaned_location,
            "display_name": result.get(
                "display_name",
                cleaned_location,
            ),
            "latitude": latitude,
            "longitude": longitude,
        }