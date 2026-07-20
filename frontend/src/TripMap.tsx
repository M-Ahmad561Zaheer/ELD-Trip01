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

const markerIcon = L.icon({
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  shadowSize: [41, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowAnchor: [12, 41],
});

interface FitRouteProps {
  positions: [number, number][];
}

function FitRoute({ positions }: FitRouteProps) {
  const map = useMap();

  useEffect(() => {
    if (positions.length === 0) {
      return;
    }

    const resizeTimer = window.setTimeout(() => {
      map.invalidateSize();

      if (positions.length > 1) {
        map.fitBounds(L.latLngBounds(positions), {
          padding: [40, 40],
          maxZoom: 10,
          animate: false,
        });
      } else {
        map.setView(positions[0], 10, {
          animate: false,
        });
      }

      map.invalidateSize();
    }, 300);

    const secondResizeTimer = window.setTimeout(() => {
      map.invalidateSize();
    }, 900);

    return () => {
      window.clearTimeout(resizeTimer);
      window.clearTimeout(secondResizeTimer);
    };
  }, [map, positions]);

  return null;
}

export default function TripMap({ data }: TripMapProps) {
  const routePositions = useMemo<[number, number][]>(() => {
    const coordinates =
      data.route?.geometry?.coordinates ?? [];

    return coordinates
      .filter(
        (coordinate): coordinate is [number, number] =>
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

  if (routePositions.length === 0) {
    return (
      <section className="panel">
        <h2>Trip Route</h2>

        <div className="map-empty-state">
          Route map data is currently unavailable.
        </div>
      </section>
    );
  }

  return (
    <section className="panel">
      <h2>Trip Route</h2>

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
              weight: 5,
              opacity: 0.9,
              lineCap: "round",
              lineJoin: "round",
            }}
          />

          <FitRoute positions={routePositions} />

          {data.stop_markers.map((marker) => {
            const latitude = Number(marker.latitude);
            const longitude = Number(marker.longitude);

            if (
              !Number.isFinite(latitude) ||
              !Number.isFinite(longitude)
            ) {
              return null;
            }

            return (
              <Marker
                key={`${marker.sequence}-${marker.type}`}
                position={[latitude, longitude]}
                icon={markerIcon}
              >
                <Popup>
                  <strong>{marker.title}</strong>

                  <p>{marker.description}</p>

                  <p>
                    Day {marker.day_number} · Mile{" "}
                    {marker.mile_marker}
                  </p>

                  <p>
                    Duration: {marker.duration_hours} hours
                  </p>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </section>
  );
}