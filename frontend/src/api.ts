import type {
  TripPlanResponse,
  TripRequest,
} from "./types";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000"
).replace(/\/+$/, "");

async function parseResponse(
  response: Response,
): Promise<unknown> {
  const contentType =
    response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();

  return {
    message:
      text ||
      "The server returned an unexpected response.",
  };
}

export async function planTrip(
  payload: TripRequest,
): Promise<TripPlanResponse> {
  let response: Response;

  try {
    response = await fetch(
      `${API_BASE_URL}/api/trips/plan/`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
    );
  } catch {
    throw new Error(
      "Unable to connect to the trip planning server. Please check your internet connection and try again.",
    );
  }

  const result = await parseResponse(response);

  if (!response.ok) {
    const errorData = result as {
      error?: string;
      message?: string;
      detail?: string;
    };

    throw new Error(
      errorData.error ||
        errorData.message ||
        errorData.detail ||
        `Failed to generate trip plan. Server returned ${response.status}.`,
    );
  }

  const data = result as TripPlanResponse;

  if (!data.success || !data.data) {
    throw new Error(
      data.message ||
        "The server returned an incomplete trip plan.",
    );
  }

  return data;
}