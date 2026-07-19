import axios from "axios";
import type {
  TripPlanResponse,
  TripRequest,
} from "./types";

const api = axios.create({
  baseURL:
    import.meta.env.VITE_API_BASE_URL ??
    "http://127.0.0.1:8000/api",
  timeout: 60000,
  headers: {
    "Content-Type": "application/json",
  },
});

export async function planTrip(
  payload: TripRequest,
): Promise<TripPlanResponse> {
  const response = await api.post<TripPlanResponse>(
    "/trips/plan/",
    payload,
  );

  return response.data;
}