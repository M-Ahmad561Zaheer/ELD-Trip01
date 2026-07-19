import { useState } from "react";
import axios from "axios";

import ELDLog from "./ELDLog";
import TripMap from "./TripMap";
import { planTrip } from "./api";
import type {
  TripPlanData,
  TripRequest,
} from "./types";

import "./App.css";

const initialForm: TripRequest = {
  current_location: "",
  pickup_location: "",
  dropoff_location: "",
  current_cycle_used: 0,
};

function App() {
  const [form, setForm] =
    useState<TripRequest>(initialForm);

  const [tripData, setTripData] =
    useState<TripPlanData | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]:
        name === "current_cycle_used"
          ? Number(value)
          : value,
    }));
  };

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setLoading(true);
    setError("");
    setTripData(null);

    try {
      const response = await planTrip(form);
      setTripData(response.data);
    } catch (requestError) {
      if (axios.isAxiosError(requestError)) {
        const responseData = requestError.response?.data;

        setError(
          responseData?.message ??
            JSON.stringify(responseData) ??
            "Unable to generate trip plan.",
        );
      } else {
        setError("Unexpected application error.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">
            FMCSA Hours of Service
          </p>
          <h1>ELD Trip Planner</h1>
          <p>
            Plan compliant driving routes, rest stops,
            fuel stops and daily driver logs.
          </p>
        </div>
      </header>

      <section className="panel">
        <h2>Plan a Trip</h2>

        <form
          className="trip-form"
          onSubmit={handleSubmit}
        >
          <label>
            Current Location
            <input
              required
              name="current_location"
              value={form.current_location}
              onChange={handleChange}
              placeholder="New York, New York"
            />
          </label>

          <label>
            Pickup Location
            <input
              required
              name="pickup_location"
              value={form.pickup_location}
              onChange={handleChange}
              placeholder="Chicago, Illinois"
            />
          </label>

          <label>
            Dropoff Location
            <input
              required
              name="dropoff_location"
              value={form.dropoff_location}
              onChange={handleChange}
              placeholder="Los Angeles, California"
            />
          </label>

          <label>
            Current Cycle Used
            <input
              required
              type="number"
              name="current_cycle_used"
              min={0}
              max={70}
              step={0.5}
              value={form.current_cycle_used}
              onChange={handleChange}
            />
          </label>

          <button
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Generating trip..."
              : "Generate Trip Plan"}
          </button>
        </form>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
      </section>

      {tripData && (
        <>
          <section className="summary-grid">
            <article className="summary-card">
              <span>Total Distance</span>
              <strong>
                {tripData.route.distance_miles} miles
              </strong>
            </article>

            <article className="summary-card">
              <span>Driving Time</span>
              <strong>
                {tripData.route.duration_hours} hours
              </strong>
            </article>

            <article className="summary-card">
              <span>Total Elapsed Time</span>
              <strong>
                {
                  tripData.schedule.summary
                    .total_trip_elapsed_hours
                }{" "}
                hours
              </strong>
            </article>

            <article className="summary-card">
              <span>Fuel Stops</span>
              <strong>
                {
                  tripData.schedule.summary
                    .fuel_stops
                }
              </strong>
            </article>

            <article className="summary-card">
              <span>Rest Periods</span>
              <strong>
                {
                  tripData.schedule.summary
                    .rest_periods
                }
              </strong>
            </article>

            <article className="summary-card">
              <span>ELD Log Days</span>
              <strong>
                {tripData.daily_logs.length}
              </strong>
            </article>
          </section>

          <TripMap data={tripData} />

          <section className="panel">
            <h2>Trip Schedule</h2>

            <div className="timeline">
              {tripData.schedule.events.map(
                (scheduleEvent) => (
                  <article
                    className="timeline-item"
                    key={scheduleEvent.sequence}
                  >
                    <div className="timeline-number">
                      {scheduleEvent.sequence}
                    </div>

                    <div>
                      <h3>
                        {scheduleEvent.event_type
                          .replaceAll("_", " ")
                          .replace(/\b\w/g, (letter) =>
                            letter.toUpperCase(),
                          )}
                      </h3>

                      <p>
                        {scheduleEvent.description}
                      </p>

                      <small>
                        Day {scheduleEvent.day_number} ·{" "}
                        {scheduleEvent.duration_hours}h ·
                        Mile {scheduleEvent.end_mile}
                      </small>
                    </div>
                  </article>
                ),
              )}
            </div>
          </section>

          <section className="panel">
            <h2>Daily ELD Logs</h2>

            <div className="eld-list">
              {tripData.daily_logs.map((log) => (
                <ELDLog
                  key={log.day_number}
                  log={log}
                />
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}

export default App;