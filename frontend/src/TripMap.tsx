import { useEffect, useMemo } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  Polyline,
  TileLayer,
  useMap,
} from "react-leaflet";
import L from "leaflet";

import type { TripPlanData } from "./types";

interface TripMapProps {
  data: TripPlanData;
}

interface FitRouteProps {
  positions: [number, number][];
}

type MarkerType =
  | "current"
  | "start"
  | "pickup"
  | "dropoff"
  | "drop_off"
  | "fuel"
  | "fuel_stop"
  | "rest"
  | "rest_stop"
  | "break";

const createMarkerIcon = (
  background: string,
  label: string,
) =>
  L.divIcon({
    className: "custom-map-marker",
    html: `
      <div
        class="custom-map-marker__pin"
        style="background:${background}"
      >
        <span>${label}</span>
      </div>
    `,
    iconSize: [38, 46],
    iconAnchor: [19, 44],
    popupAnchor: [0, -42],
  });

const markerIcons: Record<string, L.DivIcon> = {
  current: createMarkerIcon("#15803d", "A"),
  start: createMarkerIcon("#15803d", "A"),
  pickup: createMarkerIcon("#2563eb", "P"),
  dropoff: createMarkerIcon("#dc2626", "D"),
  drop_off: createMarkerIcon("#dc2626", "D"),
  fuel: createMarkerIcon("#d97706", "F"),
  fuel_stop: createMarkerIcon("#d97706", "F"),
  rest: createMarkerIcon("#7c3aed", "R"),
  rest_stop: createMarkerIcon("#7c3aed", "R"),
  break: createMarkerIcon("#0891b2", "B"),
};

const fallbackMarkerIcon = createMarkerIcon(
  "#334155",
  "S",
);

function normalizeMarkerType(type: string) {
  return type
    .trim()
    .toLowerCase()
    .replaceAll("-", "_")
    .replaceAll(" ", "_");
}

function formatDuration(hours: number) {
  if (!Number.isFinite(hours)) {
    return "N/A";
  }

  if (hours < 1) {
    return `${Math.round(hours * 60)} minutes`;
  }

  if (hours === 1) {
    return "1 hour";
  }

  return `${hours} hours`;
}

function FitRoute({ positions }: FitRouteProps) {
  const map = useMap();

  useEffect(() => {
    if (positions.length === 0) {
      return;
    }

    const fitMap = () => {
      map.invalidateSize();

      if (positions.length > 1) {
        map.fitBounds(L.latLngBounds(positions), {
          padding: [48, 48],
          maxZoom: 10,
          animate: false,
        });
      } else {
        map.setView(positions[0], 10, {
          animate: false,
        });
      }

      map.invalidateSize();
    };

    const firstTimer = window.setTimeout(
      fitMap,
      250,
    );

    const secondTimer = window.setTimeout(
      () => map.invalidateSize(),
      900,
    );

    return () => {
      window.clearTimeout(firstTimer);
      window.clearTimeout(secondTimer);
    };
  }, [map, positions]);

  return null;
}

