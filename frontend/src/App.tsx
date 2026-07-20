import {
  useEffect,
  useRef,
  useState,
} from "react";

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

const loadingSteps = [
  "Validating trip locations",
  "Calculating the driving route",
  "Applying Hours-of-Service rules",
  "Generating daily ELD logs",
];

const summaryCards = [
  {
    key: "distance",
    label: "Total Distance",
    icon: "↔",
  },
  {
    key: "driving",
    label: "Driving Time",
    icon: "◷",
  },
  {
    key: "elapsed",
    label: "Elapsed Time",
    icon: "⌛",
  },
  {
    key: "fuel",
    label: "Fuel Stops",
    icon: "⛽",
  },
  {
    key: "rest",
    label: "Rest Periods",
    icon: "☾",
  },
  {
    key: "logs",
    label: "ELD Log Days",
    icon: "▤",
  },
] as const;

function formatEventTitle(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
}

function getEventIcon(eventType: string) {
  const normalized = eventType.toLowerCase();

  if (normalized.includes("pickup")) return "P";
  if (normalized.includes("drop")) return "D";
  if (normalized.includes("fuel")) return "F";
  if (normalized.includes("rest")) return "R";
  if (normalized.includes("break")) return "B";
  if (normalized.includes("drive")) return "→";

  return "•";
}

