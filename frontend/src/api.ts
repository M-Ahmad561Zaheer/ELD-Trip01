
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000";

export async function planTrip(payload: unknown) {
  const response = await fetch(
    `${API_BASE_URL}/api/trips/plan/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error ||
      data?.message ||
      "Failed to generate trip plan."
    );
  }

  return data;
}