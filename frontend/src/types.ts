export interface TripRequest {
  current_location: string;
  pickup_location: string;
  dropoff_location: string;
  current_cycle_used: number;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface LocationResult extends Coordinates {
  query: string;
  display_name: string;
}

export interface RouteGeometry {
  type: "LineString";
  coordinates: [number, number][];
}

export interface RouteLeg {
  leg_number: number;
  distance_meters: number;
  distance_miles: number;
  duration_seconds: number;
  duration_hours: number;
  summary: string;
}

export interface RouteResult {
  distance_meters: number;
  distance_miles: number;
  duration_seconds: number;
  duration_hours: number;
  geometry: RouteGeometry;
  legs: RouteLeg[];
}

export interface StopMarker {
  sequence: number;
  type: string;
  title: string;
  description: string;
  day_number: number;
  start_hour: number;
  duration_hours: number;
  mile_marker: number;
  latitude: number;
  longitude: number;
}

export interface ScheduleSummary {
  route_distance_miles: number;
  route_driving_hours: number;
  total_trip_elapsed_hours: number;
  final_cycle_used_hours: number;
  total_events: number;
  driving_events: number;
  breaks: number;
  rest_periods: number;
  cycle_restarts: number;
  fuel_stops: number;
  pickup_stops: number;
  dropoff_stops: number;
}

export interface ScheduleEvent {
  sequence: number;
  day_number: number;
  event_type: string;
  duty_status: string;
  description: string;
  start_hour: number;
  end_hour: number;
  duration_hours: number;
  start_mile: number;
  end_mile: number;
  cycle_used_after_event: number;
  location?: {
    latitude: number;
    longitude: number;
    mile_marker: number;
  };
}

export interface DailyLogSegment {
  sequence: number;
  event_type: string;
  duty_status: string;
  description: string;
  start_hour: number;
  end_hour: number;
  duration_hours: number;
  mile_marker: number;
}

export interface DailyLogTotals {
  off_duty: number;
  sleeper_berth: number;
  driving: number;
  on_duty_not_driving: number;
}

export interface DailyLog {
  day_number: number;
  start_elapsed_hour: number;
  end_elapsed_hour: number;

  segments: DailyLogSegment[];

  totals: DailyLogTotals;

  remarks: {
    time: string;
    event_type: string;
    description: string;
    mile_marker: number;
  }[];
}

export interface TripPlanData {
  locations: {
    current: LocationResult;
    pickup: LocationResult;
    dropoff: LocationResult;
  };
  route: RouteResult;
  schedule: {
    summary: ScheduleSummary;
    events: ScheduleEvent[];
  };
  stop_markers: StopMarker[];
  daily_logs: DailyLog[];
  hos: Record<string, number>;
}

export interface TripPlanResponse {
  success: boolean;
  message: string;
  data: TripPlanData;
}