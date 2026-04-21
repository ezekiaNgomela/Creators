const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:18000/api").replace(/\/$/, "");

export type HealthResponse = {
  service: string;
  status: string;
  checks: {
    postgres: string;
    redis: string;
    minio: string;
  };
  timestamp: string;
};

export async function fetchHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE_URL}/health`);
  if (!response.ok) {
    throw new Error("Unable to reach backend");
  }
  return response.json() as Promise<HealthResponse>;
}
