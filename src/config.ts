// Central runtime configuration. All services must import API_URL from here
// (never read process.env / import.meta.env directly elsewhere).
export const API_URL: string =
  import.meta.env.VITE_API_URL ?? "http://localhost:8000";