export default function TripMap({
  data,
}: TripMapProps) {
  const routePositions = useMemo<
    [number, number][]
  >(() => {
    const coordinates =
      data.route?.geometry?.coordinates ?? [];

    return coordinates
      .filter(
        (
          coordinate,
        ): coordinate is [number, number] =>
          Array.isArray(coordinate) &&
          coordinate.length >= 2 &&
          Number.isFinite(coordinate[0]) &&
          Number.isFinite(coordinate[1]),
      )
      .map(([longitude, latitude]) => [
        latitude,
        longitude,
      ]);
  }, [data.route?.geometry?.coordinates]);

  const validMarkers = useMemo(
    () =>
      data.stop_markers.filter((marker) => {
        const latitude = Number(marker.latitude);
        const longitude = Number(marker.longitude);

        return (
          Number.isFinite(latitude) &&
          Number.isFinite(longitude)
        );
      }),
    [data.stop_markers],
  );

  const fuelStops =
    data.schedule?.summary?.fuel_stops ?? 0;

  const restStops =
    data.schedule?.summary?.rest_periods ?? 0;

  if (routePositions.length === 0) {
    return (
      <section className="panel route-panel">
        <div className="section-heading">
          <div>
            <p className="section-kicker">
              Route visualization
            </p>

            <h2>Interactive Trip Map</h2>

            <p>
              The route map could not be displayed
              because valid geometry was not returned.
            </p>
          </div>
        </div>

        <div className="map-empty-state">
          <span aria-hidden="true">MAP</span>

          <strong>Route map unavailable</strong>

          <p>
            Please generate the trip again or verify
            the entered locations.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="panel route-panel">
      <div className="section-heading">
        <div>
          <p className="section-kicker">
            Route visualization
          </p>

          <h2>Interactive Trip Map</h2>

          <p>
            View the calculated route together with
            pickup, drop-off, fuel, break and rest
            locations.
          </p>
        </div>

        <span className="event-count">
          {validMarkers.length}{" "}
          {validMarkers.length === 1
            ? "marker"
            : "markers"}
        </span>
      </div>

      <div className="map-stats">
        <article>
          <span>Total Distance</span>
          <strong>
            {data.route.distance_miles} mi
          </strong>
        </article>

        <article>
          <span>Driving Time</span>
          <strong>
            {data.route.duration_hours} hrs
          </strong>
        </article>

        <article>
          <span>Fuel Stops</span>
          <strong>{fuelStops}</strong>
        </article>

        <article>
          <span>Rest Periods</span>
          <strong>{restStops}</strong>
        </article>
      </div>

      <div className="map-container">
        <MapContainer
          center={routePositions[0]}
          zoom={6}
          className="map"
          scrollWheelZoom
          preferCanvas
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />

          <Polyline
            positions={routePositions}
            pathOptions={{
              color: "#0f766e",
              weight: 6,
              opacity: 0.95,
              lineCap: "round",
              lineJoin: "round",
            }}
          />

          <FitRoute positions={routePositions} />

          {validMarkers.map((marker) => {
            const latitude = Number(marker.latitude);
            const longitude = Number(
              marker.longitude,
            );

            const normalizedType =
              normalizeMarkerType(marker.type);

            const markerIcon =
              markerIcons[
                normalizedType as MarkerType
              ] ?? fallbackMarkerIcon;

            return (
              <Marker
                key={`${marker.sequence}-${marker.type}-${latitude}-${longitude}`}
                position={[latitude, longitude]}
                icon={markerIcon}
              >
                <Popup>
                  <div className="map-popup">
                    <span
                      className={`map-popup-type map-popup-${normalizedType}`}
                    >
                      {marker.type
                        .replaceAll("_", " ")
                        .replace(/\b\w/g, (letter) =>
                          letter.toUpperCase(),
                        )}
                    </span>

                    <h3>{marker.title}</h3>

                    <p>
                      {marker.description}
                    </p>

                    <div className="map-popup-details">
                      <span>
                        <small>Day</small>
                        <strong>
                          {marker.day_number}
                        </strong>
                      </span>

                      <span>
                        <small>Mile</small>
                        <strong>
                          {marker.mile_marker}
                        </strong>
                      </span>

                      <span>
                        <small>Duration</small>
                        <strong>
                          {formatDuration(
                            Number(
                              marker.duration_hours,
                            ),
                          )}
                        </strong>
                      </span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      <div
        className="map-legend"
        aria-label="Map marker legend"
      >
        <span>
          <i className="legend-current">A</i>
          Current
        </span>

        <span>
          <i className="legend-pickup">P</i>
          Pickup
        </span>

        <span>
          <i className="legend-dropoff">D</i>
          Drop-off
        </span>

        <span>
          <i className="legend-fuel">F</i>
          Fuel
        </span>

        <span>
          <i className="legend-rest">R</i>
          Rest
        </span>

        <span>
          <i className="legend-break">B</i>
          Break
        </span>
      </div>
    </section>
  );
}