function App() {
  const [form, setForm] =
    useState<TripRequest>(initialForm);

  const [tripData, setTripData] =
    useState<TripPlanData | null>(null);

  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] =
    useState("");

  const resultsRef =
    useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!loading) {
      setLoadingStep(0);
      return;
    }

    const interval = window.setInterval(() => {
      setLoadingStep((currentStep) =>
        currentStep < loadingSteps.length - 1
          ? currentStep + 1
          : currentStep,
      );
    }, 5000);

    return () => {
      window.clearInterval(interval);
    };
  }, [loading]);

  useEffect(() => {
    if (!tripData || !resultsRef.current) {
      return;
    }

    const timer = window.setTimeout(() => {
      resultsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 250);

    return () => {
      window.clearTimeout(timer);
    };
  }, [tripData]);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]:
        name === "current_cycle_used"
          ? Number(value)
          : value,
    }));

    if (error) {
      setError("");
    }

    if (successMessage) {
      setSuccessMessage("");
    }
  };

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const currentLocation =
      form.current_location.trim();
    const pickupLocation =
      form.pickup_location.trim();
    const dropoffLocation =
      form.dropoff_location.trim();

    if (
      !currentLocation ||
      !pickupLocation ||
      !dropoffLocation
    ) {
      setError(
        "Please enter the current, pickup and drop-off locations.",
      );
      return;
    }

    if (
      form.current_cycle_used < 0 ||
      form.current_cycle_used > 70
    ) {
      setError(
        "Current cycle used must be between 0 and 70 hours.",
      );
      return;
    }

    setLoading(true);
    setLoadingStep(0);
    setError("");
    setSuccessMessage("");
    setTripData(null);

    try {
      const response = await planTrip({
        ...form,
        current_location: currentLocation,
        pickup_location: pickupLocation,
        dropoff_location: dropoffLocation,
      });

      if (!response?.data) {
        throw new Error(
          "The server returned an incomplete trip plan.",
        );
      }

      setTripData(response.data);
      setSuccessMessage(
        "Trip plan generated successfully.",
      );
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Unable to generate the trip plan.";

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const getSummaryValue = (
    key: (typeof summaryCards)[number]["key"],
  ) => {
    if (!tripData) {
      return "";
    }

    switch (key) {
      case "distance":
        return `${tripData.route.distance_miles} mi`;

      case "driving":
        return `${tripData.route.duration_hours} hrs`;

      case "elapsed":
        return `${tripData.schedule.summary.total_trip_elapsed_hours} hrs`;

      case "fuel":
        return String(
          tripData.schedule.summary.fuel_stops,
        );

      case "rest":
        return String(
          tripData.schedule.summary.rest_periods,
        );

      case "logs":
        return String(tripData.daily_logs.length);

      default:
        return "";
    }
  };

  return (
    <main className="app-shell">
      <header className="hero">
        <div className="hero-content">
          <div className="hero-copy">
            <p className="eyebrow">
              FMCSA Hours-of-Service Planning
            </p>

            <h1>ELD Trip Planner</h1>

            <p className="hero-description">
              Generate a compliant driving route with
              required breaks, rest periods, fuel stops
              and daily electronic driver logs.
            </p>

            <div className="hero-badges">
              <span>70 hrs / 8 days</span>
              <span>11-hour driving limit</span>
              <span>Daily ELD logs</span>
            </div>
          </div>

          <div
            className="hero-visual"
            aria-hidden="true"
          >
            <div className="hero-visual-icon">
              ELD
            </div>

            <div>
              <strong>Compliant Trip Planning</strong>
              <span>
                Route, schedule and driver logs
              </span>
            </div>
          </div>
        </div>
      </header>

      <section
        className="panel trip-planner-panel"
        aria-labelledby="trip-form-title"
      >
        <div className="section-heading">
          <div>
            <p className="section-kicker">
              Trip details
            </p>

            <h2 id="trip-form-title">
              Plan Your Trip
            </h2>

            <p>
              Enter the route details and the
              driver's currently used cycle hours.
            </p>
          </div>

          <span className="required-note">
            All fields are required
          </span>
        </div>

        <form
          className="trip-form"
          onSubmit={handleSubmit}
          noValidate
        >
          <label className="form-field">
            <span className="field-label">
              <span
                className="field-icon"
                aria-hidden="true"
              >
                A
              </span>
              Current Location
            </span>

            <input
              required
              type="text"
              name="current_location"
              autoComplete="off"
              value={form.current_location}
              onChange={handleChange}
              placeholder="New York, New York"
              disabled={loading}
            />
          </label>

          <label className="form-field">
            <span className="field-label">
              <span
                className="field-icon"
                aria-hidden="true"
              >
                P
              </span>
              Pickup Location
            </span>

            <input
              required
              type="text"
              name="pickup_location"
              autoComplete="off"
              value={form.pickup_location}
              onChange={handleChange}
              placeholder="Chicago, Illinois"
              disabled={loading}
            />
          </label>

          <label className="form-field">
            <span className="field-label">
              <span
                className="field-icon"
                aria-hidden="true"
              >
                D
              </span>
              Drop-off Location
            </span>

            <input
              required
              type="text"
              name="dropoff_location"
              autoComplete="off"
              value={form.dropoff_location}
              onChange={handleChange}
              placeholder="Los Angeles, California"
              disabled={loading}
            />
          </label>

          <label className="form-field">
            <span className="field-label">
              <span
                className="field-icon"
                aria-hidden="true"
              >
                H
              </span>
              Current Cycle Used
            </span>

            <div className="number-input-wrapper">
              <input
                required
                type="number"
                name="current_cycle_used"
                min={0}
                max={70}
                step={0.5}
                value={form.current_cycle_used}
                onChange={handleChange}
                disabled={loading}
                aria-describedby="cycle-help"
              />

              <span className="input-suffix">
                hours
              </span>
            </div>

            <small
              id="cycle-help"
              className="field-help"
            >
              Enter a value between 0 and 70.
            </small>
          </label>

          <button
            className="generate-button"
            type="submit"
            disabled={loading}
          >
            {loading ? (
              <>
                <span
                  className="button-spinner"
                  aria-hidden="true"
                />
                Generating Trip Plan
              </>
            ) : (
              <>
                <span aria-hidden="true">
                  →
                </span>
                Generate ELD Trip Plan
              </>
            )}
          </button>
        </form>

        {loading && (
          <div
            className="loading-panel"
            role="status"
            aria-live="polite"
          >
            <div className="loading-heading">
              <span
                className="loading-spinner"
                aria-hidden="true"
              />

              <div>
                <strong>
                  Planning your compliant trip
                </strong>

                <span>
                  {loadingSteps[loadingStep]}...
                </span>
              </div>
            </div>

            <div
              className="loading-progress"
              aria-hidden="true"
            >
              <span
                style={{
                  width: `${
                    ((loadingStep + 1) /
                      loadingSteps.length) *
                    100
                  }%`,
                }}
              />
            </div>

            <div className="loading-steps">
              {loadingSteps.map((step, index) => (
                <div
                  className={`loading-step ${
                    index < loadingStep
                      ? "is-complete"
                      : index === loadingStep
                        ? "is-active"
                        : ""
                  }`}
                  key={step}
                >
                  <span>
                    {index < loadingStep
                      ? "✓"
                      : index + 1}
                  </span>

                  <p>{step}</p>
                </div>
              ))}
            </div>

            <small>
              The first request may take up to 60
              seconds while the hosted server starts.
            </small>
          </div>
        )}

        {error && (
          <div
            className="alert-message error-message"
            role="alert"
          >
            <span
              className="alert-icon"
              aria-hidden="true"
            >
              !
            </span>

            <div>
              <strong>
                Unable to generate the trip
              </strong>

              <p>{error}</p>
            </div>
          </div>
        )}

        {successMessage && !loading && (
          <div
            className="alert-message success-message"
            role="status"
            aria-live="polite"
          >
            <span
              className="alert-icon"
              aria-hidden="true"
            >
              ✓
            </span>

            <div>
              <strong>{successMessage}</strong>

              <p>
                Review the route, schedule and ELD
                sheets below.
              </p>
            </div>
          </div>
        )}
      </section>

      {!tripData && !loading && (
        <section className="empty-state">
          <div
            className="empty-state-icon"
            aria-hidden="true"
          >
            ELD
          </div>

          <h2>Ready to plan your route?</h2>

          <p>
            Enter the trip details above to generate a
            route, compliant stop schedule and daily
            driver log sheets.
          </p>

          <div className="empty-state-features">
            <span>Route map</span>
            <span>HOS schedule</span>
            <span>ELD sheets</span>
          </div>
        </section>
      )}

      {tripData && (
        <div
          className="results-container"
          ref={resultsRef}
        >
          <section
            className="results-heading"
            aria-labelledby="results-title"
          >
            <div>
              <p className="section-kicker">
                Generated result
              </p>

              <h2 id="results-title">
                Trip Plan Overview
              </h2>

              <p>
                The route and schedule below apply the
                configured Hours-of-Service limits.
              </p>
            </div>

            <span className="compliance-badge">
              HOS Plan Generated
            </span>
          </section>

          <section
            className="summary-grid"
            aria-label="Trip summary"
          >
            {summaryCards.map((card) => (
              <article
                className={`summary-card summary-card-${card.key}`}
                key={card.key}
              >
                <div className="summary-card-header">
                  <span
                    className="summary-icon"
                    aria-hidden="true"
                  >
                    {card.icon}
                  </span>

                  <span>{card.label}</span>
                </div>

                <strong>
                  {getSummaryValue(card.key)}
                </strong>
              </article>
            ))}
          </section>

          <TripMap data={tripData} />

          <section className="panel schedule-panel">
            <div className="section-heading">
              <div>
                <p className="section-kicker">
                  Driver activity
                </p>

                <h2>Trip Schedule</h2>

                <p>
                  Sequential driving, pickup, fuel,
                  break and rest events.
                </p>
              </div>

              <span className="event-count">
                {tripData.schedule.events.length} events
              </span>
            </div>

            <div className="timeline">
              {tripData.schedule.events.map(
                (scheduleEvent) => {
                  const eventClass =
                    scheduleEvent.event_type
                      .toLowerCase()
                      .replaceAll("_", "-");

                  return (
                    <article
                      className={`timeline-item timeline-${eventClass}`}
                      key={scheduleEvent.sequence}
                    >
                      <div className="timeline-rail">
                        <div className="timeline-number">
                          {getEventIcon(
                            scheduleEvent.event_type,
                          )}
                        </div>
                      </div>

                      <div className="timeline-content">
                        <div className="timeline-header">
                          <div>
                            <span className="timeline-sequence">
                              Stop{" "}
                              {scheduleEvent.sequence}
                            </span>

                            <h3>
                              {formatEventTitle(
                                scheduleEvent.event_type,
                              )}
                            </h3>
                          </div>

                          <span className="timeline-duration">
                            {
                              scheduleEvent.duration_hours
                            }
                            h
                          </span>
                        </div>

                        <p>
                          {scheduleEvent.description}
                        </p>

                        <div className="timeline-meta">
                          <span>
                            Day{" "}
                            {scheduleEvent.day_number}
                          </span>

                          <span>
                            Mile{" "}
                            {scheduleEvent.end_mile}
                          </span>
                        </div>
                      </div>
                    </article>
                  );
                },
              )}
            </div>
          </section>

          <section className="panel eld-section">
            <div className="section-heading">
              <div>
                <p className="section-kicker">
                  Driver records
                </p>

                <h2>Daily ELD Logs</h2>

                <p>
                  Graphical duty-status logs generated
                  for each day of the trip.
                </p>
              </div>

              <span className="event-count">
                {tripData.daily_logs.length}{" "}
                {tripData.daily_logs.length === 1
                  ? "day"
                  : "days"}
              </span>
            </div>

            <div className="eld-list">
              {tripData.daily_logs.map((log) => (
                <ELDLog
                  key={log.day_number}
                  log={log}
                />
              ))}
            </div>
          </section>
        </div>
      )}

      <footer className="app-footer">
        <p>
          ELD Trip Planner · FMCSA
          Hours-of-Service route planning
        </p>
      </footer>
    </main>
  );
}

export default App;