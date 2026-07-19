import {
  MapContainer,
  Marker,
  Popup,
  Polyline,
  TileLayer,
  useMap,
} from "react-leaflet";
import { useEffect } from "react";
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
  iconAnchor: [12, 41],
});

function FitRoute({
  positions,
}: {
  positions: [number, number][];
}) {
  const map = useMap();

  useEffect(() => {
    if (positions.length > 1) {
      map.fitBounds(positions, {
        padding: [30, 30],
      });
    }
  }, [map, positions]);

  return null;
}

export default function TripMap({
  data,
}: TripMapProps) {
  const routePositions: [number, number][] =
    data.route.geometry.coordinates.map(
      ([longitude, latitude]) => [
        latitude,
        longitude,
      ],
    );

  return (
    <section className="panel">
      <h2>Trip Route</h2>

      <div className="map-container">
        <MapContainer
          center={routePositions[0]}
          zoom={6}
          className="map"
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <Polyline
            positions={routePositions}
            pathOptions={{
              weight: 5,
            }}
          />

          <FitRoute positions={routePositions} />

          {data.stop_markers.map((marker) => (
            <Marker
              key={`${marker.sequence}-${marker.type}`}
              position={[
                marker.latitude,
                marker.longitude,
              ]}
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
          ))}
        </MapContainer>
      </div>
    </section>
  );
}